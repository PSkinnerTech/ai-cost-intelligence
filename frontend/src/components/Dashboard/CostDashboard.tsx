// CostDashboard.tsx - 100% REAL DATA VERSION
// ZERO placeholder data - everything comes from actual API calls

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, Zap, RefreshCw } from 'lucide-react';
import { fetchRealDashboardData, type RealDashboardData } from '../../services/realDataService';
import { getModelDisplayName, getPricingDisplay } from '../../config/pricing';

interface DashboardCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
  subtitle?: string;
  isLoading?: boolean;
  lastUpdated?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  change,
  isPositive,
  icon,
  subtitle,
  isLoading,
  lastUpdated
}) => (
  <div className="bg-white rounded-lg shadow p-6 relative">
    {isLoading && (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )}
    
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-1">
            Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end">
        <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </div>
        <div className={`${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {icon}
        </div>
      </div>
    </div>
  </div>
);

const CostDashboard: React.FC = () => {
  const [realData, setRealData] = useState<RealDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRequestVolume, setUserRequestVolume] = useState(1000);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  /**
   * Fetch REAL dashboard data from API
   * NO MORE MOCK DATA OR HARDCODED VALUES
   */
  const loadRealData = async () => {
    console.log('🔄 Loading 100% REAL dashboard data...');
    setIsLoading(true);
    setError(null);

    try {
      const realDashboardData = await fetchRealDashboardData(userRequestVolume);
      setRealData(realDashboardData);
      setLastRefresh(new Date());
      console.log('✅ Real dashboard data loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Failed to load real data:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load real data on component mount and when request volume changes
  useEffect(() => {
    loadRealData();
  }, [userRequestVolume]);

  // Manual refresh function
  const handleRefresh = () => {
    loadRealData();
  };

  // Calculate monthly projections based on REAL data
  const calculateMonthlyProjections = () => {
    if (!realData) return { cost: 0, savings: 0 };

    const avgCostPerRequest = realData.agents.reduce(
      (sum, agent) => sum + agent.realCost.totalCost, 0
    ) / realData.agents.length;

    const monthlyCost = avgCostPerRequest * userRequestVolume;
    const monthlySavings = (realData.totalSavings.absolute / realData.agents.length) * userRequestVolume;

    return { cost: monthlyCost, savings: monthlySavings };
  };

  const monthlyProjections = calculateMonthlyProjections();

  return (
    <div className="space-y-6">
      {/* Header with Real Data Indicator */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cost Dashboard</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              realData?.realTimeData ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {realData?.realTimeData ? '🟢 Real-Time Data' : '🔴 Data Unavailable'}
            </div>
            {lastRefresh && (
              <span className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          {/* User-configurable request volume */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Monthly Requests</label>
            <input
              type="number"
              value={userRequestVolume}
              onChange={(e) => setUserRequestVolume(parseInt(e.target.value) || 1000)}
              className="px-3 py-1 border border-gray-300 rounded text-sm w-24"
              min="1"
              step="100"
            />
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Real Data
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 text-sm">
              ❌ Error loading real data: {error}
            </div>
          </div>
        </div>
      )}

      {/* Real Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Monthly Cost Projection"
          value={`$${monthlyProjections.cost.toFixed(4)}`}
          change={`${userRequestVolume.toLocaleString()} requests`}
          isPositive={false}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle="Based on real API usage"
          isLoading={isLoading}
          lastUpdated={realData?.agents[0]?.lastUpdated}
        />

        <DashboardCard
          title="Monthly Savings"
          value={`$${monthlyProjections.savings.toFixed(4)}`}
          change={`${realData?.totalSavings.percentage.toFixed(1) || '0'}% saved`}
          isPositive={true}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle="From real cost comparisons"
          isLoading={isLoading}
          lastUpdated={realData?.agents[0]?.lastUpdated}
        />

        <DashboardCard
          title="Active Models"
          value={realData?.agents.length.toString() || '0'}
          change="Real tests running"
          isPositive={true}
          icon={<Users className="h-5 w-5" />}
          subtitle="Using live API data"
          isLoading={isLoading}
        />

        <DashboardCard
          title="Average Efficiency"
          value={`${realData?.totalSavings.percentage.toFixed(1) || '0'}%`}
          change="From actual usage"
          isPositive={realData ? realData.totalSavings.percentage > 0 : false}
          icon={<Zap className="h-5 w-5" />}
          subtitle="Real token efficiency"
          isLoading={isLoading}
        />
      </div>

      {/* Real Agent Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Real Agent Performance</h3>
          <p className="text-sm text-gray-600">
            Live data from actual API calls - no simulated values
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent/Test
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Real Tokens Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Latency (ms)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing Info
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading real data...
                  </td>
                </tr>
              ) : realData?.agents.map((agent, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                    <div className="text-xs text-gray-500">
                      Updated: {new Date(agent.lastUpdated).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getModelDisplayName(agent.model)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>Prompt: {agent.realTokens.prompt_tokens}</div>
                      <div>Completion: {agent.realTokens.completion_tokens}</div>
                      <div className="font-medium">Total: {agent.realTokens.total_tokens}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>Input: ${agent.realCost.inputCost.toFixed(6)}</div>
                      <div>Output: ${agent.realCost.outputCost.toFixed(6)}</div>
                      <div className="font-medium text-green-600">
                        Total: ${agent.realCost.totalCost.toFixed(6)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.realLatency || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {getPricingDisplay(agent.model)}
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No real data available. Click "Refresh Real Data" to load.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real Data Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Zap className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              100% Real Data Dashboard
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                All metrics displayed are calculated from actual API responses. No hardcoded values or assumptions are used.
                {realData && (
                  <span className="block mt-1">
                    Current data based on {realData.agents.length} real test runs 
                    with projected monthly volume of {userRequestVolume.toLocaleString()} requests.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostDashboard; 