// src/scenarios/ScenarioManager.ts

export type ScenarioName = "IFC" | "BUS" | "NOISE" | "ENERGY";

export interface ScenarioDefinition {
  name: ScenarioName;

  // Cesium Layers to load
  cesiumLayers: {
    type: "3DTILES" | "GEOJSON";
    assetId: number;
    name: string;
  }[];

  // When TRUE → App.tsx will show the iTwin viewer
  showITwin: boolean;
}

export const SCENARIOS: Record<ScenarioName, ScenarioDefinition> = {
  IFC: {
    name: "IFC",
    showITwin: true,
    cesiumLayers: [
      { type: "3DTILES", assetId: 3476879, name: "IFC Model 1" },
      { type: "3DTILES", assetId: 4066080, name: "IFC Model 2" },
      { type: "3DTILES", assetId: 4066077, name: "IFC Model 3" },
      { type: "3DTILES", assetId: 4065957, name: "IFC Model 4" },
      { type: "3DTILES", assetId: 4066099, name: "IFC Model 5" },
      { type: "3DTILES", assetId: 4046995, name: "IFC Model 6" },
      { type: "3DTILES", assetId: 4078829, name: "CITY GML LoD2" },
    ],
  },

  BUS: {
    name: "BUS",
    showITwin: false,
    cesiumLayers: [
      // (EMPTY for now — later GIS sources will be added)
      // Example:
     
    ],
  },

  NOISE: {
    name: "NOISE",
    showITwin: false,
    cesiumLayers: [
      // (EMPTY for now)
    ],
  },

  ENERGY: {
    name: "ENERGY",
    showITwin: false,
    cesiumLayers: [
      // (EMPTY for now)
    ],
  },
};


// ScenarioManager = simple wrapper around the active scenario
export class ScenarioManager {
  private scenario: ScenarioDefinition;

  constructor(defaultScenario: ScenarioName = "IFC") {
    this.scenario = SCENARIOS[defaultScenario];
  }

  setScenario(name: ScenarioName) {
    this.scenario = SCENARIOS[name];
  }

  getScenario(): ScenarioDefinition {
    return this.scenario;
  }

  getCesiumLayers() {
    return this.scenario.cesiumLayers;
  }

  getShowITwin() {
    return this.scenario.showITwin;
  }
}
