import type { Viewer } from "cesium";
import type { LoadedLayer } from "../ScenarioManager";

export async function initBusScenario(_viewer: Viewer): Promise<LoadedLayer[]> {
  // later: load bus stops, routes, etc.
  return [];
}

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

  viewer?.scene.requestRender();
  return updated;
}
