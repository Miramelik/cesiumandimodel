import {
  Viewer,
  Cesium3DTileset,
  Cesium3DTileStyle,
} from "cesium";
import type { LoadedLayer } from "../ScenarioManager";

// --------- Types for stats exposed to React ---------
export interface EnergyStats {
  totalBuildings: number;
  totalVolume: number;
  totalSurface: number;
  flatRoofCount: number;
  flatRoofPercent: number;
  totalEnergyDemand: number;
  annualCost: number;
  co2Emissions: number;
  avgHeight: number;
  avgStoreys: number;
}

/// Global state
let buildingsTileset: Cesium3DTileset | null = null;
let energyViewer: Viewer | null = null;
let tileVisibleCallback: ((tile: any) => void) | null = null;

// Feature collection
const buildingFeatures: Map<string, any> = new Map();
let metricsCache: EnergyStats = {
  totalBuildings: 0,
  totalVolume: 0,
  totalSurface: 0,
  flatRoofCount: 0,
  flatRoofPercent: 0,
  totalEnergyDemand: 0,
  annualCost: 0,
  co2Emissions: 0,
  avgHeight: 0,
  avgStoreys: 0,
};

// Throttle mechanism
let statsUpdateTimeout = false;
let lastStatsUpdate = 0;
const STATS_UPDATE_INTERVAL = 1000;

// Current visualization mode
let currentVisualization: "solar" | "height" | "storeys" | "function" | "energy" | "default" = "default";

/**
 * Initialize Energy scenario
 */
export async function initEnergyScenario(viewer: Viewer): Promise<LoadedLayer[]> {
  console.log("[EnergyScenario] Initializing...");
  energyViewer = viewer;

  buildingFeatures.clear();
  currentVisualization = "default";

  const loaded: LoadedLayer[] = [];

  try {
    console.log("[EnergyScenario] Loading building tileset (Asset ID: 4138907)...");
    
    buildingsTileset = await Cesium3DTileset.fromIonAssetId(4138907);
    viewer.scene.primitives.add(buildingsTileset);
    
    await (buildingsTileset as any).readyPromise;
    console.log("[EnergyScenario] Buildings tileset ready");
    
    loaded.push({
      id: 4138907,
      name: "3D Buildings (Energy)",
      type: "3DTILES",
      tileset: buildingsTileset,
      visible: true,
    });

    tileVisibleCallback = (tile: any) => {
      collectBuildingFeatures(tile);
      scheduleStatsUpdate();
    };

    buildingsTileset.tileVisible.addEventListener(tileVisibleCallback);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    computeEnergyMetrics();
    
    console.log("[EnergyScenario] Initialization complete");
  } catch (e) {
    console.error("[EnergyScenario] Failed to load:", e);
    buildingsTileset = null;
  }

  return loaded;
}

function collectBuildingFeatures(tile: any) {
  if (!tile || !tile.content) return;

  const content = tile.content;
  const count = content.featuresLength;
  if (!count || count === 0) return;

  for (let i = 0; i < count; i++) {
    const feature = content.getFeature(i);
    if (!feature) continue;

    const gmlId = feature.getProperty("gml:id");
    if (!gmlId || buildingFeatures.has(String(gmlId))) continue;

    const height = Number(feature.getProperty("bldg:measuredheight")) || 0;
    const storeys = Number(feature.getProperty("bldg:storeysaboveground")) || 1;
    const roofType = feature.getProperty("bldg:rooftype");
    const functionCode = feature.getProperty("bldg:function") || "other";


    // Try to get footprint from GML, if not available calculate from bounding box
    let footprint = Number(feature.getProperty("Grundflaeche"));

    if (!footprint || footprint === 0) {
      // Fallback: estimate footprint from latitude/longitude bounds
      // This is an approximation - assumes building is roughly square
      const lat = feature.getProperty("Latitude");
      const lon = feature.getProperty("Longitude");
      
      if (lat && lon && storeys > 0) {
        // Estimate: typical floor area per storey (assume 100m² per floor as default)
        footprint = storeys * 100;
      } else {
        // Last resort: use default based on storeys
        footprint = Math.max(50, storeys * 30);
      }
    }

     // Calculate volume: height × footprint
    const volume = height * footprint;

    // Calculate surface area: footprint + (perimeter × height)
    // Assuming roughly square building: perimeter ≈ 4 × √footprint
    const perimeter = 4 * Math.sqrt(footprint);
    const surface = footprint + (perimeter * height);

    // Store calculated values and set them as feature properties for Cesium styling
    feature.setProperty("calculated_volume", volume);
    feature.setProperty("calculated_surface", surface);
    feature.setProperty("calculated_energy", volume * 15);
    
    buildingFeatures.set(String(gmlId), {
       gmlId, height, storeys, roofType, functionCode, footprint, volume, surface,
    });
  }
}

function computeEnergyMetrics() {
  if (buildingFeatures.size === 0) return;

  let totalVolume = 0, totalSurface = 0, flatRoofCount = 0;
  let totalHeight = 0, totalStoreys = 0;

  for (const [_, data] of buildingFeatures) {
    totalVolume += data.volume;
    totalSurface += data.surface;
    totalHeight += data.height;
    totalStoreys += data.storeys;
    
    if (data.roofType === 1000 || data.roofType === "1000") flatRoofCount++;
  }

  const totalBuildings = buildingFeatures.size;
  const flatRoofPercent = totalBuildings > 0 ? (flatRoofCount / totalBuildings) * 100 : 0;
  const totalEnergyDemand = totalVolume * 15;
  const annualCost = totalEnergyDemand * 0.40;
  const co2Emissions = totalEnergyDemand * 0.31;
  const avgHeight = totalBuildings > 0 ? totalHeight / totalBuildings : 0;
  const avgStoreys = totalBuildings > 0 ? totalStoreys / totalBuildings : 0;

  metricsCache = {
    totalBuildings,
    totalVolume,
    totalSurface,
    flatRoofCount,
    flatRoofPercent: Number(flatRoofPercent.toFixed(1)),
    totalEnergyDemand,
    annualCost,
    co2Emissions,
    avgHeight: Number(avgHeight.toFixed(1)),
    avgStoreys: Number(avgStoreys.toFixed(1)),
  };

  console.log("[EnergyScenario] Metrics:", metricsCache);
}

function scheduleStatsUpdate() {
  if (statsUpdateTimeout) return;

  const now = Date.now();
  if (now - lastStatsUpdate >= STATS_UPDATE_INTERVAL) {
    computeEnergyMetrics();
    lastStatsUpdate = now;
    return;
  }

  statsUpdateTimeout = true;
  setTimeout(() => {
    computeEnergyMetrics();
    statsUpdateTimeout = false;
    lastStatsUpdate = Date.now();
  }, STATS_UPDATE_INTERVAL - (now - lastStatsUpdate));
}

export function getEnergyStats(): EnergyStats {
  return metricsCache;
}

export function applyEnergyVisualization(
  mode: "solar" | "height" | "storeys" | "function" | "energy" | "default"
) {
  if (!buildingsTileset) return;

  currentVisualization = mode;

  switch (mode) {
    case "solar":
      buildingsTileset.style = new Cesium3DTileStyle({
        color: {
          conditions: [
            ["${feature['bldg:rooftype']} === 1000", "color('gold', 0.9)"],
            ["true", "color('gray', 0.3)"],
          ],
        },
      });
      break;
    case "height":
      buildingsTileset.style = new Cesium3DTileStyle({
        defines: { 
          h: "Number(${feature['bldg:measuredheight']})" 
        },
        color: {
          conditions: [
            ["${h} > 50", "color('maroon', 0.9)"],
            ["${h} > 30", "color('darkorange', 0.8)"],
            ["${h} > 15", "color('yellow', 0.6)"],
            ["true", "color('lightblue', 0.6)"],
          ],
        },
      });
      break;
    case "storeys":
      buildingsTileset.style = new Cesium3DTileStyle({
        defines: { 
          s: "Number(${feature['bldg:storeysaboveground']})" 
        },
        color: {
          conditions: [
            ["${s} >= 10", "color('purple', 0.9)"],
            ["${s} >= 6", "color('red', 0.8)"],
            ["${s} >= 3", "color('orange', 0.6)"],
            ["true", "color('green', 0.4)"],
          ],
        },
      });
      break;
    case "function":
      buildingsTileset.style = new Cesium3DTileStyle({
        color: {
          conditions: [
            ["${feature['bldg:function']} === '31001_1000'", "color('cyan', 0.9)"],
            ["${feature['bldg:function']} === '32001_1000'", "color('orange', 0.9)"],
            ["true", "color('gray', 0.5)"],
          ],
        },
      });
      break;
    case "energy":
      buildingsTileset.style = new Cesium3DTileStyle({
          color: {
          conditions: [
             ["${feature['calculated_energy']} >= 30000", "color('darkred', 0.9)"],
            ["${feature['calculated_energy']} >= 15000", "color('orangered', 0.8)"],
            ["${feature['calculated_energy']} > 0", "color('gold', 0.6)"],
            ["true", "color('lightgreen', 0.4)"],
          ],
        },
      });
      break;
    default:
      buildingsTileset.style = undefined;
      break;
  }

  energyViewer?.scene.requestRender();
}

export function getEnergyLegend(): { title: string; items: Array<{ color: string; label: string }> } | null {
  switch (currentVisualization) {
    case "solar":
      return {
        title: "Solar Suitability",
        items: [
          { color: "#FFD700", label: "Flat Roofs" },
          { color: "#808080", label: "Other Roofs" },
        ],
      };
    case "height":
      return {
        title: "Building Height (m)",
        items: [
          { color: "#800000", label: "50+ m" },
          { color: "#FF8C00", label: "30–49 m" },
          { color: "#FFFF00", label: "15–29 m" },
          { color: "#ADD8E6", label: "<15 m" },
        ],
      };
    case "storeys":
      return {
        title: "Storeys Above Ground",
        items: [
          { color: "#800080", label: "10+" },
          { color: "#FF0000", label: "6–9" },
          { color: "#FFA500", label: "3–5" },
          { color: "#008000", label: "<3" },
        ],
      };
    case "function":
      return {
        title: "Building Function",
        items: [
          { color: "#00FFFF", label: "Residential" },
          { color: "#FFA500", label: "Office" },
          { color: "#808080", label: "Other" },
        ],
      };
    case "energy":
      return {
        title: "Energy Demand (kWh/year)",
        items: [
          { color: "#8B0000", label: "≥30,000" },
          { color: "#FF4500", label: "15,000–29,999" },
          { color: "#FFD700", label: "<15,000" },
          { color: "#90EE90", label: "No data" },
        ],
      };
    default:
      return null;
  }
}

export function cleanupEnergyScenario(viewer: Viewer) {
  console.log("[EnergyScenario] Cleanup");

  if (tileVisibleCallback && buildingsTileset) {
    try {
      buildingsTileset.tileVisible.removeEventListener(tileVisibleCallback);
    } catch (e) {}
    tileVisibleCallback = null;
  }

  buildingFeatures.clear();
  buildingsTileset = null;
  energyViewer = null;
  currentVisualization = "default";
}

export function toggleEnergyLayer(
  layers: LoadedLayer[],
  index: number,
  viewer: Viewer | null
): LoadedLayer[] {
  const updated = layers.map((l) => ({ ...l }));
  const clicked = updated[index];
  if (!clicked) return layers;

  clicked.visible = !clicked.visible;
  if (clicked.tileset) clicked.tileset.show = clicked.visible;

  viewer?.scene.requestRender();
  return updated;
}

/**
 * Get building info for a picked feature (for hover/click display)
 */
export function getBuildingInfo(feature: any): string | null {
  if (!feature || typeof feature.getProperty !== 'function') return null;

  const gmlId = feature.getProperty("gml:id");
  const height = Number(feature.getProperty("bldg:measuredheight")) || 0;
  const storeys = Number(feature.getProperty("bldg:storeysaboveground")) || 0;
  const volume = Number(feature.getProperty("calculated_volume")) || 0;
  const surface = Number(feature.getProperty("calculated_surface")) || 0;
  const energy = Number(feature.getProperty("calculated_energy")) || 0;
  const cost = energy * 0.40; // €0.40 per kWh
  const co2 = energy * 0.31; // 0.31 kg CO2 per kWh

  return `
    <b>GML ID:</b> ${gmlId || 'N/A'}<br>
    <b>Height:</b> ${height.toFixed(1)} m<br>
    <b>Storeys:</b> ${storeys}<br>
    <b>Volume:</b> ${volume.toFixed(2)} m³<br>
    <b>Surface:</b> ${surface.toFixed(2)} m²<br>
    <b>Energy Demand:</b> ${energy.toFixed(0)} kWh/year<br>
    <b>Annual Cost:</b> €${cost.toFixed(2)}<br>
    <b>CO₂ Emissions:</b> ${co2.toFixed(2)} kg/year
  `;
}