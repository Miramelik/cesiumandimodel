import React from 'react';

/**
 * ========================================
 * APPROACH 1: Automatic WMS Legend
 * ========================================
 * Uses WMS GetLegendGraphic request
 */

interface WMSLegendProps {
  wmsUrl: string;
  layerName: string;
  //width?: number;
  //height?: number;
}

export const WMSLegend: React.FC<WMSLegendProps> = ({
  wmsUrl,
  layerName,
  //width = 200,
  //height = 300
}) => {
  // Build the GetLegendGraphic URL
  const legendUrl = `${wmsUrl}?` + new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetLegendGraphic',
    LAYER: layerName,
    FORMAT: 'image/png',
    //WIDTH: width.toString(),
    //HEIGHT: height.toString()
  }).toString();

  return (
    <div style={{
      position:"absolute",
      bottom: "0",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(255,255,255,0.95)",
      padding: "12px 18px",
        borderRadius: "10px 10px 0 0",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.15)",
        zIndex: 9999,
        width: "430px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px"
    }}>
      <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
        Land Use Legend
      </h4>
      
     <img
        src={legendUrl}
        alt="WMS Legend"
        style={{
          width: "90%",
          height: "auto",
          border: "1px solid #ddd",
          borderRadius: "6px",
        }}
      />
    </div>
  );
};

/**
 * ========================================
 * EXAMPLE: Munich Land Use Legend
 * ========================================
 * Pre-configured for your WMS
 */

export const MunichLandUseLegend: React.FC = () => {
  return (
    <WMSLegend
      wmsUrl="https://geoportal.muenchen.de/geoserver/plan/g_fnp/ows"
      layerName="plan:g_fnp"
    />
  );
};

