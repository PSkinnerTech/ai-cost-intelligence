import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCostUpdates } from '../../hooks/useWebSocket';
import CostAnalyticsChart from './CostAnalyticsChart';

interface CostData {
  model: string;
  tokens: {
    prompt: number;
    completion: number;
  };
  cost: {
    prompt: number;
    completion: number;
    total: number;
  };
}

const CostDashboard: React.FC = () => {
  const [costData, setCostData] = useState<CostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Add WebSocket real-time updates
  const { costs, totalCost, isConnected, connectionStatus } = useCostUpdates();

  useEffect(() => {
    fetchCostData();
    const interval = setInterval(fetchCostData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCostData = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/test/cost-calculation');
      if (response.data.success) {
        setCostData(response.data.data);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch cost data');
      console.error('Error fetching cost data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) {
      return `$${cost.toFixed(6)}`;
    } else if (cost < 1) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(2)}`;
    }
  };

  const getTotalTokens = (data: CostData) => {
    return data.tokens.prompt + data.tokens.completion;
  };

  const getCostPerToken = (data: CostData) => {
    const totalTokens = getTotalTokens(data);
    return totalTokens > 0 ? data.cost.total / totalTokens * 1000 : 0; // Cost per 1K tokens
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🔄</div>
        <div>Loading cost data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: '#EF4444',
        backgroundColor: '#FEF2F2',
        borderRadius: '0.5rem',
        margin: '1rem'
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>❌</div>
        <div>{error}</div>
        <button 
          onClick={fetchCostData}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cost Dashboard</h1>
        
        {/* WebSocket Status Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-600">
            Real-time: {connectionStatus}
          </span>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          💰 Cost Dashboard
        </h2>
        <p className="text-gray-600 mb-2">
          Real-time cost comparison across different LLM models
        </p>
        <p className="text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {costData.map((data) => (
          <div key={data.model} style={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#1F2937'
              }}>
                {data.model}
              </h3>
              <div style={{
                backgroundColor: data.model.includes('gpt-4') ? '#FEE2E2' : '#DBEAFE',
                color: data.model.includes('gpt-4') ? '#991B1B' : '#1E40AF',
                padding: '0.25rem 0.75rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}>
                {data.model.includes('gpt-4') ? 'Premium' : 'Standard'}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
              }}>
                <span style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                  Total Cost (1.5K tokens)
                </span>
                <span style={{ 
                  fontWeight: '600', 
                  fontSize: '1.125rem',
                  color: '#1F2937'
                }}>
                  {formatCost(data.cost.total)}
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '0.25rem'
              }}>
                <span style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                  Input ({data.tokens.prompt} tokens)
                </span>
                <span style={{ color: '#1F2937' }}>
                  {formatCost(data.cost.prompt)}
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between'
              }}>
                <span style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                  Output ({data.tokens.completion} tokens)
                </span>
                <span style={{ color: '#1F2937' }}>
                  {formatCost(data.cost.completion)}
                </span>
              </div>
            </div>

            <div style={{
              borderTop: '1px solid #E5E7EB',
              paddingTop: '1rem'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: '#6B7280' }}>
                  Cost per 1K tokens
                </span>
                <span style={{ 
                  fontWeight: '500',
                  color: '#1F2937'
                }}>
                  {formatCost(getCostPerToken(data))}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          📊 Cost Comparison Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm font-medium text-slate-600 mb-2">
              Most Economical
            </div>
            <div className="text-base font-semibold text-slate-900">
              {costData.reduce((min, current) => 
                current.cost.total < min.cost.total ? current : min
              ).model}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-slate-600 mb-2">
              Most Expensive
            </div>
            <div className="text-base font-semibold text-slate-900">
              {costData.reduce((max, current) => 
                current.cost.total > max.cost.total ? current : max
              ).model}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-slate-600 mb-2">
              Price Difference
            </div>
            <div className="text-base font-semibold text-slate-900">
              {(() => {
                const costs = costData.map(d => d.cost.total);
                const max = Math.max(...costs);
                const min = Math.min(...costs);
                return `${((max - min) / min * 100).toFixed(1)}%`;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Add the new Cost Analytics Chart */}
      <CostAnalyticsChart />

      {/* Existing model breakdown section - keep as is */}
      {costData && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Cost Breakdown by Model</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {costData.map((data) => (
                <div key={data.model} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="font-medium text-gray-900">{data.model}</span>
                  </div>
                  <div className="flex items-center space-x-6">
                    <span className="text-sm text-gray-500">
                      {data.tokens.prompt + data.tokens.completion} tokens
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${data.cost.total.toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostDashboard; 