import {
  Viewer,
  Cesium3DTileset,
} from "cesium";
import { SCENARIOS } from "../SCENARIOS";
import { loadIonTileset, loadWMSLayer } from "../../components/cesium/TilesetComponent";
import { flyToTilesetCustomView } from "../../components/cesium/CameraUtils";
import type { LoadedLayer } from "../ScenarioManager";

const IFC_SCENARIO_KEY = "ifc";

/**
 * Initialize IFC scenario:
 *  - loads all IFC + GeoJSON layers from SCENARIOS.ifc.layers
 *  - applies default visibility
 *  - flies to IFC Model 
 */
export async function initIFCScenario(viewer: Viewer): Promise<LoadedLayer[]> {
  const scenario = SCENARIOS[IFC_SCENARIO_KEY];
  const loaded: LoadedLayer[] = [];

  for (const cfg of scenario.layers) {
    let res: any = null;

    // Handle WMS layers
    if (cfg.type === "WMS" && cfg.wmsOptions) {
      const wmsUrl = "https://geoportal.muenchen.de/geoserver/plan/g_fnp/ows";
      
      res = await loadWMSLayer(
        viewer,
        wmsUrl,
        cfg.wmsOptions.layers,
        cfg.name,
        cfg.wmsOptions.parameters
      );
    } 
    // Handle 3D Tiles and GeoJSON
    else if (cfg.type === "3DTILES" || cfg.type === "GEOJSON") {
      res = await loadIonTileset(
        viewer,
        cfg.id as number,
        cfg.type,
        cfg.name
      );
    }

    if (!res) continue;
    

    const visible = cfg.visible ?? false;

    if (res.tileset) res.tileset.show = visible;
    if (res.datasource) res.datasource.show = visible;
    if (res.imageryLayer) res.imageryLayer.show = visible;

    loaded.push({
      ...cfg,
      tileset: res.tileset ?? undefined,
      datasource: res.datasource ?? undefined,
      imageryLayer: res.imageryLayer ?? undefined,
      boundingSphere: res.boundingSphere,
      visible,
    });
  }

  // Fly to IFC Model 1
  const ifcModel = loaded.find((l) => l.name === "IFC Model" && l.tileset);
  if (ifcModel?.tileset) {
    await (ifcModel.tileset as any).readyPromise;
    flyToTilesetCustomView(viewer, ifcModel.tileset, 1.5);
  }

  console.log(`[IFCScenario] Loaded ${loaded.length} layers`);
  return loaded;
}

/**
 * Toggle visibility + special IFC rule:
 *  - When IFC Model 6 is ON → all other IFC Models OFF
 *  - When any other IFC Model is ON → IFC Model 6 OFF
 */
export function toggleIFCLayer(
  layers: LoadedLayer[],
  index: number,
  viewer: Viewer | null
): LoadedLayer[] {
  const updated = layers.map((l) => ({ ...l }));
  const clicked = updated[index];
  if (!clicked) return layers;

  // Toggle this one
  clicked.visible = !clicked.visible;
  if (clicked.tileset) clicked.tileset.show = clicked.visible;
  if (clicked.datasource) clicked.datasource.show = clicked.visible;
  if (clicked.imageryLayer) clicked.imageryLayer.show = clicked.visible;

  // Special rules
  if (clicked.name === "IFC Model 6" && clicked.visible) {
    updated.forEach((layer) => {
      if (
        layer.name.startsWith("IFC Model") &&
        layer.name !== "IFC Model 6" &&
        layer.tileset
      ) {
        layer.visible = false;
        layer.tileset.show = false;
      }
    });
  }

  if (
    clicked.name.startsWith("IFC Model") &&
    clicked.name !== "IFC Model 6" &&
    clicked.visible
  ) {
    updated.forEach((layer) => {
      if (layer.name === "IFC Model 6" && layer.tileset) {
        layer.visible = false;
        layer.tileset.show = false;
      }
    });
  }

  viewer?.scene.requestRender();
  return updated;
}
