import type { Viewer, Cesium3DTileset } from "cesium";
import type { GeoJsonDataSource } from "cesium";

import { LayerType, ScenarioLayer } from "./SCENARIOS";
import { initIFCScenario, toggleIFCLayer } from "./ifc/IFCScenario";
import { initBusScenario, toggleBusLayer } from "./bus/BusScenario";
import { initNoiseScenario, toggleNoiseLayer } from "./noise/NoiseScenario";
import { initEnergyScenario, toggleEnergyLayer } from "./energy/EnergyScenario";


export type ScenarioId = "ifc" | "bus" | "noise" | "energy";



export interface LoadedLayer {
  id: number | string;                          // internal id (e.g. "ifc-1", "bus-stops")
  name: string;                        // label in the UI
  type: LayerType;
  tileset?: Cesium3DTileset;           // for 3D tiles layers
  datasource?: GeoJsonDataSource;      // for GeoJSON layers
  visible: boolean;

  boundingSphere?: any;               // optional precomputed bounding sphere
}

/**
 * ScenarioManager is a small helper that knows
 * which init function to call for each scenario.
 */
export class ScenarioManager {
  /**
   * Load all Cesium layers for a scenario.
   * Each initXYZScenario(viewer) returns LoadedLayer[]
   */
  static async loadScenario(
    id: ScenarioId,
    viewer: Viewer
  ): Promise<LoadedLayer[]> {
    switch (id) {
      case "bus":
        return initBusScenario(viewer);

      case "noise":
        return initNoiseScenario(viewer);

      case "energy":
        return initEnergyScenario(viewer);

      case "ifc":
      default:
        return initIFCScenario(viewer);
    }
  }
}
