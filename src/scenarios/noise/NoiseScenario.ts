import type { Viewer } from "cesium";
import type { LoadedLayer } from "../ScenarioManager";

export async function initNoiseScenario(_viewer: Viewer): Promise<LoadedLayer[]> {
  return [];
}

export function toggleNoiseLayer(
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
