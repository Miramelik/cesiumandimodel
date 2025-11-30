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
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import { X } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
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
      calculateMetrics();
    }
  }, [buildingsData]);

  const calculateMetrics = () => {
    const totalBuildings = buildingsData.length;
    const totalVolume = buildingsData.reduce((sum, b) => sum + b.volume, 0);
    const totalSurface = buildingsData.reduce((sum, b) => sum + b.surface, 0);
    const flatRoofs = buildingsData.filter((b) => b.rooftype === 1000).length;
    const totalEnergyDemand = buildingsData.reduce(
      (sum, b) => sum + b.volume * 15,
      0
    );
    const annualCost = totalEnergyDemand * 0.4;

    setMetrics({
      totalBuildings,
      totalVolume,
      totalSurface,
      solarPotential: (flatRoofs / totalBuildings) * 100,
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
          buildingsData.filter((b) => b.rooftype === 1000).length,
          buildingsData.filter((b) => b.rooftype !== 1000).length,
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
    <div className="analytics-dashboard-overlay">
      <div className="analytics-dashboard-panel">
        <div className="dashboard-header">
          <h2>Building Analytics Visualization</h2>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="dashboard-content">
          {/* Metrics Summary */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">TOTAL BUILDINGS</div>
              <div className="metric-value">{metrics.totalBuildings}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">TOTAL VOLUME</div>
              <div className="metric-value">
                {(metrics.totalVolume / 1000).toFixed(1)}K m³
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">TOTAL SURFACE</div>
              <div className="metric-value">
                {(metrics.totalSurface / 1000).toFixed(1)}K m²
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">SOLAR POTENTIAL</div>
              <div className="metric-value">
                {metrics.solarPotential.toFixed(1)}%
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">ENERGY DEMAND</div>
              <div className="metric-value">
                {(metrics.energyDemand / 1000000).toFixed(2)}M kWh
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">ANNUAL COST</div>
              <div className="metric-value">
                €{(metrics.annualCost / 1000000).toFixed(2)}M
              </div>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;