import React, { useEffect, useRef, useState } from "react";
import {
   Viewer ,
   ScreenSpaceEventHandler,
   ScreenSpaceEventType, 
   Cesium3DTileFeature, 
   Color as CesiumColor,
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
  
  import {
    getEnergyStats,
    applyEnergyVisualization,
    getEnergyLegend,
    type EnergyStats,
  } from "../../scenarios/energy/EnergyScenario";

import { ScenarioToolbar } from "../../scenarios/ScenarioToolbar";
import { SCENARIOS } from "../../scenarios/SCENARIOS";
import { flyToTilesetCustomView } from "./CameraUtils";
import { IFCElementStats } from "../../scenarios/ifc/IFCElementQuery";

interface CesiumViewerProps {
  currentScenario?: string;
  onScenarioChange?: (id: string) => void;
  ifcStats ?: IFCElementStats | null;
}

export const CesiumViewer: React.FC <CesiumViewerProps> = ({
  currentScenario,
  onScenarioChange,
  ifcStats,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
   const viewerRef = useRef<Viewer | null>(null);
   const [layers,setLayers]=useState<LoadedLayer[]>([])
   const [viewerReady, setViewerReady]= useState(false);
   const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
   const highlightedFeatureRef = useRef<{
     feature: any;
     originalColor: any;
    } | null>(null);

   //Bus specific state
   const [bufferRadius, setBufferRadius]= useState<number>(400); //meters
   const [busStats, setBusStats]= useState<BusStats |null>(null);
   const [noiseStats, setNoiseStats]= useState<NoiseStats |null>(null);
   const [energyStats, setEnergyStats] = useState<EnergyStats | null>(null);
   const [energyVisualization, setEnergyVisualization] = useState<string>("default");
   

/* --------------------------------------------------
   * 1. Init Cesium viewer ONCE
   * -------------------------------------------------- */
  
  
  useEffect(() => {
  
    if (!containerRef.current || viewerRef.current) return;

    const init = async () => {
      console.log("🚀 Initializing Cesium viewer...");
      // creating cesium viewer
      const viewerInstance = await initCesiumViewer(containerRef.current!);
      viewerRef.current=viewerInstance;
      setViewerReady(true);
    };
    init();
     return () => {
       if (viewerRef.current) {
         viewerRef.current.destroy();
         viewerRef.current = null;
       }
  };
  }, []);

    useEffect(()=>{
      if (!viewerReady ||!viewerRef.current) return;

      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current= null;
      }

      const viewer = viewerRef.current;
      // Setup hover interaction handler
      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      handlerRef.current=handler;

       // MOUSE_MOVE for hover with yellow highlight
        handler.setInputAction(
          (movement: any) => {
            const popup = document.getElementById("infoPopup") as HTMLDivElement;
            if (!popup) return;

            // Reset previous highlight
            if (highlightedFeatureRef.current?.feature) {
              try {
                highlightedFeatureRef.current.feature.color = highlightedFeatureRef.current.originalColor;
              } catch (e) {
                console.warn("Failed to reset color:", e);
              }
              highlightedFeatureRef.current = null;
            }

            const pickedFeature = viewer.scene.pick(movement.endPosition);

            // Check if we picked a 3D Tile feature
            if (
              pickedFeature &&
              pickedFeature instanceof Cesium3DTileFeature &&
              typeof pickedFeature.getProperty === 'function'
            ) {
              // Store original color
              const originalColor = new CesiumColor();
              try {
                CesiumColor.clone(pickedFeature.color, originalColor);
              } catch (e) {
                 console.warn("Failed to clone color:", e);
              }

              // Highlight in yellow
              try {
                pickedFeature.color = CesiumColor.YELLOW;
              } catch (e) {
                 console.warn("Failed to set yellow color:", e);
              }

              highlightedFeatureRef.current = {
                feature: pickedFeature,
                originalColor: originalColor,
              };

              // Get scenario-specific info
              let infoHtml = "";

              console.log("🎯 Current Scenario:", currentScenario); 

              if (currentScenario === "energy") {
                // Energy scenario - show calculated metrics
                 console.log("⚡ Displaying energy info");

                 const gmlId = pickedFeature.getProperty("gml:id") || "N/A";
                 const volume = Number(pickedFeature.getProperty("calculated_volume")) || 0;
                 const energy = Number(pickedFeature.getProperty("calculated_energy")) || 0;
                 const cost = energy * 0.40;
                 const co2 = energy * 0.31;

                infoHtml = `
                <div style="line-height: 1.8;">
                  <b style="color: #3498db;">Energy Analysis</b><br>
                  <b>GML ID:</b> ${gmlId.length > 25 ? gmlId.substring(0, 25) + '...' : gmlId}<br>
                  <b>Volume:</b> ${volume.toFixed(2)} m³<br>
                  <b>Energy Demand:</b> ${energy.toFixed(0)} kWh/year<br>
                  <b>Annual Cost:</b> €${cost.toFixed(2)}<br>
                  <b>CO₂ Emissions:</b> ${co2.toFixed(2)} kg/year
                </div>
                `;
              } else if (currentScenario === "bus") {
                // Bus scenario
                console.log("🚌 Displaying bus info");

                const gmlId = pickedFeature.getProperty("gml:id") || "N/A";
                const nearBusStop = pickedFeature.getProperty("is_near_busstop");

                let statusText = "Unknown";
                let statusColor = "#888";

                if (nearBusStop === true) {
                statusText = "✓ Yes";
                statusColor = "#2ecc71";
              } else if (nearBusStop === false) {
                statusText = "✗ No";
                statusColor = "#e74c3c";
              }  


                 infoHtml = `
                <div style="line-height: 1.8;">
                  <b style="color: #f39c12;">Bus Stop Analysis</b><br>
                  <b>Building ID:</b> ${gmlId.length > 25 ? gmlId.substring(0, 25) + '...' : gmlId}<br>
                  <b>Near Bus Stop:</b> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                </div>
              `;

              } else if (currentScenario === "noise") {
                // Noise scenario

                console.log("🔊 Displaying noise info");

                const gmlId = pickedFeature.getProperty("gml:id") || "N/A";
              const noiseLevel = pickedFeature.getProperty("noise_level") || "unknown";
              
              let displayLevel = noiseLevel.charAt(0).toUpperCase() + noiseLevel.slice(1);
              let levelColor = "#888";
              
              if (noiseLevel === "high") {
                levelColor = "#e74c3c";
              } else if (noiseLevel === "medium") {
                levelColor = "#f39c12";
              } else if (noiseLevel === "low") {
                levelColor = "#2ecc71";
              }

              infoHtml = `
                <div style="line-height: 1.8;">
                  <b style="color: #9b59b6;">Noise Analysis</b><br>
                  <b>Building ID:</b> ${gmlId.length > 25 ? gmlId.substring(0, 25) + '...' : gmlId}<br>
                  <b>Noise Level:</b> <span style="color: ${levelColor}; font-weight: bold;">${displayLevel}</span>
                </div>
              `;

              } else if (currentScenario === "ifc") {
                // IFC scenario

                console.log("🏗️ Displaying IFC info");

                 const gmlId = pickedFeature.getProperty("gml:id") || "N/A";
              
              infoHtml = `
                <div style="line-height: 1.8;">
                  <b style="color: #1abc9c;">IFC Model</b><br>
                  <b>Building ID:</b> ${gmlId.length > 25 ? gmlId.substring(0, 25) + '...' : gmlId}
                </div>
              `;

              } else {
                // Default
                console.log("📋 Displaying default info");
              const gmlId = pickedFeature.getProperty("gml:id") || "N/A";
              
              infoHtml = `
                <div style="line-height: 1.8;">
                  <b>Building Information</b><br>
                  <b>Building ID:</b> ${gmlId.length > 25 ? gmlId.substring(0, 25) + '...' : gmlId}
                </div>
              `;
              }

              // Position and show popup
              popup.style.left = movement.endPosition.x + 15 + "px";
            popup.style.top = movement.endPosition.y + 15 + "px";
            popup.style.display = "block";
            popup.innerHTML = infoHtml;
            } else {
              // No feature picked - hide popup
              popup.style.display = "none";
            }
          },    
  
       
          ScreenSpaceEventType.MOUSE_MOVE
        );
    
      
    }, [currentScenario, viewerReady]);


    useEffect (()=>{
      if (!viewerReady || !viewerRef.current) return;

      const viewer = viewerRef.current;

      const resizeTimeout = setTimeout(() =>{
        viewer.resize();
        viewer.scene.requestRender();
      }, 150);

      return() => clearTimeout(resizeTimeout);
    }, [currentScenario, viewerReady]);


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

          if (layer.imageryLayer) {
            viewer.imageryLayers.remove(layer.imageryLayer);
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
       else if (currentScenario === "energy") {
         setEnergyStats(getEnergyStats());
         
         const statsInterval = setInterval(() => {
           setEnergyStats(getEnergyStats());
         }, 1500);
         
         return () => clearInterval(statsInterval);
        }
       else {
        //setBusStats(null);
        // setNoiseStats(null);
        // setEnergyStats(null);
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
    if (!viewerRef.current || !currentScenario) return;

    if (currentScenario === "ifc") {
      setLayers ((prev)=>
      ScenarioManager.toggleIFCLayer (prev, index, viewerRef.current)
    );
    return;
    }

     // Special handling for BUS scenario
  if (currentScenario === "bus") {
    // Perform async work outside the setState functional updater
    (async () => {
      const updated = [...layers];
      const clicked = updated[index];

      if (!clicked) return;

      clicked.visible = !clicked.visible;

      // Handle buffer layer - create it if needed when toggled on
      if (clicked.id === "bus_buffer") {
        if (clicked.visible){
          const { createBusBufferIfNeeded, getBufferDataSource } = await import(
            "../../scenarios/bus/BusScenario"
          );
  
          await createBusBufferIfNeeded();
  
          // Get the newly created datasource
          const bufferDS = getBufferDataSource();
          if (bufferDS) {
            clicked.datasource = bufferDS;
            clicked.datasource.show = true;
          }
        }
        else {
          const {resetBuildingToNeutral} = await import (
            "../../scenarios/bus/BusScenario"
          );

          resetBuildingToNeutral();
          if (clicked.datasource){
            clicked.datasource.show=false;
          }
        }
      } else if (clicked.datasource) {
        clicked.datasource.show = clicked.visible;
      }

      if (clicked.tileset) {
        clicked.tileset.show = clicked.visible;
      }

      viewerRef.current?.scene.requestRender();

      setLayers(updated);
    })();
    return;
  }



    setLayers ((prev) => {
      const updated = [...prev];
      const clicked = updated[index];

      if  (!clicked) return prev;

      clicked.visible = !clicked.visible;

      if (clicked.tileset) clicked.tileset.show = clicked.visible;
      if (clicked.datasource) clicked.datasource.show = clicked.visible;

      viewerRef.current?.scene.requestRender();

      return updated;
    })

   
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

    <div 
            id="infoPopup" 
            style={{
              position: "absolute",
              backgroundColor: "rgba(0, 0, 0, 0.85)",
              color: "white",
              border: "1px solid rgba(52, 152, 219, 0.5)",
              borderRadius: "6px",
              padding: "10px 14px",
              display: "none",
              pointerEvents: "none",
              zIndex: 10000,
              fontSize: "13px",
              lineHeight: "1.8",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
              minWidth: "200px",
              maxWidth: "300px",
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
                flyToTilesetCustomView(viewer, layer.tileset, 1.5);
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

    {/* === ENERGY SCENARIO UI === */}
{currentScenario === "energy" && (
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
        {SCENARIOS.energy.description}
      </div>
    </div>

    {/* Visualization Controls */}
    <div
      style={{
        padding: "10px",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        fontSize: "0.9rem",
      }}
    >
      <strong>Visualization Mode</strong>
      <select
        value={energyVisualization}
        onChange={(e) => {
          const mode = e.target.value as any;
          setEnergyVisualization(mode);
          applyEnergyVisualization(mode);
        }}
        style={{
          width: "100%",
          marginTop: "8px",
          padding: "6px",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
      >
        <option value="default">Default (No coloring)</option>
        <option value="solar">Solar Suitability</option>
        <option value="height">Building Height</option>
        <option value="storeys">Number of Storeys</option>
        <option value="function">Building Function</option>
        <option value="energy">Energy Demand</option>
      </select>
    </div>

    {/* Energy Statistics */}
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
        {energyStats ? (
          <>
            <div>Total buildings: <b>{energyStats.totalBuildings.toLocaleString()}</b></div>
            <div style={{ marginTop: "4px" }}>Total volume: <b>{(energyStats.totalVolume / 1000000).toFixed(2)}M m³</b></div>
            <div style={{ marginTop: "4px" }}>Total surface: <b>{(energyStats.totalSurface / 1000).toFixed(1)}K m²</b></div>
            <div style={{ marginTop: "4px" }}>Flat roofs: <b>{energyStats.flatRoofCount} ({energyStats.flatRoofPercent}%)</b></div>
            <div style={{ marginTop: "4px" }}>Avg. height: <b>{energyStats.avgHeight.toFixed(1)} m</b></div>
            <div style={{ marginTop: "4px" }}>Avg. storeys: <b>{energyStats.avgStoreys.toFixed(1)}</b></div>
          </>
        ) : (
          <div style={{ color: "#999", fontStyle: "italic" }}>
            Loading statistics...
          </div>
        )}
      </div>
    </div>

    {/* Energy Metrics */}
    <div
      style={{
        padding: "10px",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        fontSize: "0.9rem",
      }}
    >
      <strong>Energy Analysis</strong>
      <div style={{ marginTop: "8px" }}>
        {energyStats ? (
          <>
            <div>Energy demand: <b>{(energyStats.totalEnergyDemand / 1000000).toFixed(2)}M kWh/year</b></div>
            <div style={{ marginTop: "4px" }}>Annual cost: <b>€{(energyStats.annualCost / 1000000).toFixed(2)}M</b></div>
            <div style={{ marginTop: "4px" }}>CO₂ emissions: <b>{(energyStats.co2Emissions / 1000000).toFixed(2)}M kg/year</b></div>
          </>
        ) : (
          <div style={{ color: "#999", fontStyle: "italic" }}>
            Calculating energy metrics...
          </div>
        )}
      </div>
    </div>

    {/* Legend */}
    {(() => {
      const legend = getEnergyLegend();
      if (!legend) return null;
      
      return (
        <div
          style={{
            padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.9rem",
          }}
        >
          <strong>{legend.title}</strong>
          <div style={{ marginTop: "8px" }}>
            {legend.items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
                <div style={{
                  width: "14px",
                  height: "14px",
                  background: item.color,
                  borderRadius: "3px",
                  marginRight: "8px",
                }}></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    })()}
  </>
)}

    {/* === IFC SCENARIO UI - DISPLAY ELEMENT STATS === */}
    {currentScenario === "ifc" && (
      <>
        <div
          style={{
            padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.85rem",
          }}
        >
          <strong>Description</strong>
          <div style={{ marginTop: "6px", color: "#555" }}>
            {SCENARIOS.ifc.description}
          </div>
        </div>

        {/* IFC Stats */}
        <div
          style={{
            padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.9rem",
          }}
        >
          <strong>IFC Element Statistics</strong>
          <div style={{ marginTop: "8px" }}>
            {ifcStats ? (
              <>
                <div style={{ marginTop: "4px" }}>Walls: <b>{ifcStats.walls}</b></div>
                <div style={{ marginTop: "4px" }}>Doors: <b>{ifcStats.doors}</b></div>
                <div style={{ marginTop: "4px" }}>Windows: <b>{ifcStats.windows}</b></div>
                <div style={{ marginTop: "4px" }}>Slabs: <b>{ifcStats.slabs}</b></div>
                <div style={{ marginTop: "4px" }}>Columns: <b>{ifcStats.columns}</b></div>
                <div style={{ marginTop: "4px" }}>Beams: <b>{ifcStats.beams}</b></div>
                <div style={{ marginTop: "4px" }}>Spaces: <b>{ifcStats.spaces}</b></div>
                <div style={{ marginTop: "4px" }}>Furniture: <b>{ifcStats.furniture}</b></div>
              </>
            ) : (
              <div style={{ color: "#999", fontStyle: "italic" }}>
                Loading IFC statistics...
              </div>
            )}
          </div>
          
        </div>

        {/* Landuse Legend */}
        <div
          style={{
            padding: "10px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "0.9rem",
          }}
        >
      <strong>Munich Land Use Legend</strong>
          <div style={{ marginTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#FDC449", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Residential area</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#E19A36", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Mixed Use area</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#BDA0D1", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Special area</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#F47ED5", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Core area</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#E1E1E1", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Commercial area</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#7ED9FB", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Public Amenity</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#FFFF63", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Main Road</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#FFFFFF", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Public parking lot</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#F9C2E4", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Railway</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ width: "14px", height: "14px", background: "#D9FDDA", borderRadius: "3px", marginRight: "8px" }}></div>
              <span>Green Space</span>
            </div>
            
          </div>
        </div>
      </>



    )}
  </div>
 
  </div>

);
};