
import { Viewer, Math as CesiumMath, HeadingPitchRange, Cesium3DTileset } from "cesium";

export const flyToTilesetCustomView = (
  viewer: Viewer,
  tileset: Cesium3DTileset,
  duration: number = 2
) => {  
 if (!tileset?.boundingSphere) {
  console.warn("flyToTilesetCustomView: tileset has no bounding sphere");
  return};

  const bs = tileset.boundingSphere;

  viewer.camera.flyToBoundingSphere(bs, {
    duration,
    offset: new HeadingPitchRange(
      CesiumMath.toRadians(60),   // ← heading (rotate left/right)
      CesiumMath.toRadians(-35),  // ← pitch (camera tilt downward)
      bs.radius * 3.0           // ← distance
    ),
  });
};
