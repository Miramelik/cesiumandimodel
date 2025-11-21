import {
  Viewer,
  GeoJsonDataSource,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
} from "cesium";
import type { LoadedLayer } from "../ScenarioManager";


/**
 * Initialize NOISE scenario
 * Load noise polygons + apply symbology
 */
export async function initNoiseScenario(viewer: Viewer): Promise<LoadedLayer[]> {
  const loaded: LoadedLayer[] = [];

  try {
    // ----------------------------------------------------
    // 1) Load noise.geojson
    // ----------------------------------------------------
    const noiseData = await GeoJsonDataSource.load("/noise.geojson", {
      clampToGround: true,
    });

    noiseData.name = "Noise Areas";
    viewer.dataSources.add(noiseData);

    // ----------------------------------------------------
    // 2) Apply color symbology
    // ----------------------------------------------------
    applyNoiseSymbology(noiseData);

    // Add to scenario layer list
    loaded.push({
      id: "noise_layer",
      name: "Noise Areas",
      type: "GEOJSON",
      datasource: noiseData,
      visible: true,
    });

    console.log("🔊 Noise scenario loaded");
  } catch (err) {
    console.error("❌ Error loading noise scenario:", err);
  }

  return loaded;
}



/**
 * Color polygons based on NoiseLevel attribute
 * high → red, medium → orange, low → green
 */
function applyNoiseSymbology(dataSource: GeoJsonDataSource) {
  const entities = dataSource.entities.values;

  for (const entity of entities) {
    const props = entity.properties;
    if (!props || !entity.polygon) continue;

    const level = props.NoiseLevel?.getValue(); // attribute from GeoJSON
    let color = Color.GRAY.withAlpha(0.5);

    if (level === "high") color = Color.RED.withAlpha(0.7);
    else if (level === "medium") color = Color.ORANGE.withAlpha(0.7);
    else if (level === "low") color = Color.GREEN.withAlpha(0.7);

    entity.polygon.material = new ColorMaterialProperty(color);
    entity.polygon.outline = new ConstantProperty(false);
  }
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

  viewer?.scene.requestRender();
  return updated;
}

