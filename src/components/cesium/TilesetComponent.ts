import { Cesium3DTileset } from "cesium";

export async function loadIonTileset(viewer:any, assetId:number) {
    if (!viewer) return null;

    try {
        const tileset= await Cesium3DTileset.fromIonAssetId(assetId);

        viewer.scene.primitives.add(tileset);

        await viewer.zoomTo (tileset);

        return tileset;
    }
    catch (err){
        console.error ("Failed to load 3D Tiles:", err);
        return null;
    }
    }
    
