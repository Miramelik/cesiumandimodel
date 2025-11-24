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
    setOnBufferUpdated,
    type BusStats,
  } from "../../scenarios/bus/BusScenario";

  import {
    getNoiseStats,
    type NoiseStats,
  } from "../../scenarios/noise/NoiseScenario";

  import { ScenarioToolbar } from "../../scenarios/ScenarioToolbar";
import { SCENARIOS } from "../../scenarios/SCENARIOS";
import { flyToTilesetCustomView } from "./CameraUtils";


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
   const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);

   //Bus specific state
   const [bufferRadius, setBufferRadius]= useState<number>(400); //meters
   const [busStats, setBusStats]= useState<BusStats |null>(null);
   const [noiseStats, setNoiseStats]= useState<NoiseStats |null>(null);
   

/* --------------------------------------------------
   * 1. Init Cesium viewer ONCE
   * -------------------------------------------------- */
  
  
   useEffect(() => {
    const init = async () => {
      if (!containerRef.current || viewerRef.current) return;

      try {
        
              // creating cesium viewer
              const viewerInstance = await initCesiumViewer(containerRef.current);
              viewerRef.current = viewerInstance;
              
              
              // ADD CLICK HANDLER FOR PICKING
              const handler = new ScreenSpaceEventHandler(viewerInstance.scene.canvas);
              handlerRef.current = handler;
        
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
              console.log("✅ Cesium viewer initialized");
            } catch (error) {
              console.error("❌ Error initializing Cesium viewer:", error);
            }

    };

      init();
      return () =>{
        if (handlerRef.current) {
      handlerRef.current.destroy();
      handlerRef.current = null;  
        }
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }
      };
      
    }, []);


  /* --------------------------------------------------
    * 2. Load Layers when viewer is ready & scenario changes
    * -------------------------------------------------- */
   useEffect(() => {
    if (!viewerReady || !viewerRef.current || !currentScenario) return;

    const viewer = viewerRef.current;

    const loadScenario = async () => {
       const scenarioId=currentScenario as ScenarioId;
       const scenarioDef= SCENARIOS[scenarioId];
       if (!scenarioDef) return;

        console.log(`🔄 Loading scenario: ${scenarioId}`);



       layers.forEach((layer) => {

        try {
          // Clean up existing layers
          if (layer.tileset) {
            viewer.scene.primitives.remove(layer.tileset);
          }
          if (layer.datasource) {
            viewer.dataSources.remove(layer.datasource);
          }
        }
        catch (error) {
          console.error("Error removing layer:", error);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100)); //wait a tick

       const newLayers = await ScenarioManager.loadScenario(scenarioId, viewer);
       setLayers(newLayers);

       // Build a flat array of Cesium objects (tilesets or dataSources)
       const cesiumObjects = newLayers
         .map(l => l.tileset || l.datasource)
         .filter(Boolean) as any[];

       if (cesiumObjects.length > 0) {
        try {
          if (scenarioDef.options?.cameraPreset === "iso" && newLayers.some(l => l.tileset)) {
            // find first tileset from loaded layers
            const firstTileset = newLayers.find(l => l.tileset)?.tileset;
            if (firstTileset) {
              await (firstTileset as any).readyPromise;
              flyToTilesetCustomView(viewer, firstTileset, 2);
            }
          } else {
            await viewer.flyTo(cesiumObjects, { duration: 2 });
          }
        }
        catch (error) {
          console.error("Error during initial camera flyTo:", error);
        }
       }

       if (currentScenario==="bus") {
        setBufferRadius(400); //reset to default
        setBusStats(await getBusStats());

        setOnBufferUpdated((datasource, radius)=> {
          console.log("Buffer updated callback triggered", radius);
        setLayers((prevLayers)=> {
          const updated = prevLayers.map((layer)=> {
            if (layer.id === "bus_buffer") {
              return {
                ...layer,
                name: `Buffer (${radius}m)`,
                datasource: datasource,
              };
            }
            return layer;
          });
          return updated;
        });
        });
       } else if (currentScenario==="noise") {
        setNoiseStats(await getNoiseStats());

        const statsInterval = setInterval (()=> {
          setNoiseStats(getNoiseStats());
        }, 1500);
        
        return () => clearInterval(statsInterval);

       }
       else {
        setBusStats(null);
        setNoiseStats(null);
       }
       console.log(`✅ Scenario loaded: ${scenarioId}, ${newLayers.length} layers`);
    };

     loadScenario().catch((error) => {
      console.error("Error loading scenario:", error);
    });
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
        padding: "20px",
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
        top: "100px",
        right: "15px",
        width: "260px",
        marginRight: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
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
          key={`layer-${String(layer.id)}-${layer.name}-${index}`}
          style={{
            padding: "6px 10px",
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
        <>
        {/*Description Panrl*/}
        <div
          style={{
               padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.85rem",
          }}
        >
          <strong style={{ fontSize: "0.95rem" }}>Description</strong>
          <div style={{ marginTop: "6px", lineHeight: "1.4", color: "#555" }}>
            {SCENARIOS.bus.description}
          </div>
        </div>

         {/* Buffer Settings */}
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
        </div>

        {/* Building Statistics */}
        <div
          style={{
            padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.9rem",
          }}
        >
          <strong>Bus Stop Stats</strong>
          <div style={{ marginTop: "8px" }}>
            <div>Total: <b>{busStats?.total ?? 0}</b></div>
            <div style={{ marginTop: "4px" }}>Inside buffer: <b>{busStats?.inside ?? 0}</b></div>
            <div style={{ marginTop: "4px" }}>Outside buffer: <b>{busStats?.outside ?? 0}</b></div>
            <div style={{ marginTop: "4px" }}>Coverage: <b>{busStats?.coveragePercent ?? 0}%</b></div>
           </div>
          </div>        

          {/* Bus Legend */}
        <div
          style={{
            padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.9rem",
          }}
        >
          <strong>Legend</strong>
          <div style={{ marginTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#00aa00", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Inside buffer</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#cc0000", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Outside buffer</span>
            </div>
          </div>
        </div>
      </>
    )}
      

       {/* === NOISE SCENARIO UI === */}
{currentScenario === "noise" && noiseStats && (
  <>
    {/* Description Panel */}
        <div
          style={{
            padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.85rem",
          }}
        >
          <strong style={{ fontSize: "0.95rem" }}>Description</strong>
          <div style={{ marginTop: "6px", lineHeight: "1.4", color: "#555" }}>
            {SCENARIOS.noise.description}
          </div>
        </div>

        {/* Building Statistics */}
        <div
          style={{
            padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.9rem",
          }}
        >


      <strong>Building Statistics</strong>
          <div style={{ marginTop: "8px" }}>
            <div>Total buildings: <b>{noiseStats.total}</b></div>
            <div style={{ marginTop: "4px" }}>High noise zone: <b>{noiseStats.insideHigh}</b></div>
            <div style={{ marginTop: "4px" }}>Medium noise zone: <b>{noiseStats.insideMedium}</b></div>
            <div style={{ marginTop: "4px" }}>Low noise zone: <b>{noiseStats.insideLow}</b></div>
            <div style={{ marginTop: "4px" }}>Outside noise zones: <b>{noiseStats.outsideHigh}</b></div>
            <div style={{ marginTop: "4px" }}>High noise coverage: <b>{noiseStats.coveragePercent}%</b></div>
          </div>
        </div>

     {/* Noise Legend */}
        <div
          style={{
            padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.9rem",
          }}
        >
      <strong>Legend</strong>
          <div style={{ marginTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#cc0000", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>High noise</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#ff8800", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Medium noise</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#00aa00", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Low noise</span>
            </div>
          </div>
        </div>
      </>
    )}
  </div>
  </div>

);
};