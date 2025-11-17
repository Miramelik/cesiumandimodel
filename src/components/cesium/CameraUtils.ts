
import { Viewer, Math as CesiumMath, HeadingPitchRange } from "cesium";

export const flyToTilesetCustomView = (
  viewer: Viewer,
  layer:any,  
  duration: number = 2
) => {

 if (!layer?.boundingSphere) return;
  const bs = layer.boundingSphere;

  viewer.camera.flyToBoundingSphere(bs, {
    duration,
    offset: new HeadingPitchRange(
      CesiumMath.toRadians(60),   // ← heading (rotate left/right)
      CesiumMath.toRadians(-35),  // ← pitch (camera tilt downward)
      bs.radius * 2.20            // ← distance
    ),
  });
};
