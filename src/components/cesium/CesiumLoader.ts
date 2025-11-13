import { Ion, Clock, ClockViewModel, Viewer, CesiumTerrainProvider, Cartesian3, Rectangle } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import CesiumNavigation from "cesium-navigation-es6";

// >>> ADD THIS LINE: <<<
(window as any).CESIUM_BASE_URL = `${process.env.PUBLIC_URL || ""}/cesium/`;

export const initCesiumViewer = async (container: HTMLDivElement): Promise <Viewer> => {
  Ion.defaultAccessToken = process.env.REACT_APP_ION_TOKEN!;
  const terrain = await CesiumTerrainProvider.fromIonAssetId(1);
  
  const clock = new Clock();
  const clockViewModel = new ClockViewModel(clock);

  const viewer = new Viewer(container, {
    terrainProvider: terrain,
    //clockViewModel,
    //animation: true,
    timeline: true,
    //baseLayerPicker: false,
   // geocoder: true,
    //homeButton: true,
    sceneModePicker: true,
    navigationHelpButton: true,
    //fullscreenButton: true,
    //scene3DOnly: true,
    shouldAnimate: true,
  });
  new CesiumNavigation(viewer, {
    defaultResetView: Rectangle.fromDegrees(11.5, 48.1, 11.6, 48.2),
    enableCompass: true,
    enableZoomControls: true,
   
  });
  viewer.scene.globe.show= true;
  viewer.scene.debugShowFramesPerSecond = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  (viewer.animation.container as HTMLElement).style.bottom = "40px";

  return viewer;
};
