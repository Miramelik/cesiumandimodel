import React, { useEffect, useRef, useState } from "react";
import {
   Viewer ,
   ScreenSpaceEventHandler,
   ScreenSpaceEventType, 
   Cesium3DTileFeature
  } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import "./style.css";
import { initCesiumViewer } from "./CesiumLoader";
import {
  initScenarioForCesium,
  toggleLayerForScenario,
  LoadedLayer,}
  from "../../scenarios/ScenarioManager";


interface CesiumViewerProps {
  currentScenario?: string;
}

export const CesiumViewer: React.FC <CesiumViewerProps> = ({
  currentScenario,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
   const viewerRef = useRef<Viewer | null>(null);
   const [layers,setLayers]=useState<LoadedLayer[]>([])
   const [viewerReady, setViewerReady]= useState(false);
   

/* --------------------------------------------------
   * 1. Init Cesium viewer ONCE
   * -------------------------------------------------- */
  
  
   useEffect(() => {
    const init = async () => {
      if (!containerRef.current) return;

      // creating cesium viewer
      const viewerInstance = await initCesiumViewer(containerRef.current);
      viewerRef.current = viewerInstance;
      
      
      // ADD CLICK HANDLER FOR PICKING
      const handler = new ScreenSpaceEventHandler(viewerInstance.scene.canvas);

      handler.setInputAction(
        (movement: any) => {
          const picked = viewerInstance.scene.pick(movement.position);

          const popup = document.getElementById("infoPopup") as HTMLDivElement;
          if (!popup) return;

          if (!picked) {
            popup.style.display = "none";
            return;
          }

          // Case 1 — 3D Tiles
           if (picked instanceof Cesium3DTileFeature) {
           const props: any = {};

           picked.getPropertyIds().forEach((id: string) => {
             props[id] = picked.getProperty(id);
           });

           popup.style.display = "block";
           popup.innerHTML = `
             <b>3D Tiles Feature</b><br/>
             <pre>${JSON.stringify(props, null, 2)}</pre>
           `;

           return;
         }

          // Case 2 — GeoJSON Entity
          if (picked.id) {
            const entity = picked.id;

            popup.style.display = "block";
            popup.innerHTML = `
              <b>GeoJSON Feature</b><br/>
              ${
              entity.properties
              ? `<pre>${JSON.stringify(entity.properties._propertyNames.map((n: string) => ({
                  [n]: entity.properties[n].getValue()
                })), null, 2)}</pre>`
              : "No attributes"
              }
            `;
            return;
          }

          popup.style.display = "none";
        },
        ScreenSpaceEventType.LEFT_CLICK
      );   

      setViewerReady(true);
    };

      init();
      return () => viewerRef.current?.destroy();
    }, []);


  /* --------------------------------------------------
    * 2. Load Layers when viewer is ready & scenario changes
    * -------------------------------------------------- */
   useEffect(() => {
    if (!viewerReady || !viewerRef.current) return;

    const load = async () => {
       const viewer = viewerRef.current!;
       const newLayers = await initScenarioForCesium(currentScenario, viewer);
       setLayers(newLayers);
    };

    void load();
  }, [viewerReady, currentScenario]); 

  /* --------------------------------------------------
    * 3. Toggle Layer Visibility
    * -------------------------------------------------- */
  
  const toggleLayerVisibility = (index:number)=>{
    setLayers((prev)=>
      toggleLayerForScenario(currentScenario, prev, index, viewerRef.current)
      );  

  };

   return (
  <div
    style={{
      position: "relative",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
    }}
  >

    {/* --- CESIUM VIEWER CONTAINER --- */}
    <div
      ref={containerRef}
      id="cesiumContainer"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />

    {/* --- INFO POPUP --- */}
    <div
      id="infoPopup"
      style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        padding: "10px",
        background: "rgba(0,0,0,0.75)",
        color: "white",
        borderRadius: "6px",
        maxWidth: "300px",
        display: "none",
        zIndex: 2000,
      }}
    ></div>


    {/* --- FLOATING LAYERS PANEL --- */}
    <div
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        padding: "10px",
        width: "220px",
        background: "white",
        borderRadius: "6px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        zIndex: 1000,
      }}
    >
      <h4 style={{ margin: "0 0 10px 0" }}>Layers</h4>

      {layers.map((layer, index) => (
        <div
          key={layer.id}
          style={{
            padding: "6px 8px",
            marginBottom: "6px",
            borderRadius: "4px",
            cursor: "pointer",
            background: "#f5f5f5",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
          >
            {/*layer name = clicking zooms to layer */}
            <span
            style={{ cursor: "pointer" }}
            onClick={() => {
              const viewer = viewerRef.current;
              if (!viewer) return;
              // For 3D Tiles, use custom angled camera
              if (layer.type === "3DTILES" && layer.boundingSphere) {
                viewer.flyTo(layer.tileset, { duration: 1.5 } );
              }
              // For GeoJSON, use viewer.flyTo on the datasource
              if (layer.type === "GEOJSON" && layer.datasource) {
                viewer.flyTo(layer.datasource, { duration: 1.5 });
              }
            }}
         >
           🔍 {layer.name}
         </span>

            {/*Visibility toggle*/}
            <input 
            type="checkbox"
            checked={layer.visible}
            onChange={()=>toggleLayerVisibility(index)}
            />
        </div>
      ))}
    </div>

  </div>
);

};