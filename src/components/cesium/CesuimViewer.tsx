import React, { useEffect, useRef, useState } from "react";
import { Viewer , ScreenSpaceEventHandler, ScreenSpaceEventType} from "cesium";
import { flyToTilesetCustomView } from "./CameraUtils";
import "cesium/Build/Cesium/Widgets/widgets.css";

import "./style.css";
import { initCesiumViewer } from "./CesiumLoader";
import { loadIonTileset } from "./TilesetComponent";



export const CesiumViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
   const viewerRef = useRef<Viewer | null>(null);
   const [layers,setLayers]=useState<any[]>([])
   


  useEffect(() => {
    const init = async () => {
      if (!containerRef.current) return;

      // creating cesium viewer
      const viewerInstance = await initCesiumViewer(containerRef.current);
      viewerRef.current = viewerInstance;
       //viewerRef.current = await initCesiumViewer(containerRef.current);

       const loadLayers:any[]=[];


       // 1.  IFC/3D 
       loadLayers.push(await loadIonTileset(viewerInstance, 3476879, "3DTILES", "IFC Model 1"));
       loadLayers.push(await loadIonTileset(viewerInstance, 4066080, "3DTILES", "IFC Model 2"));
       loadLayers.push(await loadIonTileset(viewerInstance, 4066077, "3DTILES", "IFC Model 3"));
       loadLayers.push(await loadIonTileset(viewerInstance, 4065957, "3DTILES", "IFC Model 4"));
       loadLayers.push(await loadIonTileset(viewerInstance, 4066099, "3DTILES", "IFC Model 5"));
       loadLayers.push(await loadIonTileset(viewerInstance,4046995 , "3DTILES", "IFC Model 6"));


       //2. GeoJSON

       loadLayers.push(await loadIonTileset(viewerInstance, 4088254, "GEOJSON", "OSM Building"));
       loadLayers.push(await loadIonTileset(viewerInstance, 4088271, "GEOJSON", "OSM Landuse"));
       loadLayers.push(await loadIonTileset(viewerInstance, 4088283, "GEOJSON", "OSM Railway"));
       loadLayers.push(await loadIonTileset(viewerInstance, 4088295, "GEOJSON", "OSM Roadway"));
       loadLayers.push(await loadIonTileset(viewerInstance, 4088344, "GEOJSON", "OSM Public Transport"));



       //3. City GML
       loadLayers.push(await loadIonTileset(viewerInstance, 4078829, "3DTILES", "CITY GML LoD2"));

       
       //Set initial visiblity state
       loadLayers.forEach((layer)=>{
        //Default:off
        layer.visible=false;
        //layer.tileset.show=false;

        if (layer.type === "3DTILES" && layer.tileset) {
          layer.tileset.show = false;
        }
        if (layer.type === "GEOJSON" && layer.datasource) {
          layer.datasource.show = false;
        }



        if (layer.name==="IFC Model 1" || layer.name ==="CITY GML LoD2") 
          {
          layer.visible = true;
          if (layer.tileset) layer.tileset.show = true;
          if (layer.datasource) layer.datasource.show = true;
          }
       });
       
       setLayers(loadLayers.filter(Boolean));
       

       // Zoom to IFC Model 1 on startup
       const ifc1 = loadLayers.find(l => l?.name === "IFC Model 1");
       if (ifc1 && ifc1.tileset) {
        await ifc1.tileset.readyPromise;  // IMPORTANT
        flyToTilesetCustomView(viewerInstance, ifc1.tileset, 1.5);
       
      }
  };

       //void init();
       init();

     return () => viewerRef.current?.destroy();
  }, []);


  const toggleLayerVisibility = (index:number)=>{
    setLayers((prev)=>{
      const updated =[...prev];
      const clickedLayer = updated[index];

      //Toggle visiblity
      clickedLayer.visible=!clickedLayer.visible;

      //apply visibility yo the cesium
      if (clickedLayer.type==="3DTILES" && clickedLayer.tileset){
        clickedLayer.tileset.show = clickedLayer.visible;
      }

      if (clickedLayer.type === "GEOJSON" && clickedLayer.datasource) {
        clickedLayer.datasource.show = clickedLayer.visible;
      }


     //If IFC Model 6 become visible
      if (clickedLayer.name === "IFC Model 6" && clickedLayer.visible) {
        updated.forEach((layer)=> {
          if (
            layer.name.startsWith("IFC Model")&&
            layer.name !=="IFC Model 6"
          ){
            layer.visible=false;
            layer.tileset.show=false;
           }
           });
      }  

          //if any other IFC model turned on
          if (
            clickedLayer.name.startsWith ("IFC Model") &&
            clickedLayer.name!=="IFC Model 6" &&
            clickedLayer.visible
          )
          {
            updated.forEach((layer)=>{
              if (layer.name==="IFC Model 6"){
                layer.visible= false;
                layer.tileset.show=false;
              }
            });
          }

        viewerRef.current?.scene.requestRender();        
        
        return updated;

    });
  }


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
            style={{cursor:"pointer"}}         
            onClick={() => {
            flyToTilesetCustomView(viewerRef.current!, layer);
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