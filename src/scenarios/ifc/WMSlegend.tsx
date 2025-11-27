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
  width?: number;
  height?: number;
}

export const WMSLegend: React.FC<WMSLegendProps> = ({
  wmsUrl,
  layerName,
  width = 200,
  height = 300
}) => {
  // Build the GetLegendGraphic URL
  const legendUrl = `${wmsUrl}?` + new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetLegendGraphic',
    LAYER: layerName,
    FORMAT: 'image/png',
    WIDTH: width.toString(),
    HEIGHT: height.toString()
  }).toString();

  return (
    <div style={{
      padding: '10px',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      maxWidth: '250px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>
        WMS Legend
      </h4>
      
      <img 
        src={legendUrl}
        alt="WMS Legend"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block'
        }}
        onError={(e) => {
          console.error('Failed to load WMS legend');
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).parentElement!.innerHTML += 
            '<p style="color: #999; font-size: 0.85rem;">Legend not available</p>';
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
  // Option 1: Try automatic legend first
  const MUNICH_WMS_URL = 'https://geoportal.muenchen.de/geoserver/plan/g_fnp/ows';
  const LAYER_NAME = 'plan:g_fnp';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {/* Automatic WMS Legend */}
      <WMSLegend 
        wmsUrl={MUNICH_WMS_URL}
        layerName={LAYER_NAME}
        width={200}
        height={300}
      />
    </div>
  );
};
