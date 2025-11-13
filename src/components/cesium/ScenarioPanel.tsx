import React from "react";
import { Viewer } from "cesium";

type Props = {
  viewer: Viewer | null;
  iModelTileset: any;
  
  //onToggleGeoJson: (viewer: Viewer, geoJsonSource: any) => void;
  //onToggleTileset: (viewer: Viewer, tileset: any) => void;

  onZoomTo: (Viewer: Viewer, target: "iModel" ) => void;
};

export const ScenarioPanel: React.FC<Props> = ({
  viewer,
  iModelTileset,
  
  onZoomTo,
}) => {
  const handleScenario = (scenario: "iModel" ) => {
  if (!viewer) return;

  //Hide all layers first
  if (iModelTileset) iModelTileset.show = false;
  
  
  // show relevant layers based on the viewer
  if (scenario === "iModel") {
    if (iModelTileset) iModelTileset.show = true;

  }
  onZoomTo(viewer, scenario);

};



/*export const LayerTogglePanel: React.FC<Props> = ({
  viewer,
  geoJsonSource,
  tileset,
  onToggleGeoJson,
  onToggleTileset,
}) => {
  const showGeoJson = () => {
    if (!viewer || !geoJsonSource ) return;
    geoJsonSource.show = true;
    tileset.show = false;
    onToggleGeoJson(viewer, geoJsonSource);
  };

  const showTileset = () => {
    if (!viewer || !geoJsonSource ) return;
    geoJsonSource.show = false;
    tileset.show = true;
    onToggleTileset(viewer, tileset);
  };*/

  return (
    <div style={{ width: "450px", padding: "10px", backgroundColor: "#f4f4f4" }}>
      <br />
      <br/>
      <br />
      <h1>Scenarios</h1>
      <button onClick={() => handleScenario("iModel")}>
        Zoom to iModel
      </button>
     
      < a href="/cesium-only.html" target="_blank" rel="noopener noreferrer">
        <button>
          Open Fullscreen Cesium Viewer
        </button>
      </a>
      

 
    </div>
  );
};
