import { Cesium3DTileset, GeoJsonDataSource, IonResource, BoundingSphere, ClassificationType} from "cesium";

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
                datasource:null,
                boundingSphere:tileset.boundingSphere,
                visible:true,
            };
        }    
        // ---------------------
        // GEOJSON (from shapefiles)
        // ---------------------
        if (type === "GEOJSON") {
          const resource = await IonResource.fromAssetId(assetId);
          const datasource = await GeoJsonDataSource.load(resource, {
            clampToGround:true,
          });

         await viewer.dataSources.add(datasource);

           // --- IMPORTANT PART: don't paint on 3D Tiles ---
         datasource.entities.values.forEach((entity: any) => {
           if (entity.polygon) {
             entity.polygon.classificationType = ClassificationType.TERRAIN; // ← key line
           }

             // POLYLINES
           if (entity.polyline) {
             entity.polyline.clampToGround = true;
             entity.polyline.classificationType = ClassificationType.TERRAIN;
             entity.polyline.depthFailMaterial = entity.polyline.material;
           }

           
         });

           // Compute a bounding sphere manually
        const positions: any[] = [];
        datasource.entities.values.forEach((e: any) => {
          const p = e.position?.getValue(viewer.clock.currentTime);
          if (p) positions.push(p);
        });

         const boundingSphere = 
         positions.length > 0 ?
           BoundingSphere.fromPoints(positions) : null;
         



          return {
            id: assetId,
            name,
            type,
            tileset: null,
            datasource,
            boundingSphere,
            visible: true,
          };
        }
        
    return null;    
    }
    catch (err){
        console.error ("Failed to load 3D Tiles:", err);
        return null;    
    }

 };
    
