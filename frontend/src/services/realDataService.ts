// Real Data Service - Fetches ACTUAL data from test-prompt API
// NO MORE MOCK DATA - Everything comes from real API calls

import { apiUrl } from '../config/api';
import { calculateRealCost, calculateSavings, OPENAI_PRICING, type TokenUsage, type CostCalculation } from '../config/pricing';

export interface RealTestResult {
  model: string;
  testName: string;
  directResult: {
    tokens: TokenUsage;
    cost: CostCalculation;
    response: string;
    latency: number;
  };
  neverminedResult: {
    tokens: TokenUsage;
    cost: CostCalculation;
    response: string;
    latency: number;
  };
  savings: {
    absolute: number;
    percentage: number;
  };
  timestamp: string;
}

export interface RealDashboardData {
  agents: Array<{
    name: string;
    model: string;
    realTokens: TokenUsage;
    realCost: CostCalculation;
    realLatency: number;
    lastUpdated: string;
  }>;
  totalSavings: {
    absolute: number;
    percentage: number;
  };
  realRequestVolume: number;
  realTimeData: boolean;
}

// Predefined test prompts to get real data across different scenarios
const REAL_TEST_PROMPTS = [
  {
    name: "ML Explanation",
    prompt: "Explain machine learning in simple terms for a beginner.",
    category: "Educational"
  },
  {
    name: "Code Generation", 
    prompt: "Write a Python function to calculate the factorial of a number.",
    category: "Programming"
  },
  {
    name: "Data Analysis",
    prompt: "How would you analyze customer churn data to improve retention?",
    category: "Business"
  },
  {
    name: "Creative Writing",
    prompt: "Write a short story about a robot learning to paint.",
    category: "Creative"
  },
  {
    name: "Technical Explanation",
    prompt: "Explain how blockchain consensus mechanisms work.",
    category: "Technical"
  }
];

/**
 * Fetch real token usage and costs from test-prompt API
 * This replaces ALL mock data with authentic API responses
 */
export const fetchRealTestData = async (
  model: string = 'gpt-3.5-turbo',
  promptIndex: number = 0
): Promise<RealTestResult> => {
  const testPrompt = REAL_TEST_PROMPTS[promptIndex] || REAL_TEST_PROMPTS[0];
  
  const requestBody = {
    prompt: testPrompt.prompt,
    model: model
  };

  console.log(`🔄 Fetching REAL data for ${testPrompt.name} with ${model}`);

  try {
    const response = await fetch(apiUrl('/api/test-prompt'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Real API Response:', data);

    // Extract REAL token usage from API responses
    const directTokens: TokenUsage = {
      prompt_tokens: data.results.direct.usage.prompt_tokens,
      completion_tokens: data.results.direct.usage.completion_tokens,
      total_tokens: data.results.direct.usage.total_tokens
    };

    const neverminedTokens: TokenUsage = {
      prompt_tokens: data.results.nevermined.usage.prompt_tokens,
      completion_tokens: data.results.nevermined.usage.completion_tokens,
      total_tokens: data.results.nevermined.usage.total_tokens
    };

    // Calculate REAL costs using actual token usage
    const directCost = calculateRealCost(directTokens, model);
    const neverminedCost = calculateRealCost(neverminedTokens, model);
    
    // Calculate REAL savings
    const savings = calculateSavings(directCost, neverminedCost);

    return {
      model,
      testName: testPrompt.name,
      directResult: {
        tokens: directTokens,
        cost: directCost,
        response: data.results.direct.content,
        latency: data.results.direct.latency || 0
      },
      neverminedResult: {
        tokens: neverminedTokens,
        cost: neverminedCost,
        response: data.results.nevermined.content,
        latency: data.results.nevermined.latency || 0
      },
      savings,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to fetch real data:', error);
    throw new Error(`Failed to fetch real data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Fetch multiple real test results for dashboard
 * This replaces the entire mock dataset with real API data
 */
export const fetchRealDashboardData = async (
  requestVolume: number = 1000
): Promise<RealDashboardData> => {
  console.log('🔄 Fetching REAL dashboard data across multiple models...');

  try {
    // Test multiple models with different prompts to get diverse real data
    const testConfigs = [
      { model: 'gpt-3.5-turbo', promptIndex: 0 },
      { model: 'gpt-4', promptIndex: 1 },
      { model: 'gpt-3.5-turbo-0125', promptIndex: 2 }
    ];

    // Fetch real data for each configuration
    const realResults = await Promise.all(
      testConfigs.map(config => 
        fetchRealTestData(config.model, config.promptIndex)
      )
    );

    // Transform real results into dashboard format
    const agents = realResults.map(result => ({
      name: `${result.testName} Agent`,
      model: result.model,
      realTokens: result.directResult.tokens,
      realCost: result.directResult.cost,
      realLatency: result.directResult.latency,
      lastUpdated: result.timestamp
    }));

    // Calculate total real savings across all tests
    const totalAbsoluteSavings = realResults.reduce(
      (sum, result) => sum + result.savings.absolute, 0
    );
    
    const avgSavingsPercentage = realResults.reduce(
      (sum, result) => sum + result.savings.percentage, 0
    ) / realResults.length;

    const dashboardData: RealDashboardData = {
      agents,
      totalSavings: {
        absolute: totalAbsoluteSavings,
        percentage: avgSavingsPercentage
      },
      realRequestVolume: requestVolume,
      realTimeData: true
    };

    console.log('✅ Real dashboard data compiled:', dashboardData);
    return dashboardData;

  } catch (error) {
    console.error('❌ Failed to fetch real dashboard data:', error);
    throw new Error(`Failed to fetch real dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Fetch real analytics data for charts
 * Replaces demo data with authentic cost comparisons
 */
export const fetchRealAnalyticsData = async (): Promise<Array<{
  testName: string;
  model: string;
  arizeDirectCost: number;
  arizeDirectTokens: number;
  arizeNeverminedCost: number;
  arizeNeverminedTokens: number;
  costSavings: number;
  tokenEfficiency: number;
}>> => {
  console.log('🔄 Fetching REAL analytics data...');

  try {
    // Run tests across all available prompts and models
    const analyticsPromises = REAL_TEST_PROMPTS.slice(0, 3).map(async (testPrompt, index) => {
      const model = ['gpt-3.5-turbo', 'gpt-4', 'gpt-3.5-turbo-0125'][index];
      const realData = await fetchRealTestData(model, index);

      return {
        testName: realData.testName,
        model: realData.model,
        arizeDirectCost: realData.directResult.cost.totalCost,
        arizeDirectTokens: realData.directResult.tokens.total_tokens,
        arizeNeverminedCost: realData.neverminedResult.cost.totalCost,
        arizeNeverminedTokens: realData.neverminedResult.tokens.total_tokens,
        costSavings: realData.savings.absolute,
        tokenEfficiency: realData.directResult.tokens.total_tokens > 0 
          ? realData.neverminedResult.tokens.total_tokens / realData.directResult.tokens.total_tokens
          : 1
      };
    });

    const analyticsData = await Promise.all(analyticsPromises);
    console.log('✅ Real analytics data:', analyticsData);
    
    return analyticsData;

  } catch (error) {
    console.error('❌ Failed to fetch real analytics data:', error);
    throw new Error(`Failed to fetch real analytics data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Calculate real business impact based on actual usage patterns
 * NO MORE ASSUMPTIONS - uses real token consumption and costs
 */
export const calculateRealBusinessImpact = async (
  monthlyRequestVolume: number
): Promise<{
  costSavings: { absolute: number; percentage: number };
  qualityAssurance: { tokenEfficiency: number; responseQuality: string };
  projectedSavings: { monthly: number; yearly: number };
}> => {
  try {
    // Get real cost data across multiple tests
    const realData = await fetchRealAnalyticsData();
    
    // Calculate average real costs
    const avgDirectCost = realData.reduce((sum, test) => sum + test.arizeDirectCost, 0) / realData.length;
    const avgNeverminedCost = realData.reduce((sum, test) => sum + test.arizeNeverminedCost, 0) / realData.length;
    const avgTokenEfficiency = realData.reduce((sum, test) => sum + test.tokenEfficiency, 0) / realData.length;
    
    // Calculate real savings
    const savingsPerRequest = avgDirectCost - avgNeverminedCost;
    const savingsPercentage = avgDirectCost > 0 ? (savingsPerRequest / avgDirectCost) * 100 : 0;
    
    // Project real savings based on actual usage
    const monthlySavings = savingsPerRequest * monthlyRequestVolume;
    const yearlySavings = monthlySavings * 12;

    return {
      costSavings: {
        absolute: savingsPerRequest,
        percentage: savingsPercentage
      },
      qualityAssurance: {
        tokenEfficiency: avgTokenEfficiency,
        responseQuality: avgTokenEfficiency > 1.1 ? "Higher efficiency" : "Comparable efficiency"
      },
      projectedSavings: {
        monthly: monthlySavings,
        yearly: yearlySavings
      }
    };

  } catch (error) {
    console.error('❌ Failed to calculate real business impact:', error);
    throw new Error(`Failed to calculate real business impact: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Export test prompts for other components to use
export { REAL_TEST_PROMPTS }; 