# Geospatial Data Pipeline and BIM Integration Platform

## Project Overview

This project implements a comprehensive web-based platform that integrates Building Information Modeling (BIM) with 3D geospatial data for multi-scenario urban analysis. The system combines Bentley's iTwin platform for detailed BIM visualization with Cesium for urban-scale 3D rendering, enabling simultaneous analysis of building accessibility, noise exposure, energy performance, and detailed IFC element inspection.

## Architecture

### Dual-Viewer System
- **iTwin Viewer**: High-fidelity BIM visualization for detailed building element analysis
- **Cesium Viewer**: Urban-scale 3D geospatial visualization with city-wide context

### Analysis Scenarios
1. **Accessibility Analysis**: Identifies buildings within configurable buffer zones around public transit stops
2. **Noise Analysis**: Classifies buildings by exposure to traffic noise zones
3. **Energy Analysis**: Calculates building energy demand, solar potential, and CO₂ emissions
4. **IFC Analysis**: Provides detailed element-level inspection of BIM models with land use overlay

## Technology Stack

### Frontend Framework
- **React 18.3.1** with TypeScript
- **@itwin/web-viewer-react** for BIM visualization
- **Cesium 1.135.0** for 3D geospatial rendering
- **Chart.js** for analytics dashboard

### Geospatial Processing
- **Turf.js 7.3.0** for client-side spatial analysis
- **CityGML LoD2** models via Cesium Ion
- **IFC** models via iTwin platform
- **GeoJSON** for vector overlays
- **WMS** for land use imagery

## Installation

### Prerequisites
- Node.js (v16 or higher recommended)
- npm package manager

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd <project-directory>
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:
```dotenv
# ---- Authorization Client Settings ----
REACT_APP_IMJS_AUTH_CLIENT_CLIENT_ID=spa-GkjjC3HLRrv1Dh4P9Zr5IPN5m
REACT_APP_IMJS_AUTH_CLIENT_REDIRECT_URI=http://localhost:3000/signin-callback
REACT_APP_IMJS_AUTH_CLIENT_LOGOUT_URI=""
REACT_APP_IMJS_AUTH_CLIENT_SCOPES="itwin-platform"
REACT_APP_IMJS_AUTH_AUTHORITY="https://ims.bentley.com"

# ---- iTwin Project Settings ----
REACT_APP_IMJS_ITWIN_ID=2dc470ac-4f6d-417c-ab8e-f1fe2318ef0c
REACT_APP_IMJS_IMODEL_ID=b8f8fe5a-fdec-498d-ba68-6b7cde90233b

# ---- Cesium Ion Token ----
REACT_APP_ION_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0M2M4MmM4NC1mOGYzLTRkY2ItYTgwNC0wODUzNjgxMTBhOTAiLCJpZCI6MzEzNzI3LCJpYXQiOjE3NTAzMjY1NTF9.pj5PoBiY1J-epGNebrCUaXdg89GH90ltUfaiVWtjp1M

# ---- Advanced Settings ----
SKIP_PREFLIGHT_CHECK=true
USE_FAST_SASS=false
USE_FULL_SOURCEMAP=true
TRANSPILE_DEPS=false
USING_NPM=true
```

4. **Copy Cesium assets**
```bash
npm run cesium-copy
```

## Running the Application

### Start Development Server
```bash
npm start
```

The application will automatically open at `http://localhost:3000`

### Build for Production
```bash
npm run build
npm run postbuild
```

## Features

### Spatial Analysis Capabilities
- **Buffer Analysis**: Configurable radius (400-800m) around transit stops using Turf.js
- **Point-in-Polygon Testing**: Building classification by noise zones
- **Polygon Union Operations**: Merged coverage areas for accessibility analysis

### Energy Modeling
- **Energy Demand Calculation**: `volume × 15 kWh/m³/year`
- **Cost Estimation**: `energy × €0.40/kWh`
- **CO₂ Emissions**: `energy × 0.31 kg/kWh`
- **Solar Potential**: Flat roof identification for PV installation

### Interactive Visualizations
- Solar suitability highlighting
- Building height classification
- Storey count graduation
- Building function categorization
- Energy demand heat maps
- Interactive analytics dashboard

## Data Sources

### 3D Models
- **CityGML LoD2**: Cesium Ion Asset 4138907 (Munich buildings)
- **IFC Models**: Via iTwin Platform (detailed building elements)

### Vector Data (GeoJSON)
- Bus stops: `/public/busstops.geojson`
- Noise zones: `/public/noise.geojson`
- Railway networks: Cesium Ion 4088283
- Road networks: Cesium Ion 4088295

### Raster Services
- **Munich Land Use WMS**: `https://geoportal.muenchen.de/geoserver/plan/g_fnp/ows`

## Project Structure
```
src/
├── components/
│   ├── cesium/              # Cesium viewer components
│   │   ├── CesiumViewer.tsx
│   │   ├── CesiumLoader.ts
│   │   └── TilesetComponent.ts
│   ├── itwin/               # iTwin viewer components
│   │   ├── ITwinViewer.tsx
│   │   └── utils/
│   └── ui/                  # User interface components
│       └── AnalyticsDashboard.tsx
├── scenarios/               # Analysis scenario modules
│   ├── bus/                 # Accessibility analysis
│   │   └── BusScenario.ts
│   ├── noise/               # Noise exposure analysis
│   │   └── NoiseScenario.ts
│   ├── energy/              # Energy demand analysis
│   │   └── EnergyScenario.ts
│   ├── ifc/                 # IFC element inspection
│   │   ├── IFCScenario.ts
│   │   └── IFCElementQuery.ts
│   ├── SCENARIOS.ts         # Scenario definitions
│   └── ScenarioManager.ts   # Scenario orchestration
├── App.tsx                  # Main application
├── Auth.ts                  # Authentication handler
└── index.tsx                # Entry point
```

## Usage Guide

### Scenario Selection
Click the scenario buttons in the top-right panel:
- **Accessibility Analysis**: Bus stop buffer analysis
- **Noise Analysis**: Traffic noise exposure classification
- **Energy Analysis**: Building energy demand modeling
- **Detail BIM Model**: IFC element inspection with land use overlay

### Accessibility Analysis
1. Select "Accessibility Analysis" scenario
2. Toggle "3D Buildings" layer visibility
3. Toggle "Bus Stops" layer visibility
4. Toggle "Buffer" layer to create coverage zone
5. Adjust buffer radius (400-800m) using slider
6. View statistics: total buildings, inside/outside buffer, coverage percentage

### Energy Analysis
1. Select "Energy Analysis" scenario
2. Choose visualization mode from dropdown:
   - Solar Suitability (flat roofs highlighted)
   - Building Height (color-coded)
   - Number of Storeys
   - Building Function
   - Energy Demand
3. Hover over buildings to see detailed energy metrics
4. Hover over "Analytics Dashboard" button to view comprehensive charts

### IFC Model Inspection
1. Select "Detail BIM Model" scenario
2. Split-screen view appears: iTwin viewer (left) + Cesium viewer (right)
3. Navigate IFC model in iTwin viewer for element details
4. View urban context with land use overlay in Cesium viewer
5. Check IFC statistics panel for element counts

## Performance Optimization

The application implements several performance strategies:

- **Tile-based Processing**: Buildings processed incrementally as tiles load
- **Throttled Updates**: Statistics recalculated maximum once per second
- **Spatial Indexing**: Map data structures for O(1) feature lookup
- **Lazy Loading**: Scenario data loaded only when activated

## Troubleshooting

### Common Issues

**1. "Client not initialized" Error**
- Ensure `.env` file exists with correct `REACT_APP_IMJS_AUTH_CLIENT_CLIENT_ID`
- Restart development server after .env changes

**2. Cesium Assets Not Loading**
- Run `npm run cesium-copy` to copy assets to public folder
- Check that `/public/Cesium` directory exists

**3. Buildings Not Visible**
- Toggle layer visibility using checkboxes in Layers panel
- Check that Cesium Ion token is valid in `.env`

**4. Authentication Redirect Loop**
- Verify redirect URI matches exactly: `http://localhost:3000/signin-callback`
- Clear browser cache and cookies
- Check Bentley Developer Portal application settings

**5. Buffer Not Creating**
- Ensure Bus Stops layer is toggled on first
- Check browser console for Turf.js errors
- Verify `/public/busstops.geojson` file exists

## Technical Details

### Data Transformation Pipeline

**Accessibility Analysis:**
```typescript
// 1. Buffer generation
const buffered = turf.buffer(busStopsJson, radiusKm, {units: "kilometers"});

// 2. Polygon union
let unionPolygon = turf.union(featureCollection([poly1, poly2]));

// 3. Spatial intersection
const inside = turf.booleanIntersects(buildingBbox, bufferPolygon);

// 4. Attribute enrichment
feature.setProperty("is_near_busstop", inside);
```

**Energy Modeling:**
```typescript
// Geometric calculations
const volume = height * footprint;
const surface = (2 * footprint) + (perimeter * height);

// Energy metrics
const energyDemand = volume * 15; // kWh/m³/year
const annualCost = energyDemand * 0.40; // €0.40/kWh
const co2 = energyDemand * 0.31; // 0.31 kg CO₂/kWh
```

### State Management
React hooks manage application state:
- `useState` for scenario selection, layer visibility, statistics
- `useCallback` for memoized event handlers
- `useEffect` for side effects (data loading, cleanup)

## Research Applications

This platform demonstrates:
- **Urban Planning**: Transit-oriented development analysis
- **Environmental Assessment**: Noise pollution impact evaluation
- **Energy Efficiency**: City-scale energy demand estimation
- **BIM-GIS Integration**: Seamless connection between building and urban scales

## License

Copyright (c) Bentley Systems, Incorporated. All rights reserved.

## Support

- iTwin Platform Documentation: https://developer.bentley.com/
- Cesium Documentation: https://cesium.com/learn/
- Project Issues: [Create issue in repository]

---

**Development Server**: http://localhost:3000

**Last Updated**: February 2026