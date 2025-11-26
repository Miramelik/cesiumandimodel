import { 
  Cesium3DTileset, 
  GeoJsonDataSource, 
  IonResource, 
  BoundingSphere, 
  ClassificationType,
  WebMapServiceImageryProvider,
  ImageryLayer
} from "cesium";

export const loadIonTileset = async (
    viewer: any,
    assetId: number,
    type: "3DTILES" | "GEOJSON",
    name: string    
) => {
    if (!viewer) return null;

    try {
    // ---------------------------
    // 3D TILES (CityGML, IFC...)
    // ---------------------------

        if (type === "3DTILES") {
            const tileset = await Cesium3DTileset.fromIonAssetId(assetId);
            viewer.scene.primitives.add(tileset);

            await (tileset as any).readyPromise;
            
            return {
                id: assetId,
                name,
                type,
                tileset,
                datasource: null,
                imageryLayer: null,
                boundingSphere: tileset.boundingSphere,
                visible: true,
            };
        }    
        // ---------------------
        // GEOJSON (from shapefiles)
        // ---------------------
        if (type === "GEOJSON") {
          const resource = await IonResource.fromAssetId(assetId);
          const datasource = await GeoJsonDataSource.load(resource, {
            clampToGround: true,
          });

         await viewer.dataSources.add(datasource);

           // --- IMPORTANT PART: don't paint on 3D Tiles ---
         datasource.entities.values.forEach((entity: any) => {
           if (entity.polygon) {
             entity.polygon.classificationType = ClassificationType.TERRAIN;
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
            imageryLayer: null,
            boundingSphere,
            visible: true,
          };
        }
        
    return null;    
    }
    catch (err) {
        console.error("Failed to load layer:", err);
        return null;    
    }
};

// ---------------------------
// WMS LAYER LOADER
// ---------------------------
export const loadWMSLayer = async (
  viewer: any,
  url: string,
  layerName: string,
  displayName: string,
  options?: {
    transparent?: boolean;
    format?: string;
    version?: string;
    parameters?: any;
  }
) => {
  if (!viewer) return null;

  try {
    console.log(`[WMS] Loading WMS layer: ${displayName}`);
    console.log(`[WMS] URL: ${url}`);
    console.log(`[WMS] Layer: ${layerName}`);

    // Create WMS imagery provider
    const wmsProvider = new WebMapServiceImageryProvider({
      url: url,
      layers: layerName,
      parameters: {
        transparent: options?.transparent ?? true,
        format: options?.format ?? "image/png",
        version: options?.version ?? "1.3.0",
        ...options?.parameters
      }
    });

    // Type assertion to access readyPromise (it exists at runtime)
    await (wmsProvider as any).readyPromise;

    // Add to viewer as imagery layer
    const imageryLayer = viewer.imageryLayers.addImageryProvider(wmsProvider);
    
    // Set alpha/transparency
    imageryLayer.alpha = 0.7;

    console.log(`[WMS] Successfully loaded: ${displayName}`);

    return {
      id: `wms_${layerName}`,
      name: displayName,
      type: "WMS" as const,
      tileset: null,
      datasource: null,
      imageryLayer: imageryLayer,
      boundingSphere: null,
      visible: true,
    };

  } catch (err) {
    console.error(`[WMS] Failed to load WMS layer ${displayName}:`, err);
    return null;
  }
};