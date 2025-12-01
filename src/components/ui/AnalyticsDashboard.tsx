import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import './AnalyticsDashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface BuildingFeature {
  id: number;
  height: number;
  storeys: number;
  function: string;
  rooftype: number;
  surface: number;
  volume: number;
}

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  buildingsData?: BuildingFeature[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  isOpen,
  onClose,
  buildingsData = [],
}) => {
  const [metrics, setMetrics] = useState({
    totalBuildings: 0,
    totalVolume: 0,
    totalSurface: 0,
    solarPotential: 0,
    energyDemand: 0,
    annualCost: 0,
  });

  useEffect(() => {
    if (buildingsData.length > 0) {
      console.log('📊 [Dashboard] Calculating metrics from', buildingsData.length, 'buildings');
      console.log('📊 [Dashboard] Sample building:', buildingsData[0]);
      calculateMetrics();
    }
  }, [buildingsData]);

  const calculateMetrics = () => {
    const totalBuildings = buildingsData.length;
    
    // Calculate totals with proper filtering for valid data
    const totalVolume = buildingsData.reduce((sum, b) => {
      const vol = Number(b.volume) || 0;
      return sum + vol;
    }, 0);
    
    const totalSurface = buildingsData.reduce((sum, b) => {
      const surf = Number(b.surface) || 0;
      return sum + surf;
    }, 0);
    
    // Count flat roofs (rooftype === 1000)
    const flatRoofs = buildingsData.filter((b) => {
      const roofType = Number(b.rooftype);
      return roofType === 1000;
    }).length;
    
    // Calculate energy demand (volume * 15 kWh/year)
    const totalEnergyDemand = totalVolume * 15; // Changed to match EnergyScenario
    
    const annualCost = totalEnergyDemand * 0.40; // Changed to 0.40 to match EnergyScenario
    const co2Emissions = totalEnergyDemand * 0.31; // Added to match EnergyScenario
    const solarPotential = totalBuildings > 0 ? (flatRoofs / totalBuildings) * 100 : 0;

    console.log('📊 [Dashboard] Metrics calculated:', {
      totalBuildings,
      totalVolume: `${(totalVolume / 1000000).toFixed(2)}M m³`,
      totalSurface: `${(totalSurface / 1000).toFixed(1)}K m²`,
      flatRoofs: `${flatRoofs} (${solarPotential.toFixed(1)}%)`,
      totalEnergyDemand: `${(totalEnergyDemand / 1000000).toFixed(2)}M kWh`,
      annualCost: `€${(annualCost / 1000000).toFixed(2)}M`,
      co2Emissions: `${(co2Emissions / 1000000).toFixed(2)}M kg`,
    });

    setMetrics({
      totalBuildings,
      totalVolume,
      totalSurface,
      solarPotential,
      energyDemand: totalEnergyDemand,
      annualCost,
    });
  };

  // Height Distribution Data
  const heightData = {
    labels: ['≤15m', '15-30m', '30-50m', '>50m'],
    datasets: [
      {
        label: 'Buildings',
        data: [
          buildingsData.filter((b) => b.height <= 15).length,
          buildingsData.filter((b) => b.height > 15 && b.height <= 30).length,
          buildingsData.filter((b) => b.height > 30 && b.height <= 50).length,
          buildingsData.filter((b) => b.height > 50).length,
        ],
        backgroundColor: [
          'rgba(173, 216, 230, 0.7)',
          'rgba(255, 255, 0, 0.7)',
          'rgba(255, 140, 0, 0.7)',
          'rgba(128, 0, 0, 0.7)',
        ],
        borderColor: ['#add8e6', '#ffff00', '#ff8c00', '#800000'],
        borderWidth: 2,
      },
    ],
  };

  // Energy Demand Threshold Data
  const energyThresholdData = {
    labels: ['Low (<15K)', 'High (15-30K)', 'Very High (≥30K)'],
    datasets: [
      {
        label: 'Buildings',
        data: [
          buildingsData.filter((b) => b.volume * 15 < 15000).length,
          buildingsData.filter(
            (b) => b.volume * 15 >= 15000 && b.volume * 15 < 30000
          ).length,
          buildingsData.filter((b) => b.volume * 15 >= 30000).length,
        ],
        backgroundColor: [
          'rgba(173, 216, 230, 0.7)',
          'rgba(255, 165, 0, 0.7)',
          'rgba(255, 0, 0, 0.7)',
        ],
        borderColor: ['#add8e6', '#ffa500', '#ff0000'],
        borderWidth: 2,
      },
    ],
  };

  // Roof Type Data
  const roofTypeData = {
    labels: ['Flat Roofs', 'Other Roofs'],
    datasets: [
      {
        data: [
          buildingsData.filter((b) => {
            const roofType = Number(b.rooftype);
            return roofType === 1000;
          }).length,
          buildingsData.filter((b) => {
            const roofType = Number(b.rooftype);
            return roofType !== 1000;
          }).length,
        ],
        backgroundColor: [
          'rgba(255, 215, 0, 0.8)',
          'rgba(128, 128, 128, 0.8)',
        ],
        borderColor: ['#ffd700', '#808080'],
        borderWidth: 2,
      },
    ],
  };

  // Building Function Data
  const functionData = {
    labels: ['Residential', 'Office', 'Other'],
    datasets: [
      {
        data: [
          buildingsData.filter((b) => b.function === '31001_1000').length,
          buildingsData.filter((b) => b.function === '32001_1000').length,
          buildingsData.filter((b) => b.function === '39001_1000').length,
        ],
        backgroundColor: [
          'rgba(0, 255, 255, 0.8)',
          'rgba(255, 165, 0, 0.8)',
          'rgba(128, 128, 128, 0.8)',
        ],
        borderColor: ['#00ffff', '#ffa500', '#808080'],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          font: { size: 10 },
        },
      },
    },
  };

  if (!isOpen) return null;

  return (
    <div className="analytics-dashboard-overlay" onClick={onClose}>
      <div className="analytics-dashboard-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dashboard-header">
          <h2>Building Analytics Visualization</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="dashboard-content">
          {buildingsData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p>Loading building data...</p>
              <p style={{ fontSize: '0.9em', marginTop: '10px' }}>
                Please wait while we extract features from the tileset
              </p>
            </div>
          ) : (
            <>
               {/* Charts */}
              <div className="charts-section">
                <div className="chart-container">
                  <h3>Height Distribution</h3>
                  <Bar data={heightData} options={chartOptions} />
                </div>

                <div className="chart-container">
                  <h3>Energy Demand Threshold</h3>
                  <Bar data={energyThresholdData} options={chartOptions} />
                </div>

                <div className="chart-container">
                  <h3>Roof Type Analysis</h3>
                  <Doughnut data={roofTypeData} options={pieChartOptions} />
                </div>

                <div className="chart-container">
                  <h3>Building Functions</h3>
                  <Pie data={functionData} options={pieChartOptions} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;