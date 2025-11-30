import type { Viewer, Cesium3DTileset, ImageryLayer } from "cesium";
import type { GeoJsonDataSource } from "cesium";

import { LayerType } from "./SCENARIOS";
import { initIFCScenario, toggleIFCLayer } from "./ifc/IFCScenario";
import { initBusScenario, cleanupBusScenario  } from "./bus/BusScenario";
import { initNoiseScenario, cleanupNoiseScenario } from "./noise/NoiseScenario";
import { initEnergyScenario, cleanupEnergyScenario} from "./energy/EnergyScenario";


export type ScenarioId = "ifc" | "bus" | "noise" | "energy";



export interface LoadedLayer {
  id: number | string;                          // internal id (e.g. "ifc-1", "bus-stops")
  name: string;                        // label in the UI
  type: LayerType;
  tileset?: Cesium3DTileset;           // for 3D tiles layers
  datasource?: GeoJsonDataSource;      // for GeoJSON layers
  imageryLayer?: ImageryLayer;
  visible: boolean;

  boundingSphere?: any;               // optional precomputed bounding sphere
}

/**
 * ScenarioManager handles loading and cleanup for all scenarios
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

    try {
      cleanupBusScenario(viewer);
    } catch {}

    try {
      cleanupNoiseScenario(viewer);
    } catch {}

    try {
      cleanupEnergyScenario(viewer);
    } catch {}
    
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

  static toggleIFCLayer = toggleIFCLayer;
}
