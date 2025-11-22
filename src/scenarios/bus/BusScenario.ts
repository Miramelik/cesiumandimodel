import  {
  Viewer,
  GeoJsonDataSource,
  Cesium3DTileset,
  Color,
  Cesium3DTileStyle,
 } from "cesium";
 import * as turf from "@turf/turf";
import type { LoadedLayer } from "../ScenarioManager";
import { buffer } from "stream/consumers";


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


let tileVisibleCallback: ((title: any) => void) | null = null;

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
// --------------------------------------------------


export async function initBusScenario(viewer: Viewer): Promise<LoadedLayer[]> {
  console.log("[BusScenario] initBusScenario() start");
  busViewer = viewer;

  //Reset state
  buildingsInside.clear();
  buildingsOutside.clear();
  allBuildingIds.clear();
  bufferDataSource = null;
  buildingsTileset = null;
  tileVisibleCallback = null;
  
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
                 if (gmlId) allBuildingIds.add(String(gmlId));
               } catch {}
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

      if (bufferDataSource) {
        loaded.push({
          id: "bus_buffer",
          name: "Bus Stop Buffer (400m)",
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
    export async function cleanupBusScenario(viewer: Viewer) {
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

      console.log ("[BusScenario] Cleanup complete");
    }
    

// called from react slider
export async function updateBusBufferRadius(radiusMeters: number) {
  if (!busViewer)  {
    console.warn("[BusScenario] updateBusBufferRadius called but viewer not set");
    return;
  }
  console.log("[BusScenario] updateBusBufferRadius:", radiusMeters);
  await createBusBuffer(busViewer, radiusMeters);
}

//Stats getter for React
export function getBusStats(): BusStats {
  return currentStats;
}

function scheduleStatsUpdate() {
  if (statsUpdateTimeout) return;

  const now = Date.now();
  if (now - lastStatsUpdate >= STATS_UPDATE_INTERVAL) {
    return;
  }

  statsUpdateTimeout = true;
  lastStatsUpdate = now;

  setTimeout(() => {
    updateStats();
    statsUpdateTimeout = false;
  }, 100);
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

  try {
    // Load into Cesium as polygons
    bufferDataSource = await GeoJsonDataSource.load(buffered as any, {
      fill: Color.BLUE.withAlpha(0.25),
      stroke: Color.BLUE,
      strokeWidth: 2,
      clampToGround: true,
    });
    
      bufferDataSource.name = `Buffer (${radiusMeters} m)`;
      viewer.dataSources.add(bufferDataSource);
       console.log("[BusScenario] Buffer added to viewer, features:", buffered.features.length);
  } catch (e) {
     console.error("[BusScenario] Failed to load buffer into GeoJsonDataSource:", e);
      return;
  }

  try {
    updateBuildingIntersection(buffered, viewer);
  }
    catch (e) {
    console.error("[BusScenario] updateBuildingIntersection failed:", e);
    }
    
}

//
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

function updateBuildingIntersection(buffered: any, viewer: Viewer) {
  if (!buildingsTileset) {
    console.warn("[BusScenario] updateBuildingIntersection: buildingsTileset missing");
    return;
  }

    if (!buffered || !buffered.features || buffered.features.length === 0) {
    console.warn("[BusScenario] updateBuildingIntersection: buffer invalid");
    return;
  }

  console.log("[BusScenario] updateBuildingIntersection: starting");

  buildingsInside.clear();
  buildingsOutside.clear();

  //Union all buffer polygons into one
  let unionPolygon: any=null;

  try {
    if (buffered.features.length === 1) {
      unionPolygon = buffered.features[0];
    } else  {
      unionPolygon = buffered.features[0];
      for (let i = 1; i < buffered.features.length; i++) {
        try {
          unionPolygon = turf.union(unionPolygon, buffered.features[i]);
        }
        catch (e) {
          console.warn("[BusScenario] Turf union failed for polygon index", i, e);
        }
      }
      if (!unionPolygon) {
        unionPolygon = buffered;
      }
    }
  } catch (e) {
    console.warn("[BusScenario] union building buffer failed; using full feature collection fallback", e);
    unionPolygon = buffered; 
  }

  if (tileVisibleCallback && buildingsTileset) {
    try {
      buildingsTileset.tileVisible.removeEventListener( tileVisibleCallback);
    } catch {}
  }
  tileVisibleCallback = (tile : any) => {
    try {
      const content = tile.content;
      const count = content.featuresLength ?? 0;
    
      for (let i = 0; i < count; i++) {
        const feature = content.getFeature(i);
         if (!feature) continue;

        const gmlId = feature.getProperty("gml:id");
        if (!gmlId) continue;

        const lat = feature.getProperty("Latitude");
        const lon = feature.getProperty("Longitude");
        if (lat == null || lon == null) continue;

        const half = 0.00018;
        const bbox = turf.bboxPolygon([
          lon - half,
          lat - half,
          lon + half,
          lat + half,
        ]);

        let inside = false;
        try {
          inside = turf.booleanIntersects(bbox, unionPolygon);
        } catch (e) {
          // fallback: if booleanIntersects fails, set false and continue
          console.warn("[BusScenario] booleanIntersects failed for bbox:", e);
          inside = false;
        }

        feature.setProperty("is_near_busstop", inside);
        if (inside) buildingsInside.add(String(gmlId));
        else buildingsOutside.add(String(gmlId));
      }
    }
      catch (e) {
      console.error("[BusScenario] tileVisible handler error:", e);
    }

    //Throttle stats updates
    scheduleStatsUpdate();

    try {
      viewer.scene.requestRender(); 
      }
    catch {}
  };

  if (buildingsTileset) {buildingsTileset.tileVisible.addEventListener(tileVisibleCallback);}
  console.log("[BusScenario] updateBuildingIntersection: finished (listener attached)");

  //Force initial stats update
  updateStats();
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
