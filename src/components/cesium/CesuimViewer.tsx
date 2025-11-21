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
  ScenarioManager,
  type ScenarioId,
  type LoadedLayer,
  }
  from "../../scenarios/ScenarioManager";

  import {
    updateBusBufferRadius,
    getBusStats,
    type BusStats,
  } from "../../scenarios/bus/BusScenario";

  import { ScenarioToolbar } from "../../scenarios/ScenarioToolbar";
import { on } from "events";


interface CesiumViewerProps {
  currentScenario?: string;
  onScenarioChange?: (id: string) => void;
}

export const CesiumViewer: React.FC <CesiumViewerProps> = ({
  currentScenario,
  onScenarioChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
   const viewerRef = useRef<Viewer | null>(null);
   const [layers,setLayers]=useState<LoadedLayer[]>([])
   const [viewerReady, setViewerReady]= useState(false);

   //Bus specific state
   const [bufferRadius, setBufferRadius]= useState<number>(400); //meters
   const [busStats, setBusStats]= useState<BusStats |null>(null);
   

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
          if ((picked as any).id) {
            const entity = (picked as any).id;

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

    const loadScenario = async () => {
       const viewer = viewerRef.current!;
       const scenarioId=currentScenario as ScenarioId;

       const newLayers = await ScenarioManager.loadScenario(scenarioId, viewer);
       setLayers(newLayers);

       if (currentScenario==="bus") {
        setBufferRadius(400); //reset to default
        setBusStats(await getBusStats());
       } else {
        setBusStats(null);
       }

    };

    void loadScenario();
  }, [viewerReady, currentScenario]); 

  /* --------------------------------------------------
    * 3. Toggle Layer Visibility
    * -------------------------------------------------- */
  
  const toggleLayerVisibility = (index:number)=>{
    if (!viewerRef.current) return;

    setLayers((prev)=> {
       const updated = [...prev];
      const clicked = updated[index];

      if (!clicked) return prev;

      clicked.visible = !clicked.visible;

      if (clicked.tileset) clicked.tileset.show = clicked.visible;
      if (clicked.datasource) clicked.datasource.show = clicked.visible;

      viewerRef.current?.scene.requestRender();

      return updated;
    }); 
        
  };

    /* --------------------------------------------------
   * 4. Bus buffer slider handler
   * -------------------------------------------------- */
  const handleBusRadiusChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newRadius = Number(e.target.value);
    setBufferRadius(newRadius);

    if (currentScenario === "bus" && viewerRef.current) {
      await updateBusBufferRadius(newRadius);
      setBusStats(getBusStats());
    }
  };

    /* --------------------------------------------------
   * 4. JSX Layout
   * -------------------------------------------------- */

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
        right: "20px",
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
        top: "150px",
        right: "15px",
        width: "260px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        zIndex: 1000,
      }}
    >

      {
        onScenarioChange && currentScenario && (
          <ScenarioToolbar
          currentScenario={currentScenario} 
          onScenarioChange={onScenarioChange}
          />
        )     

      }

       {/* === LAYERS BOX === */}
      <div
        style={{
          padding: "10px",
          background: "white",
          borderRadius: "6px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
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
              if (layer.type === "3DTILES" && layer.tileset) {
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


    {/* --- BUS-SPECIFIC UI: BUFFER + STATS --- */}
      {currentScenario === "bus" && (
        <div
          style={{
               padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.9rem",
          }}
        >
          <strong>Bus Buffer Settings</strong>
          <div style={{ marginTop: "8px" }}>
            <label htmlFor="busBufferRange">Radius (m): </label>
            <input
              id="busBufferRange"
              type="range"
              min={400}
              max={800}
              step={100}
              value={bufferRadius}
              onChange={handleBusRadiusChange}
              style={{ width: "100%" }}
            />
            <div style={{ textAlign: "right", marginTop: "2px" }}>
              <b>{bufferRadius}</b> m
            </div>
          </div>

          <hr/>

          <strong>Bus Stop Stats</strong>

          <div style={{ marginTop: "4px" }}>
            <div>Total: <b>{busStats?.total ?? 0}</b></div>
            <div>Inside buffer: <b>{busStats?.inside ?? 0}</b></div>
            <div>Outside buffer: <b>{busStats?.outside ?? 0}</b></div>
            <div>Coverage: <b>{busStats?.coveragePercent ?? 0}%</b></div>
            </div>
          </div>        
      )}
  </div>
  </div>

);
};

