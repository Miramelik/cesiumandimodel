import { Viewer, Math as CesiumMath } from "cesium";

export const flyToGeoJsonCenter = async (viewer: Viewer,geoJsonSource: any) => {
  const Cesium = await import("cesium");
  const positions:any[] = [];

  geoJsonSource.entities.values.forEach((entity: any) => {
    if (entity.position && entity.position.getValue) {
      const pos = entity.position.getValue(viewer.clock.currentTime);
      if (pos) positions.push(pos);
    }
  });

  if (positions.length === 0) return;
  
    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 2,
    offset: {
      heading: viewer.camera.heading,
      pitch: CesiumMath.toRadians(-45),
      range: boundingSphere.radius * 2,
    },

  
  });
};

export const flyToTilesetCenter = async (viewer: Viewer, tileset: any) => {
  const boundingSphere = tileset.boundingSphere;
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 2,
    offset: {
      heading: viewer.camera.heading,
      pitch: CesiumMath.toRadians(-45),
      range: boundingSphere.radius * 2,
    },
  });
};
