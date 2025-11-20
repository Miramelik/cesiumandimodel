// src/scenarios/ScenarioManager.ts
import type { Viewer } from "cesium";
import { ScenarioLayer } from "./SCENARIOS";
import { initIFCScenario, toggleIFCLayer } from "./ifc/IFCScenario";
import { initBusScenario, toggleBusLayer } from "./bus/BusScenario";
import { initNoiseScenario, toggleNoiseLayer } from "./noise/NoiseScenario";
import { initEnergyScenario, toggleEnergyLayer } from "./energy/EnergyScenario";

export interface LoadedLayer extends ScenarioLayer {
  tileset?: any;
  datasource?: any;
  boundingSphere?: any;
  visible: boolean;
}

export interface ScenarioHandlers {
  init: (viewer: Viewer) => Promise<LoadedLayer[]>;
  toggleLayer: (
    layers: LoadedLayer[],
    index: number,
    viewer: Viewer | null
  ) => LoadedLayer[];
}

const handlers: Record<string, ScenarioHandlers> = {
  ifc: {
    init: initIFCScenario,
    toggleLayer: toggleIFCLayer,
  },
  bus: {
    init: initBusScenario,
    toggleLayer: toggleBusLayer,
  },
  noise: {
    init: initNoiseScenario,
    toggleLayer: toggleNoiseLayer,
  },
  energy: {
    init: initEnergyScenario,
    toggleLayer: toggleEnergyLayer,
  },
};

function getHandlers(id: string | undefined): ScenarioHandlers {
  const key = (id || "ifc").toLowerCase();
  return handlers[key] ?? handlers["ifc"];
}

export async function initScenarioForCesium(
  id: string | undefined,
  viewer: Viewer
): Promise<LoadedLayer[]> {
  const h = getHandlers(id);
  return h.init(viewer);
}

export function toggleLayerForScenario(
  id: string | undefined,
  layers: LoadedLayer[],
  index: number,
  viewer: Viewer | null
): LoadedLayer[] {
  const h = getHandlers(id);
  return h.toggleLayer(layers, index, viewer);
}
