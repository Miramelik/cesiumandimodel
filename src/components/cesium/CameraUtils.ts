
import { Viewer, Math as CesiumMath, HeadingPitchRange } from "cesium";

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

export const flyToTilesetCustomView = (
  viewer: Viewer,
  tileset: any,
  duration: number = 2
) => {
  const bs = tileset.boundingSphere;

  viewer.camera.flyToBoundingSphere(bs, {
    duration,
    offset: new HeadingPitchRange(
      CesiumMath.toRadians(60),   // ← heading (rotate left/right)
      CesiumMath.toRadians(-35),  // ← pitch (camera tilt downward)
      bs.radius * 2.20            // ← distance
    ),
  });
};
