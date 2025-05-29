import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface RealSavingsData {
  averageSavingsPercentage: number;
  agentData: Array<{
    model: string;
    directCost: number;
    creditCost: number;
    savings: number;
    realCalculation: boolean;
  }>;
  isLoading: boolean;
  error: string | null;
}

const SimpleSavingsCalculator: React.FC = () => {
  const [monthlySpend, setMonthlySpend] = useState(5000);
  const [realSavings, setRealSavings] = useState<RealSavingsData>({
    averageSavingsPercentage: 0,
    agentData: [],
    isLoading: true,
    error: null
  });

  /**
   * Fetch REAL savings data from our deployed API
   * NO HARDCODED VALUES - everything from actual API responses
   */
  const fetchRealSavingsData = async () => {
    console.log('🔄 Fetching real savings data from API...');
    setRealSavings(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('https://api-only-lac.vercel.app/api/comparison?volume=1000');
      
      if (!response.ok) {
        throw new Error(`API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.agents || data.agents.length === 0) {
        throw new Error('Invalid API response structure or no agent data');
      }

      // Extract REAL savings data
      const agentData = data.agents.map((agent: any) => ({
        model: agent.model,
        directCost: agent.directCost,
        creditCost: agent.creditCost,
        savings: agent.savings,
        realCalculation: agent.realCalculation || false
      }));

      // Calculate REAL average savings percentage
      const totalSavingsPercentage = agentData.reduce((sum: number, agent: any) => 
        sum + ((agent.savings / agent.directCost) * 100), 0
      );
      const averageSavingsPercentage = totalSavingsPercentage / agentData.length;

      setRealSavings({
        averageSavingsPercentage: Math.round(averageSavingsPercentage),
        agentData,
        isLoading: false,
        error: null
      });

      console.log('✅ Real savings data loaded:', {
        averageSavingsPercentage: Math.round(averageSavingsPercentage),
        agentCount: agentData.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to fetch real savings data:', errorMessage);
      
      setRealSavings({
        averageSavingsPercentage: 0,
        agentData: [],
        isLoading: false,
        error: errorMessage
      });
    }
  };

  // Load real data on component mount
  useEffect(() => {
    fetchRealSavingsData();
  }, []);

  // Calculate real savings based on actual API data
  const realSavingsAmount = realSavings.averageSavingsPercentage > 0 
    ? monthlySpend * (realSavings.averageSavingsPercentage / 100)
    : 0;

  const realNewCost = monthlySpend - realSavingsAmount;

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            Already Using Arize?
          </h1>
          <p className="text-xl text-gray-600">
            Add Nevermined for instant savings. No code changes needed.
          </p>
        </div>
        
        <button
          onClick={fetchRealSavingsData}
          disabled={realSavings.isLoading}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${realSavings.isLoading ? 'animate-spin' : ''}`} />
          Refresh Real Data
        </button>
      </div>

      {/* Real Data Status Indicator */}
      <div className={`mb-6 px-4 py-2 rounded-lg text-sm ${
        realSavings.error 
          ? 'bg-red-50 text-red-800 border border-red-200' 
          : realSavings.isLoading
          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          : 'bg-green-50 text-green-800 border border-green-200'
      }`}>
        {realSavings.error ? (
          `❌ Error loading real data: ${realSavings.error}`
        ) : realSavings.isLoading ? (
          '🔄 Loading real savings data from live API...'
        ) : (
          `✅ Real data loaded: ${realSavings.averageSavingsPercentage}% average savings from ${realSavings.agentData.length} live API tests`
        )}
      </div>

      {/* Simple slider */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Current Monthly OpenAI Spend (tracked by Arize)
        </label>
        <input 
          type="range" 
          min="100" 
          max="50000" 
          value={monthlySpend}
          onChange={(e) => setMonthlySpend(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-3xl font-bold mt-2">${monthlySpend.toLocaleString()}/month</div>
      </div>
      
      {/* Before/After Comparison - REAL DATA ONLY */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="border-2 border-red-500 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Current Setup</h3>
          <div className="text-3xl font-bold text-red-600 mb-2">
            ${monthlySpend.toLocaleString()}
          </div>
          <div className="text-gray-600">Direct OpenAI API</div>
          <div className="text-green-600 mt-2">✅ Arize Monitoring Active</div>
        </div>
        
        <div className="border-2 border-green-500 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">With Nevermined</h3>
          {realSavings.error ? (
            <div className="text-red-600 text-sm">
              Error calculating savings
            </div>
          ) : realSavings.isLoading ? (
            <div className="text-gray-500 text-sm">
              Loading real costs...
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-green-600 mb-2">
                ${Math.round(realNewCost).toLocaleString()}
              </div>
              <div className="text-gray-600">Via Nevermined Credits</div>
              <div className="text-green-600 mt-2">✅ Arize Monitoring Still Active</div>
              <div className="text-xs text-blue-600 mt-1">
                {realSavings.averageSavingsPercentage}% savings from real API tests
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Big Savings Number - REAL DATA ONLY */}
      <div className="p-8 bg-green-100 rounded-lg text-center">
        {realSavings.error ? (
          <div className="text-red-600">
            <div className="text-2xl font-bold">Unable to calculate savings</div>
            <div className="text-sm mt-2">Real API data required</div>
          </div>
        ) : realSavings.isLoading ? (
          <div className="text-gray-600">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <div className="text-xl">Calculating real savings...</div>
          </div>
        ) : (
          <>
            <div className="text-5xl font-bold text-green-600">
              Save ${Math.round(realSavingsAmount).toLocaleString()}/month
            </div>
            <div className="text-xl mt-2 text-green-700">
              That's ${Math.round(realSavingsAmount * 12).toLocaleString()}/year
            </div>
            <div className="text-sm mt-2 text-green-600">
              Based on {realSavings.averageSavingsPercentage}% real savings from live API tests
            </div>
          </>
        )}
      </div>
      
      {/* Simple CTA */}
      <button 
        className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg text-xl font-semibold transition-colors"
        onClick={() => window.location.href = '/dashboard'}
      >
        See Live Demo →
      </button>

      {/* Real Data Details */}
      {!realSavings.isLoading && !realSavings.error && realSavings.agentData.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            🔬 Real Data Breakdown
          </h4>
          <div className="grid grid-cols-3 gap-2 text-xs text-blue-700">
            {realSavings.agentData.map((agent, index) => (
              <div key={index} className="bg-white p-2 rounded">
                <div className="font-medium">{agent.model}</div>
                <div>${agent.directCost.toFixed(6)} → ${agent.creditCost.toFixed(6)}</div>
                <div className="text-green-600">
                  {Math.round((agent.savings / agent.directCost) * 100)}% saved
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleSavingsCalculator; 