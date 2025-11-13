import React, { useEffect, useRef, useState } from "react";
import { Viewer , ScreenSpaceEventHandler, ScreenSpaceEventType} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import "./style.css";
import { initCesiumViewer } from "./CesiumLoader";
import { loadIonTileset } from "./TilesetComponent";



export const CesiumViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
   


  useEffect(() => {
    const init = async () => {
      if (!containerRef.current) return;

      const viewerInstance = await initCesiumViewer(containerRef.current);
      setViewer(viewerInstance);


      const assetId= 3476879;
      await loadIonTileset (viewerInstance, assetId);

    };

       void init();
    return () => viewer?.destroy();
  }, []);

   return (
    <div style={{ display: "flex",flex:1, height: "100vh" , position: "relative" }}>
    
      <div ref={containerRef} id="cesiumContainer" style={{ flex:1, height:"100%", width: "100%" }} />
      
  
    </div>
  );
};