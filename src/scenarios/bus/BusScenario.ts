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


let tileVisibleCallback: ((title: any) => void) | null = null;

let onBufferUpdatedCallback: ((datasource:GeoJsonDataSource, radius:number) => void) | null = null;

let currentStats: BusStats = {
  total: 0,
  inside: 0,
  outside: 0,
  coveragePercent: 0,
};

//Throtle mechanism for stats updates
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
    
      // -----------------------------------------------
      // 1) Load BUS STOP GEOJSON (points)
      // -----------------------------------------------
      console.log("[BusScenario] Loading busstops.geojson...");
      const busStopsData = await GeoJsonDataSource.load("/busstops.geojson", {
        markerSize: 18,
        markerColor: Color.RED,
        clampToGround: true,
      });
      
        busStopsData.name = "Bus Stops";
        viewer.dataSources.add(busStopsData);
      
          loaded.push({
          id: "bus_stops",
          name: "Bus Stops",
          type: "GEOJSON",
          datasource: busStopsData,
          visible: true,
        });
        
          // Save raw JSON for Turf buffer creation
          busStopsJson = await fetch("/busstops.geojson").then((r) => r.json());
           console.log("[BusScenario] Bus stops loaded, features:", busStopsJson?.features?.length ?? 0);
      } catch (e) {
        console.error("[BusScenario] Failed to load busstops.geojson:", e);
      }

      try {
        console.log("[BusScenario] Loading building tileset (Ion asset)...");
        
          // -----------------------------------------------
          // 2) Load 3D BUILDINGS (Cesium Ion asset)
          // -----------------------------------------------
          buildingsTileset = await Cesium3DTileset.fromIonAssetId(4138907);
          viewer.scene.primitives.add(buildingsTileset);
        
          await (buildingsTileset as any).readyPromise;
           console.log("[BusScenario] Buildings tileset ready");
           loaded.push({
             id: 4138907,
             name: "3D Buildings",
             type: "3DTILES",
             tileset: buildingsTileset,
             visible: true,
           });

           //Initial collection of all building IDs (only one on load)

           tileVisibleCallback = (tile : any) => {
             const content = tile.content;
             const len = content.featuresLength ?? 0;
             for (let i = 0; i < len; i++) {
               const f = content.getFeature(i);
               try {
                 const gmlId = f.getProperty("gml:id");
                 if (gmlId) {
                  allBuildingIds.add(String(gmlId));

                  if (bufferUnionPolygon) {
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
      applyBuildingColorStyle();

      currentBufferRadius = 400; //reset to default
      await createBusBuffer(viewer, currentBufferRadius);

      if (bufferDataSource) {
        loaded.push({
          id: "bus_buffer",
          name: `Buffer (${currentBufferRadius}m)`,
          type: "GEOJSON",
          datasource: bufferDataSource,
          visible: true,
        });
        console.log("[BusScenario] Buffer layer added to loaded list");
      
      }
      console.log("[BusScenario] initBusScenario() finished");
      return loaded;
    }

    //clean up function
    export  function cleanupBusScenario(viewer: Viewer) {
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

    if (validFeatures.length> 0) {
      let combinedFeature = turf.combine(turf.featureCollection(validFeatures)) as any;
      const combinedCollection = turf.featureCollection([combinedFeature]) as any;
      const dissolved = turf.dissolve(combinedCollection, {mutate: false} as any);

      if (dissolved && dissolved.features.length > 0) {
        bufferUnionPolygon = dissolved.features[0];
        console.log(`[BusScenario] Successful union using dissolve. Type: ${bufferUnionPolygon.geometry.type}`);
      } else {
        console.error("[BusScenario] Dissolve failed to produce a valid union feature.");
      }
    }
  } catch (e) {
    console.error("[BusScenario] Error creating union polygon (combine/dissolve failed):", e);
  }


  try {
    // Load into Cesium as polygons
    bufferDataSource = await GeoJsonDataSource.load(buffered as any, {
      fill: Color.BLUE.withAlpha(0.25),
      stroke: Color.BLUE,
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
  if (!buildingsTileset) { console.log("[BusScenario] applyBuildingColorStyle: tileset not ready yet");
    return;};

  buildingsTileset.style = new Cesium3DTileStyle({
    color: {
      conditions: [
        ["${is_near_busstop} === true", "color('green', 0.9)"],
        ["true", "color('red', 0.7)"],
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
