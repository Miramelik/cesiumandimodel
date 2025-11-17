import { Cesium3DTileset, Viewer } from "cesium";

export const loadIonTileset = async (
    viewer:any,
    assetId:number,
     type: "3DTILES" | "GEOJSON",
     name:string    
    ) => {
    if (!viewer) return null;

    try {
    // ---------------------------
    // 3D TILES (CityGML, IFC...)
    // ---------------------------

        if (type==="3DTILES") {
            const tileset= await Cesium3DTileset.fromIonAssetId(assetId);
            viewer.scene.primitives.add(tileset);

            await (tileset as any).readyPromise;
            //await flyToTilesetCenter(viewer, tileset);
            
            //update home button / reset view to tileset

            return {
                id:assetId,
                name,
                type,
                tileset,
                visible:true,
            };
        }    
              
    
    return null;    
    }
    catch (err){
        console.error ("Failed to load 3D Tiles:", err);
        return null;    
    }

 };
    
