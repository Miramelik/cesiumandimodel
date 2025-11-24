import {
  Viewer,
  GeoJsonDataSource,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  Cesium3DTileset,
  Cesium3DTileStyle,
  Cartographic,
  Math as CesiumMath,
} from "cesium";
import * as turf from "@turf/turf";
import type { LoadedLayer } from "../ScenarioManager";

// --------- Types for stats exposed to React ---------
export interface NoiseStats {
  total: number;
  insideHigh: number;
  outsideHigh: number;
  insideMedium: number;
  insideLow: number;
  coveragePercent: number;
}

// Building classification state
const buildingsInHigh = new Set<string>();
const buildingsInMedium = new Set<string>();
const buildingsInLow = new Set<string>();
const buildingsOutside = new Set<string>();
const allBuildingIds = new Set<string>();
const processedBuildingIds = new Set<string>();

// Noise polygons (Turf format)
let highNoisePolygons: any[] = [];
let mediumNoisePolygons: any[] = [];
let lowNoisePolygons: any[] = [];

// Global state
let buildingsTileset: Cesium3DTileset | null = null;
let noiseViewer: Viewer | null = null;
let tileVisibleCallback: ((tile: any) => void) | null = null;

let currentStats: NoiseStats = {
  total: 0,
  insideHigh: 0,
  outsideHigh: 0,
  insideMedium: 0,
  insideLow: 0,
  coveragePercent: 0,
};

/**
 * Initialize NOISE scenario
 * Load noise polygons + buildings + apply symbology
 */
export async function initNoiseScenario(viewer: Viewer): Promise<LoadedLayer[]> {
  const loaded: LoadedLayer[] = [];
  noiseViewer = viewer;

  // Reset state
  buildingsInHigh.clear();
  buildingsInMedium.clear();
  buildingsInLow.clear();
  buildingsOutside.clear();
  allBuildingIds.clear();
  processedBuildingIds.clear();
  
  highNoisePolygons = [];
  mediumNoisePolygons = [];
  lowNoisePolygons = [];

  try {
    // ----------------------------------------------------
    // 1) Load noise.geojson
    // ----------------------------------------------------
    const noiseData = await GeoJsonDataSource.load("/noise.geojson", {
      clampToGround: true,
    });

    noiseData.name = "Noise Areas";
    
    const entities = noiseData.entities.values;
    
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
    
      if (!entity.id){
        entity.id = `noise_entity_${i}`;
      }
    }
    
    // ----------------------------------------------------
    // 2) Extract Turf polygons for spatial analysis
    // ----------------------------------------------------
    extractNoisePolygons(noiseData);
    
    // ----------------------------------------------------
    // 3) Apply color symbology
    // ----------------------------------------------------
    applyNoiseSymbology(noiseData);

    await viewer.dataSources.add(noiseData);

    // Add to scenario layer list
    loaded.push({
      id: "noise_layer",
      name: "Noise Areas",
      type: "GEOJSON",
      datasource: noiseData,
      visible: true,
    });

    console.log("🔊 Noise scenario loaded");
    console.log(`High noise polygons: ${highNoisePolygons.length}`);
    console.log(`Medium noise polygons: ${mediumNoisePolygons.length}`);
    console.log(`Low noise polygons: ${lowNoisePolygons.length}`);
  } catch (err) {
    console.error("❌ Error loading noise scenario:", err);
  }

  try {
    // ----------------------------------------------------
    // 4) Load 3D BUILDINGS
    // ----------------------------------------------------
    console.log("[NoiseScenario] Loading building tileset...");
    
    buildingsTileset = await Cesium3DTileset.fromIonAssetId(4138907);
    viewer.scene.primitives.add(buildingsTileset);
  
    await (buildingsTileset as any).readyPromise;
    console.log("[NoiseScenario] Buildings tileset ready");
    
    loaded.push({
      id: 4138907,
      name: "3D Buildings",
      type: "3DTILES",
      tileset: buildingsTileset,
      visible: true,
    });

    // Set up tile visible listener for classification
    tileVisibleCallback = (tile: any) => {
      classifyTile(tile);
      scheduleStatsUpdate();
    };

    buildingsTileset.tileVisible.addEventListener(tileVisibleCallback);
    
    // Classify existing tiles
    classifyExistingTiles();
    
    // Apply building style
    applyBuildingColorStyle();
    
  } catch (e) {
    console.error("[NoiseScenario] Failed to load buildings tileset:", e);
    buildingsTileset = null;
  }

  updateStats();
  return loaded;
}

/**
 * Extract Turf polygons from Noise GeoJSON entities
 */
function extractNoisePolygons(dataSource: GeoJsonDataSource) {
  for (const entity of dataSource.entities.values) {
    if (!entity.polygon || !entity.properties) continue;

    // Check if hierarchy exists
    if (!entity.polygon.hierarchy) {
      console.warn("Entity has polygon but no hierarchy:", entity.id);
      continue;
    }

    // Normalize noise level
    const raw = entity.properties.NoiseLevel?.getValue();
    const level = String(raw).toLowerCase();

    // Get hierarchy - handle both Property and direct PolygonHierarchy
    let hierarchy: any;
    try {
      if (typeof entity.polygon.hierarchy.getValue === 'function') {
        hierarchy = entity.polygon.hierarchy.getValue(noiseViewer?.clock.currentTime);
      } else {
        hierarchy = entity.polygon.hierarchy;
      }
    } catch (e) {
      console.warn("Failed to get hierarchy for entity:", entity.id, e);
      continue;
    }

    if (!hierarchy || !hierarchy.positions || hierarchy.positions.length === 0) {
      console.warn("Invalid hierarchy for entity:", entity.id);
      continue;
    }

    const coords = hierarchy.positions.map((p: any) => {
      const c = Cartographic.fromCartesian(p);
      return [
        CesiumMath.toDegrees(c.longitude),
        CesiumMath.toDegrees(c.latitude)
      ];
    });

    // Close the ring
    const poly = turf.polygon([[...coords, coords[0]]]);

    if (level === "high") highNoisePolygons.push(poly);
    else if (level === "medium") mediumNoisePolygons.push(poly);
    else if (level === "low") lowNoisePolygons.push(poly);
  }
}

/**
 * Classify all existing tiles in the tileset
 */
function classifyExistingTiles() {
  if (!buildingsTileset || !noiseViewer) return;

  noiseViewer.scene.render(); // ensure tile visibility is up-to-date

  const root = (buildingsTileset as any)._root;
  if (!root) return;

  function traverse(tile: any) {
    if (tile.content && tile.content.featuresLength > 0) {
      classifyTile(tile);
    }

    for (const child of tile.children) {
      traverse(child);
    }
  }

  traverse(root);
}

/**
 * Classify all building features in a tile
 */
function classifyTile(tile: any) {
  if (!tile || !tile.content) return;

  const content = tile.content;
  const count = content.featuresLength;
  if (!count || count === 0) return;

  for (let i = 0; i < count; i++) {
    const feature = content.getFeature(i);
    if (!feature) continue;

    const gmlId = feature.getProperty("gml:id");
    if (!gmlId) continue;

    // Skip if already processed
    if (processedBuildingIds.has(String(gmlId))) continue;
    processedBuildingIds.add(String(gmlId));
    allBuildingIds.add(String(gmlId));

    const lat = feature.getProperty("Latitude");
    const lon = feature.getProperty("Longitude");
    if (lat == null || lon == null) continue;

    const point = turf.point([Number(lon), Number(lat)]);

    // Classify building based on noise zones
    let noiseLevel = "none";
    
    // Check high noise first (priority)
    for (const poly of highNoisePolygons) {
      try {
        if (turf.booleanPointInPolygon(point, poly)) {
          noiseLevel = "high";
          break;
        }
      } catch {}
    }

    // Then medium
    if (noiseLevel === "none") {
      for (const poly of mediumNoisePolygons) {
        try {
          if (turf.booleanPointInPolygon(point, poly)) {
            noiseLevel = "medium";
            break;
          }
        } catch {}
      }
    }

    // Then low
    if (noiseLevel === "none") {
      for (const poly of lowNoisePolygons) {
        try {
          if (turf.booleanPointInPolygon(point, poly)) {
            noiseLevel = "low";
            break;
          }
        } catch {}
      }
    }

    // Set property for styling
    feature.setProperty("noise_level", noiseLevel);

    // Update counters
    const gmlIdStr = String(gmlId);
    
    if (noiseLevel === "high") {
      buildingsInHigh.add(gmlIdStr);
      buildingsInMedium.delete(gmlIdStr);
      buildingsInLow.delete(gmlIdStr);
      buildingsOutside.delete(gmlIdStr);
    } else if (noiseLevel === "medium") {
      buildingsInMedium.add(gmlIdStr);
      buildingsInHigh.delete(gmlIdStr);
      buildingsInLow.delete(gmlIdStr);
      buildingsOutside.delete(gmlIdStr);
    } else if (noiseLevel === "low") {
      buildingsInLow.add(gmlIdStr);
      buildingsInHigh.delete(gmlIdStr);
      buildingsInMedium.delete(gmlIdStr);
      buildingsOutside.delete(gmlIdStr);
    } else {
      buildingsOutside.add(gmlIdStr);
      buildingsInHigh.delete(gmlIdStr);
      buildingsInMedium.delete(gmlIdStr);
      buildingsInLow.delete(gmlIdStr);
    }
  }
}

/**
 * Color polygons based on NoiseLevel attribute
 * high → red, medium → orange, low → green
 */
function applyNoiseSymbology(dataSource: GeoJsonDataSource) {
  const entities = dataSource.entities.values;
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];

    if (!entity.id) 
      {
        entity.id = `noise_entity_${i}`
      };
    const props = entity.properties;
    if (!props || !entity.polygon) continue;

    try {
      const level = props.NoiseLevel?.getValue(); // attribute from GeoJSON
      let color = Color.GRAY.withAlpha(0.5);
      if (level === "high") color = Color.RED.withAlpha(0.35);
      else if (level === "medium") color = Color.ORANGE.withAlpha(0.35);
      else if (level === "low") color = Color.GREEN.withAlpha(0.35);


      entity.polygon.material = new ColorMaterialProperty(color);
      entity.polygon.outline = new ConstantProperty(false);
    }
    catch (e) {
      console.warn(`Failed to apply symbology to entity ${entity.id}:`, e);
  }
}
console.log(`Applied symbology to ${entities.length} noise entities`);
}

/**
 * Apply building color style based on noise classification
 */
function applyBuildingColorStyle() {
  if (!buildingsTileset) {
    console.log("[NoiseScenario] applyBuildingColorStyle: tileset not ready yet");
    return;
  }

  buildingsTileset.style = new Cesium3DTileStyle({
    color: {
      conditions: [
        ["${noise_level} === 'high'", "color('#cc0000', 1.0)"],
        ["${noise_level} === 'medium'", "color('#ff8800', 1.0)"],
        ["${noise_level} === 'low'", "color('#00aa00', 1.0)"],
        ["true", "color('white', 1.0)"],
      ],
    },
  });
  console.log("[NoiseScenario] Building style applied");
}

/**
 * Clear building style (reset to neutral)
 */
export function clearNoiseStyle() {
  if (!buildingsTileset) return;

  buildingsTileset.style = new Cesium3DTileStyle({
    color: "color('white',1.0)"
  });
}

/**
 * Update statistics
 */
let statsUpdateTimeout = false;
let lastStatsUpdate = 0;
const STATS_UPDATE_INTERVAL = 1000;

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

function updateStats() {
  const total = allBuildingIds.size;
  const insideHigh = buildingsInHigh.size;
  const insideMedium = buildingsInMedium.size;
  const insideLow = buildingsInLow.size;
  const outsideHigh = total - insideHigh;
  const coveragePercent = total > 0 ? (insideHigh / total) * 100 : 0;

  currentStats = {
    total,
    insideHigh,
    outsideHigh,
    insideMedium,
    insideLow,
    coveragePercent: Number(coveragePercent.toFixed(1)),
  };

  console.log("[NoiseScenario] Stats updated:", currentStats);
}

/**
 * Get current noise stats
 */
export function getNoiseStats(): NoiseStats {
  return currentStats;
}

/**
 * Cleanup function
 */
export function cleanupNoiseScenario(viewer: Viewer) {
  console.log("[NoiseScenario] cleanupNoiseScenario() called");

  // Remove tile visible listener
  if (tileVisibleCallback && buildingsTileset) {
    try {
      buildingsTileset.tileVisible.removeEventListener(tileVisibleCallback);
    } catch (e) {
      console.warn("[NoiseScenario] Error removing tileVisible listener", e);
    }
    tileVisibleCallback = null;
  }

  // Clear sets
  buildingsInHigh.clear();
  buildingsInMedium.clear();
  buildingsInLow.clear();
  buildingsOutside.clear();
  allBuildingIds.clear();
  processedBuildingIds.clear();

  // Clear arrays
  highNoisePolygons = [];
  mediumNoisePolygons = [];
  lowNoisePolygons = [];

  // Clear references
  buildingsTileset = null;
  noiseViewer = null;

  console.log("[NoiseScenario] Cleanup complete");
}

/**
 * Toggle visibility of noise layer
 */
export function toggleNoiseLayer(
  layers: LoadedLayer[],
  index: number,
  viewer: Viewer | null
): LoadedLayer[] {
  const updated = layers.map(l => ({ ...l }));
  const clicked = updated[index];

  if (!clicked) return layers;

  clicked.visible = !clicked.visible;

  if (clicked.datasource) {
    clicked.datasource.show = clicked.visible;
  }
  
  if (clicked.tileset) {
    clicked.tileset.show = clicked.visible;
  }

  try {
    viewer?.scene.requestRender();
  } catch (e) {
    console.warn("toggleNoiseLayer: failed to request render:", e);
  }

  return updated;
}