// src/components/Dashboard/CostAnalyticsChart.tsx
// Beautiful Cost Analytics Chart using Recharts

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
  Pie
} from 'recharts';

interface CostData {
  name: string;
  variantA: number;
  variantB: number;
  savings: number;
  timestamp: string;
}

interface ModelCostData {
  model: string;
  cost: number;
  tokens: number;
  efficiency: number;
}

export const CostAnalyticsChart: React.FC = () => {
  const [costTrends, setCostTrends] = useState<CostData[]>([]);
  const [modelComparison, setModelComparison] = useState<ModelCostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'trends' | 'comparison' | 'models'>('trends');

  useEffect(() => {
    fetchCostAnalytics();
    const interval = setInterval(fetchCostAnalytics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCostAnalytics = async () => {
    try {
      // Mock data for demonstration - replace with real API calls
      const mockTrends: CostData[] = [
        { name: 'Test 1', variantA: 0.0012, variantB: 0.0034, savings: 0.0022, timestamp: '10:00' },
        { name: 'Test 2', variantA: 0.0008, variantB: 0.0041, savings: 0.0033, timestamp: '10:30' },
        { name: 'Test 3', variantA: 0.0015, variantB: 0.0038, savings: 0.0023, timestamp: '11:00' },
        { name: 'Test 4', variantA: 0.0011, variantB: 0.0045, savings: 0.0034, timestamp: '11:30' },
        { name: 'Test 5', variantA: 0.0009, variantB: 0.0039, savings: 0.0030, timestamp: '12:00' },
      ];

      const mockModels: ModelCostData[] = [
        { model: 'GPT-3.5-Turbo', cost: 0.0012, tokens: 150, efficiency: 125 },
        { model: 'GPT-4', cost: 0.0180, tokens: 150, efficiency: 8.3 },
        { model: 'GPT-4-Turbo', cost: 0.0060, tokens: 150, efficiency: 25 },
      ];

      setCostTrends(mockTrends);
      setModelComparison(mockModels);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cost analytics:', error);
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Cost Analytics</h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveChart('trends')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeChart === 'trends'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Cost Trends
          </button>
          <button
            onClick={() => setActiveChart('comparison')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeChart === 'comparison'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            A/B Comparison
          </button>
          <button
            onClick={() => setActiveChart('models')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeChart === 'models'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Model Efficiency
          </button>
        </div>
      </div>

      <div className="h-80">
        {activeChart === 'trends' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={costTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `$${value.toFixed(4)}`} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(4)}`, '']}
                labelFormatter={(label) => `Test: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="variantA" 
                stroke="#3B82F6" 
                strokeWidth={2} 
                name="Variant A (Direct)" 
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="variantB" 
                stroke="#EF4444" 
                strokeWidth={2} 
                name="Variant B (Explanatory)" 
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="savings" 
                stroke="#10B981" 
                strokeWidth={2} 
                name="Cost Savings" 
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'comparison' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `$${value.toFixed(4)}`} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(4)}`, '']}
                labelFormatter={(label) => `Test: ${label}`}
              />
              <Legend />
              <Bar dataKey="variantA" fill="#3B82F6" name="Variant A" />
              <Bar dataKey="variantB" fill="#EF4444" name="Variant B" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'models' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={modelComparison}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ model, cost }) => `${model}: $${cost.toFixed(4)}`}
                outerRadius={80}
                dataKey="cost"
                fill="#3B82F6"
              />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cost Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">Total Tests</div>
          <div className="text-2xl font-bold text-blue-900">{costTrends.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">Avg Savings</div>
          <div className="text-2xl font-bold text-green-900">
            ${(costTrends.reduce((sum, test) => sum + test.savings, 0) / costTrends.length).toFixed(4)}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-600">Best Variant</div>
          <div className="text-2xl font-bold text-yellow-900">Variant A</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-600">ROI</div>
          <div className="text-2xl font-bold text-purple-900">284%</div>
        </div>
      </div>
    </div>
  );
};

export default CostAnalyticsChart; 