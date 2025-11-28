// import React from 'react';

// /**
//  * Munich Land Use Plan Legend
//  * Custom legend with exact colors from Munich FNP
//  */

// interface LegendItem {
//   color: string;
//   label: string;
// }

// export const MunichLandUseLegend: React.FC = () => {
//   const legendItems: LegendItem[] = [
//     { color: '#FDC449', label: 'Residential area' },
//     { color: '#E19A36', label: 'Mixed Use area' },
//     { color: '#BDA0D1', label: 'Special area' },  
//     { color: '#F47ED5', label: 'Core area' },
//     { color: '#E1E1E1', label: 'Commercial Area' },
//     { color: '#7ED9FB', label: 'Public amenity' },
//     { color: '#FFFF63', label: 'Main Road' },
//     { color: '#FFFFFF', label: 'Public parking lot' },
//     { color: '#F9C2E4', label: 'Railway' },
//     { color: '#D9FDDA', label: 'Green space' },
//   ];

//   return (
//     <div style={{
//       position: 'absolute',
//       bottom: '0',
//       left: '50%',
//       transform: 'translateX(-50%)',
//       background: 'rgba(255, 255, 255, 0.95)',
//       padding: '15px 20px',
//       borderRadius: '10px 10px 0 0',
//       boxShadow: '0 -2px 12px rgba(0,0,0,0.2)',
//       zIndex: 9999,
//       maxWidth: '600px',
//       width: 'auto',
//     }}>
//       <h4 style={{
//         margin: '0 0 10px 0',
//         fontSize: '0.95rem',
//         fontWeight: 600,
//         color: '#333'
//       }}>
//         Munich Land Use Plan Legend
//       </h4>

//       <div style={{
//         display: 'grid',
//         gridTemplateColumns: 'repeat(2, 1fr)',
//         gap: '10px 15px',
//       }}>
//         {legendItems.map((item, index) => (
//           <div
//             key={index}
//             style={{
//               display: 'flex',
//               alignItems: 'center',
//               gap: '8px',
//             }}
//           >
//             <div style={{
//               width: '14px',
//               height: '14px',
//               background: item.color,
//               borderRadius: '4px',
//               border: item.color === '#FFFFFF' ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.15)',
//               flexShrink: 0,
//               boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
//             }} />
//             <span style={{
//               fontSize: '0.85rem',
//               color: '#444',
//               whiteSpace: 'nowrap'
//             }}>
//               {item.label}
//             </span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// // import React from 'react';

// // /**
// //  * ========================================
// //  * APPROACH 1: Automatic WMS Legend
// //  * ========================================
// //  * Uses WMS GetLegendGraphic request
// //  */

// // interface WMSLegendProps {
// //   wmsUrl: string;
// //   layerName: string;
// //   //width?: number;
// //   //height?: number;
// // }

// // export const WMSLegend: React.FC<WMSLegendProps> = ({
// //   wmsUrl,
// //   layerName,
// //   //width = 200,
// //   //height = 300
// // }) => {
// //   // Build the GetLegendGraphic URL
// //   const legendUrl = `${wmsUrl}?` + new URLSearchParams({
// //     SERVICE: 'WMS',
// //     VERSION: '1.3.0',
// //     REQUEST: 'GetLegendGraphic',
// //     LAYER: layerName,
// //     FORMAT: 'image/png',
// //     //WIDTH: width.toString(),
// //     //HEIGHT: height.toString()
// //   }).toString();

// //   return (
// //     <div style={{
// //       position:"absolute",
// //       bottom: "0",
// //       left: "50%",
// //       transform: "translateX(-50%)",
// //       background: "rgba(255,255,255,0.95)",
// //       padding: "12px 18px",
// //         borderRadius: "10px 10px 0 0",
// //         boxShadow: "0 -2px 10px rgba(0,0,0,0.15)",
// //         zIndex: 9999,
// //         width: "430px",
// //         display: "flex",
// //         flexDirection: "column",
// //         alignItems: "center",
// //         gap: "10px"
// //     }}>
// //       <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
// //         Land Use Legend
// //       </h4>
      
// //      <img
// //         src={legendUrl}
// //         alt="WMS Legend"
// //         style={{
// //           width: "90%",
// //           height: "auto",
// //           border: "1px solid #ddd",
// //           borderRadius: "6px",
// //         }}
// //       />
// //     </div>
// //   );
// // };

// // /**
// //  * ========================================
// //  * EXAMPLE: Munich Land Use Legend
// //  * ========================================
// //  * Pre-configured for your WMS
// //  */

// // export const MunichLandUseLegend: React.FC = () => {
// //   return (
// //     <WMSLegend
// //       wmsUrl="https://geoportal.muenchen.de/geoserver/plan/g_fnp/ows"
// //       layerName="plan:g_fnp"
// //     />
// //   );
// // };

