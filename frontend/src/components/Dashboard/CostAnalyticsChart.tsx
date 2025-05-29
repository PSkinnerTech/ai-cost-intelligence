// src/components/Dashboard/CostAnalyticsChart.tsx
// Real Token Utilization Analytics Chart using live data

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { fetchRealAnalyticsData } from '../../services/realDataService';

interface RealTokenData {
  testName: string;
  model: string;
  arizeDirectCost: number;
  arizeDirectTokens: number;
  arizeNeverminedCost: number;
  arizeNeverminedTokens: number;
  costSavings: number;
  tokenEfficiency: number;
}

interface ModelEfficiencyData {
  model: string;
  totalCost: number;
  totalTokens: number;
  efficiency: number;
}

const CostAnalyticsChart: React.FC = () => {
  const [realTokenData, setRealTokenData] = useState<RealTokenData[]>([]);
  const [modelEfficiency, setModelEfficiency] = useState<ModelEfficiencyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeChart, setActiveChart] = useState<'tokens' | 'costs' | 'efficiency'>('tokens');

  /**
   * Load REAL analytics data from test-prompt API
   * NO MORE DEMO/FALLBACK DATA
   */
  const loadRealAnalyticsData = async () => {
    console.log('🔄 Loading REAL analytics data...');
    setIsLoading(true);
    setError(null);

    try {
      const realData = await fetchRealAnalyticsData();
      setRealTokenData(realData);

      // Calculate REAL efficiency metrics per model
      const efficiencyMap = new Map<string, {
        totalDirectCost: number;
        totalNeverminedCost: number;
        totalDirectTokens: number;
        totalNeverminedTokens: number;
        testCount: number;
      }>();

      realData.forEach(test => {
        const existing = efficiencyMap.get(test.model) || {
          totalDirectCost: 0,
          totalNeverminedCost: 0,
          totalDirectTokens: 0,
          totalNeverminedTokens: 0,
          testCount: 0
        };

        efficiencyMap.set(test.model, {
          totalDirectCost: existing.totalDirectCost + test.arizeDirectCost,
          totalNeverminedCost: existing.totalNeverminedCost + test.arizeNeverminedCost,
          totalDirectTokens: existing.totalDirectTokens + test.arizeDirectTokens,
          totalNeverminedTokens: existing.totalNeverminedTokens + test.arizeNeverminedTokens,
          testCount: existing.testCount + 1
        });
      });

      // Calculate real efficiency percentages
      const modelEfficiencyData = Array.from(efficiencyMap.entries()).map(([model, data]) => {
        const avgDirectCost = data.totalDirectCost / data.testCount;
        const avgNeverminedCost = data.totalNeverminedCost / data.testCount;
        const avgTokens = (data.totalDirectTokens + data.totalNeverminedTokens) / (data.testCount * 2);
        
        // Real efficiency calculation: cost savings percentage
        const efficiency = avgDirectCost > 0 
          ? ((avgDirectCost - avgNeverminedCost) / avgDirectCost) * 100
          : 0;

        return {
          model,
          totalCost: avgDirectCost,
          totalTokens: avgTokens,
          efficiency: Math.max(0, efficiency) // Ensure non-negative
        };
      });

      setModelEfficiency(modelEfficiencyData);
      setLastUpdated(new Date());

      console.log('✅ Real analytics data loaded:', { realData, modelEfficiencyData });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Failed to load real analytics data:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load real data on component mount
  useEffect(() => {
    loadRealAnalyticsData();
  }, []);

  // Manual refresh function
  const handleRefresh = () => {
    loadRealAnalyticsData();
  };

  // Custom tooltip for token chart
  const TokenTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`Test: ${label}`}</p>
          <p className="text-blue-600">
            {`Arize Direct (WITHOUT Nevermined): ${payload[0].value} tokens`}
          </p>
          <p className="text-green-600">
            {`Arize + Nevermined (WITH Nevermined): ${payload[1].value} tokens`}
          </p>
          <p className="text-purple-600 text-sm mt-1">
            {`Difference: ${payload[1].value - payload[0].value} tokens`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for cost chart
  const CostTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`Test: ${label}`}</p>
          <p className="text-red-600">
            {`Direct Cost: $${payload[0].value.toFixed(6)}`}
          </p>
          <p className="text-green-600">
            {`Nevermined Cost: $${payload[1].value.toFixed(6)}`}
          </p>
          <p className="text-purple-600 text-sm mt-1">
            {`Savings: $${(payload[0].value - payload[1].value).toFixed(6)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header with Real Data Status */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Real Cost & Token Analytics
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Live data from actual API test runs - no simulated values
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div className="text-red-600 text-sm">
            Failed to load real data: {error}
          </div>
        </div>
      )}

      {/* Chart Selection */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveChart('tokens')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeChart === 'tokens'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Token Usage
        </button>
        <button
          onClick={() => setActiveChart('costs')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeChart === 'costs'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Costs
        </button>
        <button
          onClick={() => setActiveChart('efficiency')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeChart === 'efficiency'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Efficiency
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">Loading real analytics data...</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {!isLoading && realTokenData.length > 0 && (
        <>
          {/* Token Usage Chart */}
          {activeChart === 'tokens' && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={realTokenData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="testName" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<TokenTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="arizeDirectTokens" 
                    fill="#3B82F6" 
                    name="Arize Direct (WITHOUT Nevermined)"
                  />
                  <Bar 
                    dataKey="arizeNeverminedTokens" 
                    fill="#10B981" 
                    name="Arize + Nevermined (WITH Nevermined)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cost Comparison Chart */}
          {activeChart === 'costs' && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={realTokenData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="testName" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toFixed(6)}`}
                  />
                  <Tooltip content={<CostTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="arizeDirectCost" 
                    fill="#EF4444" 
                    name="Direct API Cost"
                  />
                  <Bar 
                    dataKey="arizeNeverminedCost" 
                    fill="#10B981" 
                    name="Nevermined Cost"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Model Efficiency Chart */}
          {activeChart === 'efficiency' && modelEfficiency.length > 0 && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelEfficiency}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ model, efficiency }) => `${model}: ${efficiency.toFixed(1)}% efficiency`}
                    fill="#8884d8"
                    dataKey="efficiency"
                  >
                    {modelEfficiency.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Efficiency']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* No Data State */}
      {!isLoading && !error && realTokenData.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No real data available</p>
            <p className="text-sm text-gray-500 mt-1">
              Click "Refresh Data" to load analytics from test-prompt API
            </p>
          </div>
        </div>
      )}

      {/* Real Data Summary */}
      {!isLoading && realTokenData.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            📊 Real Data Summary
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
            <div>
              <span className="font-medium">Tests Run: </span>
              {realTokenData.length}
            </div>
            <div>
              <span className="font-medium">Average Savings: </span>
              $
              {(realTokenData.reduce((sum, test) => sum + test.costSavings, 0) / realTokenData.length).toFixed(6)}
            </div>
            <div>
              <span className="font-medium">Models Tested: </span>
              {new Set(realTokenData.map(test => test.model)).size}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostAnalyticsChart; 