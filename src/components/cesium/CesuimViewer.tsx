import React, { useEffect, useRef, useState } from "react";
import { Viewer , ScreenSpaceEventHandler, ScreenSpaceEventType} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import "./style.css";
import { ScenarioPanel } from "./ScenarioPanel";
import { flyToTilesetCenter } from "./CameraUtils";
import { loadIModelTileset } from "./TilesetLoader";
import { initCesiumViewer } from "./CesiumLoader";
import { setupAuthentication } from "./AuthHelper";

export const CesiumViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [ iModelTileset, setIModelTileset] = useState<any>(null);
   //const [tileset, setTileset] = useState<any>(null);

    //const [tileset, setTileset] = useState<any>(null);

  //zoom functions
  const zoomToScenario = (viewer: Viewer, target: "iModel") => {
    if (target === "iModel" && iModelTileset) {
      flyToTilesetCenter(viewer, iModelTileset);    
    }
    
  }

  useEffect(() => {
    const init = async () => {
      if (!containerRef.current) return;

      const viewerInstance = await initCesiumViewer(containerRef.current);
      setViewer(viewerInstance);

      const token = await setupAuthentication();
      if (!token) return;

      
      const iModel = await loadIModelTileset(viewerInstance);
     
      if (iModel) setIModelTileset(iModel);
      

        const handler = new ScreenSpaceEventHandler(viewerInstance.scene.canvas);
      handler.setInputAction((click: any) => {
        const picked = viewerInstance.scene.pick(click.position);
        if (picked && picked.getProperty) {
          const elementId = picked.getProperty("element");
          console.log("🔍 Picked element ID:", elementId);
        }
      }, ScreenSpaceEventType.LEFT_CLICK);
    };

       void init();
    return () => viewer?.destroy();
  }, []);

   return (
    <div style={{ display: "flex",flex:1, height: "100vh" , position: "relative" }}>
      <ScenarioPanel
        viewer={viewer}
        iModelTileset={iModelTileset}
       
        //onToggleGeoJson={flyToGeoJsonCenter}
        //onToggleTileset={flyToTilesetCenter}
        
        onZoomTo= {zoomToScenario}
        />
      <div ref={containerRef} id="cesiumContainer" style={{ flex:1, height:"100%", width: "100%" }} />
      
  
    </div>
  );
};