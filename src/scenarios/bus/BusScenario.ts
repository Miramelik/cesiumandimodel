import  {
  Viewer,
  GeoJsonDataSource,
  Cesium3DTileset,
  Color,
  Cesium3DTileStyle,  
 } from "cesium";
 import * as turf from "@turf/turf";
import type { LoadedLayer } from "../ScenarioManager";

// --------- Types for stats exposed to React ---------
export interface BusStats {
  total: number;
  inside: number;
  outside: number;
  coveragePercent: number;
}

// Building classification (inside/outside buffer)
const buildingsInside = new Set<string>();
const buildingsOutside = new Set<string>();
const allBuildingIds = new Set<string>();


// GLOBAL STATE FOR THIS SCENARIO
let busStopsJson: any = null;
let bufferDataSource: GeoJsonDataSource | null = null;
let buildingsTileset: Cesium3DTileset | null = null;
let lastBufferedPolygon: any = null;
let busViewer: Viewer | null = null;
let currentBufferRadius: number = 400; //default 400m
let bufferUnionPolygon: any = null;

// NEW: Track if buffer has been created
let bufferCreated: boolean = false;

let tileVisibleCallback: ((title: any) => void) | null = null;

let onBufferUpdatedCallback: ((datasource:GeoJsonDataSource, radius:number) => void) | null = null;

let currentStats: BusStats = {
  total: 0,
  inside: 0,
  outside: 0,
  coveragePercent: 0,
};

//Throttle mechanism for stats updates
let statsUpdateTimeout = false;
let lastStatsUpdate = 0;
const STATS_UPDATE_INTERVAL = 1000; // only update stats once per second

// --------------------------------------------------
//  PUBLIC API
//  - initBusScenario(viewer)  -> loads data + first buffer
//  - updateBusBufferRadius(r) -> called by React slider
//  - getBusStats()            -> used by React stats panel
//  - cleanupBusScenario()     -> cleanup when switching scenarios
//  - setOnBufferUpdated()     -> set callback for buffer updates
//  - getCurrentBufferRadius() -> get current radius
//  - createBusBufferIfNeeded() -> NEW: create buffer when layer is toggled on
// --------------------------------------------------

export function setOnBufferUpdated (callback: (datasource:GeoJsonDataSource, radius:number) => void) {
  onBufferUpdatedCallback = callback;
}

export function getCurrentBufferRadius(): number {
  return currentBufferRadius;
}

export function getBufferDataSource(): GeoJsonDataSource | null {
  return bufferDataSource;
}


export async function initBusScenario(viewer: Viewer): Promise<LoadedLayer[]> {
  console.log("[BusScenario] initBusScenario() start");
  busViewer = viewer;

  //Reset state
  buildingsInside.clear();
  buildingsOutside.clear();
  allBuildingIds.clear();
  bufferCreated = false;

  if (bufferDataSource) {
    try {
      viewer.dataSources.remove(bufferDataSource);
    } catch {}
    bufferDataSource = null;
  }
    
  buildingsTileset = null;
  tileVisibleCallback = null;
  bufferDataSource = null;
  
  const loaded: LoadedLayer[] = [];
  
   try {
    console.log("[BusScenario] Loading building tileset (Ion asset)...");
    
      // -----------------------------------------------
      // 1) Load 3D BUILDINGS (Cesium Ion asset) - HIDDEN BY DEFAULT
      // -----------------------------------------------
      buildingsTileset = await Cesium3DTileset.fromIonAssetId(4138907);
      buildingsTileset.show = false; // HIDE BY DEFAULT
      viewer.scene.primitives.add(buildingsTileset);
    
      await (buildingsTileset as any).readyPromise;
      console.log("[BusScenario] Buildings tileset ready");
      loaded.push({
        id: 4138907,
        name: "3D Buildings",
        type: "3DTILES",
        tileset: buildingsTileset,
        visible: false, // CHANGED FROM true TO false
      });

      // Set up tile visible listener for classification
      tileVisibleCallback = (tile : any) => {
        const content = tile.content;
        const len = content.featuresLength ?? 0;
        for (let i = 0; i < len; i++) {
          const f = content.getFeature(i);
          try {
            const gmlId = f.getProperty("gml:id");
            if (gmlId) {
              allBuildingIds.add(String(gmlId));

              // Only classify if buffer exists
              if (bufferUnionPolygon && bufferCreated) {
                const lat = f.getProperty("Latitude");
                const lon = f.getProperty("Longitude");

                if (lat != null && lon != null) {
                  const halfSize = 0.00018;
                  let inside = false;

                  try {
                    const buildingBbox = turf.bboxPolygon([
                      lon - halfSize, lat - halfSize,
                      lon + halfSize, lat + halfSize,
                    ]);
                    inside = turf.booleanIntersects(buildingBbox, bufferUnionPolygon);
                  } catch (e) {
                    // fallback: if booleanIntersects fails, set false and continue
                    try {
                      const point = turf.point([lon, lat]);
                      inside = turf.booleanPointInPolygon(point, bufferUnionPolygon);
                    } catch {}
                  }

                  f.setProperty("is_near_busstop", inside);

                  const gmlIdStr = String(gmlId);
                  if (inside) {
                    buildingsInside.add(gmlIdStr);
                    buildingsOutside.delete(gmlIdStr);
                  } else {
                    buildingsOutside.add(gmlIdStr);
                    buildingsInside.delete(gmlIdStr);
                  }
                }
              } else {
                // No buffer yet - keep buildings white (neutral)
                f.setProperty("is_near_busstop", undefined);
              }
            }
          } catch  {}
        }
        //Throttle stats updates
        scheduleStatsUpdate();
      };

      // Track all visible buildings and collect IDs
      buildingsTileset.tileVisible.addEventListener(tileVisibleCallback);
  } catch (e) {
    console.error("[BusScenario] Failed to load buildings tileset:", e);
    buildingsTileset = null;
  }

  try {
    
      // -----------------------------------------------
      // 2) Load BUS STOP GEOJSON (points) - HIDDEN BY DEFAULT
      // -----------------------------------------------
      console.log("[BusScenario] Loading busstops.geojson...");
      const busStopsData = await GeoJsonDataSource.load("/busstops.geojson", {
        markerSize: 18,
        markerColor: Color.RED,
        clampToGround: true,
      });
      
      busStopsData.name = "Bus Stops";
      busStopsData.show = false; // HIDE BY DEFAULT
      viewer.dataSources.add(busStopsData);
      
      loaded.push({
        id: "bus_stops",
        name: "Bus Stops",
        type: "GEOJSON",
        datasource: busStopsData,
        visible: false, // CHANGED FROM true TO false
      });
        
      // Save raw JSON for Turf buffer creation
      busStopsJson = await fetch("/busstops.geojson").then((r) => r.json());
      console.log("[BusScenario] Bus stops loaded, features:", busStopsJson?.features?.length ?? 0);
  } catch (e) {
    console.error("[BusScenario] Failed to load busstops.geojson:", e);
  }

  // Apply neutral style (white) initially
  applyBuildingColorStyle();

  // DON'T create buffer on init - wait for user to toggle it on
  currentBufferRadius = 400; //reset to default
  
  // Add placeholder for buffer layer (not created yet)
  loaded.push({
    id: "bus_buffer",
    name: `Buffer (${currentBufferRadius}m)`,
    type: "GEOJSON",
    datasource: undefined, // Not created yet
    visible: false,
  });

  console.log("[BusScenario] initBusScenario() finished");
  return loaded;
}

// NEW: Function to create buffer when layer is toggled on
export async function createBusBufferIfNeeded() {
  if (!busViewer || !busStopsJson || bufferCreated) {
    return;
  }
  
  console.log("[BusScenario] Creating buffer for the first time...");
  await createBusBuffer(busViewer, currentBufferRadius);
  bufferCreated = true;
}

export function resetBuildingToNeutral(){
  if (!buildingsTileset || !busViewer) {
    console.warn("[BusScenario] resetBuildingToNeutral: tileset or viewer not ready");
    return;
  }

  console.log("[BusScenario] Resetting buildings to neutral (white)...");

  // Clear classification data
  buildingsInside.clear();
  buildingsOutside.clear();
  
  // IMPORTANT: Clear the buffer polygon so new tiles won't be classified
  bufferUnionPolygon = null;
  bufferCreated = false;

  // Method 1: Try to reset all feature properties
  const tiles = (buildingsTileset as any)._selectedTiles || [];
  tiles.forEach((tile: any)=>{
    if (tile.content && tile.content.featuresLength) {
      const content = tile.content;
      const len = content.featuresLength;

      for (let i=0; i<len;i++){
        const feature= content.getFeature(i);
        if (!feature) continue;

        // Reset property to undefined to show white
        feature.setProperty("is_near_busstop", undefined);
      }
    }
  });

  // Method 2: Traverse entire tile tree
  const root = (buildingsTileset as any)._root;
  if (root) {
    function resetTileFeatures(tile: any) {
      if (tile.content && tile.content.featuresLength) {
        const content = tile.content;
        for (let i = 0; i < content.featuresLength; i++) {
          const feature = content.getFeature(i);
          if (feature) {
            feature.setProperty("is_near_busstop", undefined);
          }
        }
      }
      // Recursively process children
      if (tile.children && tile.children.length > 0) {
        tile.children.forEach((child: any) => resetTileFeatures(child));
      }
    }
    resetTileFeatures(root);
  }

  // Method 3: FORCE STYLE REFRESH - This is the key!
  // Temporarily remove and reapply the style to force Cesium to re-evaluate
  const currentStyle = buildingsTileset.style;
  buildingsTileset.style = undefined;
  
  // Use setTimeout to ensure Cesium processes the style removal
  setTimeout(() => {
    if (buildingsTileset) {
      buildingsTileset.style = currentStyle;
      busViewer?.scene.requestRender();
    }
  }, 10);

  updateStats();
  busViewer.scene.requestRender();

  console.log("[BusScenario] Buildings reset to neutral color");
}


//clean up function
export function cleanupBusScenario(viewer: Viewer) {
  console.log("[BusScenario] cleanupBusScenario() called");

  if (bufferDataSource) {
    try {
      viewer.dataSources.remove(bufferDataSource);
    } catch (e){
      console.warn("[BusScenario] Error removing buffer datasource", e);
    }
    bufferDataSource = null;
  }

  //Remove tile visible listener
  if (tileVisibleCallback && buildingsTileset) {
    try {
      buildingsTileset.tileVisible.removeEventListener(tileVisibleCallback);
    } catch (e){
      console.warn("[BusScenario] Error removing tileVisible listener", e);
    }
    tileVisibleCallback = null;
  }

  //clear sets
  buildingsInside.clear();
  buildingsOutside.clear();
  allBuildingIds.clear();

  //clear references
  busStopsJson = null;
  buildingsTileset = null;
  lastBufferedPolygon = null;
  busViewer = null;
  onBufferUpdatedCallback = null;
  currentBufferRadius = 400;
  bufferUnionPolygon = null;
  bufferCreated = false;

  console.log ("[BusScenario] Cleanup complete");
}


// called from react slider
export async function updateBusBufferRadius(radiusMeters: number) {
  if (!busViewer)  {
    console.warn("[BusScenario] updateBusBufferRadius called but viewer not set");
    return;
  }
  console.log("[BusScenario] updateBusBufferRadius:", radiusMeters);
  currentBufferRadius = radiusMeters;
  await createBusBuffer(busViewer, radiusMeters);

  if (onBufferUpdatedCallback && bufferDataSource) {
    onBufferUpdatedCallback(bufferDataSource, radiusMeters);
  }
}

//Stats getter for React
export function getBusStats(): BusStats {
  return currentStats;
}

function scheduleStatsUpdate() {
  if (statsUpdateTimeout) return;

  const now = Date.now();
  if (now - lastStatsUpdate >= STATS_UPDATE_INTERVAL) {
    updateStats();
    lastStatsUpdate = now;
    return;
  }

  statsUpdateTimeout = true;

  setTimeout(() => {
    updateStats();
    statsUpdateTimeout = false;
    lastStatsUpdate = Date.now();
  }, STATS_UPDATE_INTERVAL - (now - lastStatsUpdate));
}

//
// =========================================================
//  BUFFER CREATION (Turf.js)
// =========================================================
//
export async function createBusBuffer(viewer: Viewer, radiusMeters: number) {
  if (!busStopsJson) {
    console.warn("[BusScenario] createBusBuffer: busStopsJson not set yet");
    return;
  }

  console.log("[BusScenario] createBusBuffer radiusMeters=", radiusMeters);

  // Remove old buffer if exists
  if (bufferDataSource) {
    try{
      viewer.dataSources.remove(bufferDataSource);
    } catch {}
    bufferDataSource = null;
  }


  // Radius in km
  const radiusKm = radiusMeters / 1000;
  let buffered: any;
  try {
    buffered = turf.buffer(busStopsJson, radiusKm, {units: "kilometers"});
  } catch (e) {
    console.error("[BusScenario] Turf buffer failed:", e);
    return; 
  }
  if (!buffered || !buffered.features || buffered.features.length === 0) {
    console.warn("[BusScenario] turf.buffer returned no polygon features");
    return;
  }
  lastBufferedPolygon = buffered;


  bufferUnionPolygon = null;

  try {
    const validFeatures = buffered.features.filter((f: any) => {
      if (!f || !f.geometry || !f.geometry.coordinates) return false;
      return f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon";
    });
    console.log(`[BusScenario] Valid buffer features: ${validFeatures.length}`);

    if (validFeatures.length > 0) {
      // Use turf.union to combine all polygons into one
      let unionPolygon = validFeatures[0];
      
      for (let i = 1; i < validFeatures.length; i++) {
        try {
          unionPolygon = turf.union(turf.featureCollection([unionPolygon, validFeatures[i]])) as any;
        } catch (unionError) {
          console.warn(`[BusScenario] Failed to union feature ${i}, skipping:`, unionError);
          continue;
        }
      }
      
      if (unionPolygon) {
        bufferUnionPolygon = unionPolygon;
        console.log(`[BusScenario] Successful union. Type: ${bufferUnionPolygon.geometry.type}`);
      } else {
        console.error("[BusScenario] Union failed to produce a valid feature.");
      }
    }
  } catch (e) {
    console.error("[BusScenario] Error creating union polygon (union failed):", e);
  }


  try {
    // Load into Cesium as polygons
    bufferDataSource = await GeoJsonDataSource.load(buffered as any, {
      fill: Color.YELLOW.withAlpha(0.25),
      stroke: Color.YELLOW,
      strokeWidth: 2,
      clampToGround: true,
    });
    
    bufferDataSource.name = `Buffer (${radiusMeters}m)`;
    viewer.dataSources.add(bufferDataSource);
    console.log("[BusScenario] Buffer added to viewer");
  } catch (e) {
    console.error("[BusScenario] Failed to load buffer into GeoJsonDataSource:", e);
    return;
  }

  // -----------------------------------------------
  // Re-evaluate ALL buildings with new buffer
  // -----------------------------------------------
  if (buildingsTileset && bufferUnionPolygon) {
    console.log("[BusScenario] Re-evaluating building colors...");
    
    buildingsInside.clear();
    buildingsOutside.clear();
    
    // Force re-evaluation of all currently loaded tiles
    const tiles = (buildingsTileset as any)._selectedTiles || [];
    tiles.forEach((tile: any) => {
      if (tile.content && tile.content.featuresLength) {
        const content = tile.content;
        const len = content.featuresLength;
        
        for (let i = 0; i < len; i++) {
          const feature = content.getFeature(i);
          if (!feature) continue;
          
          const gmlId = feature.getProperty("gml:id");
          if (!gmlId) continue;
          
          const lat = feature.getProperty("Latitude");
          const lon = feature.getProperty("Longitude");
          if (lat == null || lon == null) continue;
          
          const halfSize = 0.00018;
          let inside = false;
          
          try {
            const buildingBbox = turf.bboxPolygon([
              lon - halfSize, lat - halfSize,
              lon + halfSize, lat + halfSize
            ]);
            inside = turf.booleanIntersects(buildingBbox, bufferUnionPolygon);
          } catch {
            try {
              const point = turf.point([lon, lat]);
              inside = turf.booleanPointInPolygon(point, bufferUnionPolygon);
            } catch {}
          }
          
          feature.setProperty("is_near_busstop", inside);
          
          const gmlIdStr = String(gmlId);
          if (inside) {
            buildingsInside.add(gmlIdStr);
            buildingsOutside.delete(gmlIdStr);
          } else {
            buildingsOutside.add(gmlIdStr);
            buildingsInside.delete(gmlIdStr);
          }
        }
      }
    });
    
    viewer.scene.requestRender();
    updateStats();
  }
}


// =========================================================
//  BUILDING SYMBOLOGY & CLASSIFICATION
// =========================================================
//
function applyBuildingColorStyle() {
  if (!buildingsTileset) { 
    console.log("[BusScenario] applyBuildingColorStyle: tileset not ready yet");
    return;
  }
  

  buildingsTileset.style = new Cesium3DTileStyle({
    color: {
      conditions: [
        ["${is_near_busstop} === true", "color('green', 0.9)"],
        ["${is_near_busstop} === false", "color('red', 0.7)"],
        ["true", "color('white', 1)"], // Default white when no buffer
      ],
    },
  });
  console.log("[BusScenario] Building style applied");
}

function updateStats() {
  const total = allBuildingIds.size;
  const inside = buildingsInside.size;
  const outside = total > 0 ? total - inside : 0;
  const coveragePercent = total > 0 ? (inside / total) * 100 : 0;

  currentStats = {
    total,
    inside,
    outside,
    coveragePercent: Number(coveragePercent.toFixed(1)),
  };

  console.log("[BusScenario] Stats updated:", currentStats);
}


//
// =========================================================
//  LAYER TOGGLING (ScenarioManager calls this)
// =========================================================
//


export function toggleBusLayer(
  layers: LoadedLayer[],
  index: number,
  viewer: Viewer | null
): LoadedLayer[] {
  const updated = layers.map((l) => ({ ...l }));
  const clicked = updated[index];
  if (!clicked) return layers;

  clicked.visible = !clicked.visible;
  if (clicked.tileset) clicked.tileset.show = clicked.visible;
  if (clicked.datasource) clicked.datasource.show = clicked.visible;

  try {
    viewer?.scene.requestRender();
  } catch {}

  console.log("[BusScenario] toggleBusLayer:", clicked.name, "visible=", clicked.visible);

  return updated;
}