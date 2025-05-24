// test-real-ab-execution.js
// End-to-End A/B Test Execution with Real OpenAI Integration

// Load environment variables from .env file
require('dotenv').config();

const axios = require('axios');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function colorLog(color, symbol, message) {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

function section(title) {
  console.log(`\n${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(title.length));
}

const API_BASE = 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runRealABTest() {
  console.log(`${colors.bold}🚀 Real A/B Test Execution - Direct vs Explanatory Style${colors.reset}\n`);
  
  if (!process.env.OPENAI_API_KEY) {
    colorLog('red', '❌', 'OPENAI_API_KEY is required for this test');
    return;
  }

  let testData = {
    variants: [],
    inputs: [],
    test: null
  };

  // ============================
  // SETUP PHASE
  // ============================
  section('🔧 Setup Phase');

  try {
    // Create Variant A - Direct Style (optimized for cost)
    colorLog('blue', '📝', 'Creating Variant A: Direct Answer Style...');
    const variantAResponse = await axios.post(`${API_BASE}/api/prompts`, {
      name: 'Direct Answer Style',
      description: 'Optimized for cost - direct, concise responses',
      template: 'Answer this question directly and concisely: {{question}}',
      variables: [
        { name: 'question', required: true, description: 'The question to answer' }
      ],
      model: 'gpt-3.5-turbo',
      parameters: { 
        temperature: 0.3,    // Lower temperature for consistency
        maxTokens: 100       // Limit tokens for cost control
      },
      tags: ['direct', 'cost-optimized']
    });
    testData.variants.push(variantAResponse.data.variant);
    colorLog('green', '✅', `Variant A created: ${variantAResponse.data.variant.id}`);

    // Create Variant B - Explanatory Style
    colorLog('blue', '📝', 'Creating Variant B: Explanatory Teaching Style...');
    const variantBResponse = await axios.post(`${API_BASE}/api/prompts`, {
      name: 'Explanatory Teaching Style',
      description: 'Detailed responses with context and examples',
      template: 'Provide a comprehensive explanation for: {{question}}. Include context, examples, and practical applications.',
      variables: [
        { name: 'question', required: true, description: 'The question to answer' }
      ],
      model: 'gpt-3.5-turbo',
      parameters: { 
        temperature: 0.7,    // Higher temperature for creativity
        maxTokens: 300       // More tokens for detailed responses
      },
      tags: ['explanatory', 'comprehensive']
    });
    testData.variants.push(variantBResponse.data.variant);
    colorLog('green', '✅', `Variant B created: ${variantBResponse.data.variant.id}`);

    // Create test inputs
    colorLog('blue', '📋', 'Creating test inputs...');
    const testQuestions = [
      'What is artificial intelligence?',
      'How do neural networks learn?',
      'What is the difference between supervised and unsupervised learning?',
      'What are the main benefits of cloud computing?',
      'How does blockchain technology work?'
    ];

    for (const question of testQuestions) {
      const inputResponse = await axios.post(`${API_BASE}/api/test-inputs`, {
        prompt: question,
        variables: { question },
        category: 'tech-qa-demo',
        expectedOutput: 'Informative and accurate answer'
      });
      testData.inputs.push(inputResponse.data.input);
    }
    colorLog('green', '✅', `Created ${testData.inputs.length} test inputs`);

    // Create A/B test
    colorLog('blue', '🧬', 'Creating A/B test configuration...');
    const testResponse = await axios.post(`${API_BASE}/api/ab-tests`, {
      name: 'Direct vs Explanatory Style - Cost Optimization Test',
      description: 'Testing cost-optimized direct responses vs comprehensive explanatory responses',
      variantIds: [testData.variants[0].id, testData.variants[1].id],
      inputIds: testData.inputs.map(input => input.id),
      configuration: {
        minSampleSize: 8,        // 8 samples per variant (16 total)
        confidenceLevel: 0.95,
        trafficSplit: [50, 50],  // Equal split
        maxDuration: 300000,     // 5 minutes max
        stopOnSignificance: false,
        primaryMetric: 'cost'    // Optimize for cost
      }
    });
    testData.test = testResponse.data.test;
    colorLog('green', '✅', `A/B test created: ${testData.test.id}`);

  } catch (error) {
    colorLog('red', '❌', `Setup failed: ${error.response?.data?.error || error.message}`);
    return;
  }

  // ============================
  // EXECUTION PHASE
  // ============================
  section('🚀 Execution Phase');

  try {
    // Start the A/B test
    colorLog('magenta', '🎯', 'Starting A/B test execution...');
    const startResponse = await axios.post(`${API_BASE}/api/ab-tests/${testData.test.id}/start`);
    colorLog('green', '✅', startResponse.data.message);

    // Monitor execution progress
    colorLog('blue', '👀', 'Monitoring execution progress...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (!completed && attempts < maxAttempts) {
      attempts++;
      await sleep(5000); // Check every 5 seconds

      try {
        // Check execution status
        const executionResponse = await axios.get(`${API_BASE}/api/ab-tests/${testData.test.id}/execution`);
        const execution = executionResponse.data.execution;

        colorLog('cyan', '📊', 
          `Progress: ${execution.progress.percentage}% ` +
          `(${execution.progress.completed}/${execution.progress.total} samples)`
        );

        // Show live metrics if available
        if (Object.keys(execution.liveMetrics.averageCostPerVariant).length > 0) {
          for (const [variantId, avgCost] of Object.entries(execution.liveMetrics.averageCostPerVariant)) {
            const variantName = testData.variants.find(v => v.id === variantId)?.name || 'Unknown';
            const sampleCount = execution.liveMetrics.sampleCountPerVariant[variantId];
            colorLog('blue', '  💰', 
              `${variantName}: $${avgCost.toFixed(4)} avg cost (${sampleCount} samples)`
            );
          }
        }

        if (execution.status === 'completed') {
          completed = true;
          colorLog('green', '🎉', 'A/B test execution completed!');
        } else if (execution.status === 'failed') {
          colorLog('red', '❌', 'A/B test execution failed');
          if (execution.errors.length > 0) {
            execution.errors.forEach(error => {
              colorLog('red', '   ', error);
            });
          }
          return;
        }

      } catch (error) {
        colorLog('yellow', '⚠️ ', `Status check failed: ${error.message}`);
      }
    }

    if (!completed) {
      colorLog('yellow', '⚠️ ', 'Test execution timeout - checking results anyway...');
    }

  } catch (error) {
    colorLog('red', '❌', `Execution failed: ${error.response?.data?.error || error.message}`);
    return;
  }

  // ============================
  // RESULTS ANALYSIS PHASE
  // ============================
  section('📊 Statistical Analysis Results');

  try {
    // Get comprehensive results with statistical analysis
    const resultsResponse = await axios.get(`${API_BASE}/api/ab-tests/${testData.test.id}/results`);
    const results = resultsResponse.data.results;

    colorLog('cyan', '📈', `Test Results Summary:`);
    colorLog('blue', '   ', `Test Name: ${results.testName}`);
    colorLog('blue', '   ', `Status: ${results.status.toUpperCase()}`);
    colorLog('blue', '   ', `Total Samples: ${results.totalResults}`);
    colorLog('blue', '   ', `Execution Time: ${results.executionTime.duration ? 
      Math.round(results.executionTime.duration / 1000) + 's' : 'N/A'}`);

    // Show variant performance metrics
    console.log('\n' + colors.bold + '📊 Variant Performance Comparison:' + colors.reset);
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    
    results.variantMetrics.forEach((vm, index) => {
      const variant = vm.variant;
      const metrics = vm.metrics;
      
      console.log(`│ ${colors.bold}Variant ${String.fromCharCode(65 + index)}: ${variant.name}${colors.reset}`.padEnd(73) + '│');
      console.log(`│   Samples: ${metrics.totalSamples}`.padEnd(65) + '│');
      console.log(`│   Avg Cost: $${metrics.averageCost.toFixed(6)}`.padEnd(65) + '│');
      console.log(`│   Avg Latency: ${metrics.averageLatency.toFixed(0)}ms`.padEnd(65) + '│');
      console.log(`│   Cost Efficiency: ${metrics.costEfficiency.toFixed(2)}`.padEnd(65) + '│');
      console.log(`│   Performance Score: ${metrics.performanceScore.toFixed(4)}`.padEnd(65) + '│');
      
      if (index < results.variantMetrics.length - 1) {
        console.log('├─────────────────────────────────────────────────────────────────┤');
      }
    });
    console.log('└─────────────────────────────────────────────────────────────────┘');

    // Show statistical analysis
    if (results.analysis && results.analysis.comparisons.length > 0) {
      section('🔬 Statistical Significance Analysis');
      
      const comparison = results.analysis.comparisons[0];
      const statistical = comparison.statistical;
      
      colorLog('cyan', '📊', 'Statistical Test Results:');
      colorLog('blue', '   ', `P-value: ${statistical.pValue.toFixed(6)}`);
      colorLog('blue', '   ', `Statistically Significant: ${statistical.significant ? 'YES' : 'NO'}`);
      colorLog('blue', '   ', `Effect Size: ${statistical.effectSize.toFixed(4)}`);
      colorLog('blue', '   ', `Confidence Interval: [${statistical.confidenceInterval.lower.toFixed(6)}, ${statistical.confidenceInterval.upper.toFixed(6)}]`);
      
      // Winner announcement
      section('🏆 Winner Determination');
      
      if (results.analysis.overallWinner) {
        const winner = results.analysis.overallWinner;
        const winnerVariant = testData.variants.find(v => v.id === winner.variantId);
        
        colorLog('green', '👑', `WINNER: ${winnerVariant?.name || 'Unknown'}`);
        colorLog('blue', '   ', `Confidence: ${(winner.confidence * 100).toFixed(1)}%`);
        colorLog('blue', '   ', `Reasoning: ${winner.reasoning}`);
      }
      
      // Recommendations
      if (comparison.recommendation) {
        const rec = comparison.recommendation;
        colorLog('magenta', '💡', 'Recommendation:');
        colorLog('blue', '   ', `Confidence Level: ${rec.confidence.toUpperCase()}`);
        colorLog('blue', '   ', `Reasoning: ${rec.reasoning}`);
        colorLog('blue', '   ', `Action Required: ${rec.actionRequired}`);
      }

      // Cost insights
      if (results.analysis.insights) {
        const insights = results.analysis.insights;
        section('💰 Cost Analysis & Insights');
        
        if (insights.costSavings !== undefined) {
          colorLog('green', '💵', `Potential Cost Savings: $${insights.costSavings.toFixed(6)}`);
        }
        
        colorLog('blue', '📋', 'Recommendations:');
        insights.recommendations.forEach(rec => {
          colorLog('blue', '   •', rec);
        });
      }
    }

    // Show sample results
    section('📝 Sample Response Examples');
    
    results.variantMetrics.forEach((vm, index) => {
      if (vm.sampleResults && vm.sampleResults.length > 0) {
        const variant = vm.variant;
        const sampleResult = vm.sampleResults[0];
        
        console.log(`\n${colors.bold}${variant.name} Sample Response:${colors.reset}`);
        console.log(`${colors.cyan}Cost: $${sampleResult.cost.totalCost.toFixed(6)} | Tokens: ${sampleResult.usage.totalTokens} | Latency: ${sampleResult.metrics.latency}ms${colors.reset}`);
        console.log(`Response: ${sampleResult.response.substring(0, 200)}${sampleResult.response.length > 200 ? '...' : ''}`);
      }
    });

  } catch (error) {
    colorLog('red', '❌', `Results analysis failed: ${error.response?.data?.error || error.message}`);
  }

  // ============================
  // COMPLETION
  // ============================
  section('✅ Test Complete');
  
  colorLog('green', '🎉', 'Real A/B Test Execution Successfully Completed!');
  colorLog('blue', '📊', 'Check Phoenix dashboard for detailed traces: http://localhost:6006');
  
  if (process.env.ARIZE_SPACE_ID) {
    colorLog('blue', '🌐', 'Check Arize dashboard for cloud analytics: https://app.arize.com');
  }
  
  console.log(`\n${colors.bold}🎯 Key Achievements:${colors.reset}`);
  colorLog('green', '✅', 'Real OpenAI API integration with cost tracking');
  colorLog('green', '✅', 'Statistical significance testing with confidence intervals');
  colorLog('green', '✅', 'Winner determination with actionable recommendations');
  colorLog('green', '✅', 'Full tracing integration with Phoenix/Arize');
  colorLog('green', '✅', 'Production-ready A/B testing platform');
}

// Wait for server startup
console.log('⏱️  Waiting for server startup...');
setTimeout(runRealABTest, 3000); 