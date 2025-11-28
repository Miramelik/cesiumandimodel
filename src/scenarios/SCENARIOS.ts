
export type LayerType = "3DTILES" | "GEOJSON" | "IMAGE" | "WMS";

export interface ScenarioLayer {
  id: number | string;       // Cesium ion ID or URL
  name: string;
  type: LayerType;
  visible?: boolean;          // default visibility
  clampToGround?: boolean;    // for GeoJSON
  style?: any;                // Cesium style JSON
  wmsOptions?: {              // WMS-specific options
    layers: string;
    parameters?: {
      transparent?: boolean;
      format?: string;
      version?: string;
      [key: string]: any;
    };
  };
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  description?: string;
  layers: ScenarioLayer[];
  options?: {
    enablePicking?: boolean;
    enableDashboard?: boolean;
    cameraPreset?: "top" | "iso" | "street";
    enableITwin?:boolean;
  };
}

/* --------------------------------------------------------
   ALL SCENARIOS DEFINED HERE
-------------------------------------------------------- */

export const SCENARIOS: Record<string, ScenarioDefinition> = {


  /* --------------------------------------------
     1) BUS STOPS
  -------------------------------------------- */
  bus: {
    id: "bus",
    title: "Bus Stops",
    description: "This Scenario is about identifying which buildings are in the vicinity of different buffer zones around bus stops.",
    layers: [],
    options: {
      enablePicking: true,
      enableDashboard: true,
      cameraPreset: "iso",
      enableITwin: false,
    },
  },


  /* --------------------------------------------
     2) NOISE
  -------------------------------------------- */
  noise: {
    id: "noise",
    title: "Noise Levels",
    description: "This use case is about identifying which buildings are in the high noise zones around major roads.",

    layers: [],

    options: {
      enablePicking: true,
      enableDashboard: true,
      cameraPreset: "iso",
      enableITwin:false,
    },
  },


  /* --------------------------------------------
     3) ENERGY
  -------------------------------------------- */
  energy: {
    id: "energy",
    title: "Energy Consumption",
    description: "Building-level energy demand & solar.",

    layers: [],

    options: {
      enablePicking:true,
      enableDashboard: true,
      cameraPreset: "iso",
      enableITwin: false,
    },
  },


  /* --------------------------------------------
     4) IFC MODELS (Your dual viewer scenario)
  -------------------------------------------- */
  ifc: {
    id: "ifc",
    title: "IFC Models",
    description: "Full geospatial overlay automation pipeline with land use planning overlay.",

    layers: [
      // These are real Ion IDs:
      { id: 3476879, name: "IFC Model", type: "3DTILES", visible: true },
      // { id: 4066080, name: "IFC Model 2", type: "3DTILES" },
      // { id: 4066077, name: "IFC Model 3", type: "3DTILES" },
      // { id: 4065957, name: "IFC Model 4", type: "3DTILES" },
      // { id: 4066099, name: "IFC Model 5", type: "3DTILES" },
      // { id: 4046995, name: "IFC Model 6", type: "3DTILES" },

      // Munich Land Use Planning WMS Layer
      {
        id: "munich_landuse_wms",
        name: "Munich Land Use Plan",
        type: "WMS",
        visible: true,
        wmsOptions: {
          layers: "plan:g_fnp",
          parameters: {
            transparent: true,
            format: "image/png",
            version: "1.3.0"
          }
        }
      },

      // And OSM layers:
      //{ id: 4088254, name: "OSM Building", type: "GEOJSON", clampToGround: false },
      //{ id: 4088271, name: "OSM Landuse", type: "GEOJSON" },
      { id: 4088283, name: "OSM Railway", type: "GEOJSON" },
      { id: 4088295, name: "OSM Roadway", type: "GEOJSON" },
      //{ id: 4088344, name: "OSM Public Transport", type: "GEOJSON" },
      { id: 4078829, name: "CityGML LoD2", type: "3DTILES", visible: true },
    ],

    options: {
      enablePicking: true,
      cameraPreset: "iso",
      enableITwin: true,
    },
  },
};
