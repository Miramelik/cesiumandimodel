import { Viewer, Cesium3DTileset, Cesium3DTileStyle, ITwinData } from "cesium";

// loads an iModel tileset from Bentley's ITwin platform

export const loadIModelTileset = async (
  viewer: Viewer
): Promise<Cesium3DTileset | null> => {
  const iModelId = process.env.REACT_APP_IMODEL_ID!;
  const tileset = await ITwinData.createTilesetFromIModelId({ iModelId });
  if (tileset) {
    viewer.scene.primitives.add(tileset);
    console.log("✅ iModel tileset loaded");
  }
  return tileset ?? null;
};

//load building tileset from Cesium Ion
export const loadBuildingTileset = async (
  viewer: Viewer, 
): Promise<Cesium3DTileset | null> => {
  const buildingAssetId = 3541172; // Replace with your asset ID
  const buildingTileset = await Cesium3DTileset.fromIonAssetId(buildingAssetId);
  if (buildingTileset) {
    buildingTileset.style = new Cesium3DTileStyle({  
      color: {
        conditions: [
          ["${is_near_busstop} === true", "color('#00FF7F')"],
          ["${is_near_busstop} === 'true'", "color('#00FF7F')"],
          ["${is_near_busstop} === false", "color('#F08080')"],
          ["${is_near_busstop} === 'false'", "color('#F08080')"],
          ["true", "color('#FF6347')"]
        ]
      },
    });
    viewer.scene.primitives.add(buildingTileset);
    console.log("✅ Building tileset loaded");
  }
  return buildingTileset ?? null;
}
