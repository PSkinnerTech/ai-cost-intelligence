// test-ab-testing-endpoints.js
// Comprehensive testing of A/B testing API endpoints

const axios = require('axios');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

async function testABTestingEndpoints() {
  console.log(`${colors.bold}🧪 A/B Testing API Endpoints Test Suite${colors.reset}\n`);
  
  let passedTests = 0;
  let totalTests = 0;
  let createdData = {
    variants: [],
    inputs: [],
    tests: []
  };

  async function runTest(name, testFn) {
    totalTests++;
    try {
      colorLog('blue', '🧪', `Testing ${name}...`);
      const result = await testFn();
      colorLog('green', '✅', `${name} - PASSED`);
      if (result) {
        colorLog('blue', '   ', `Result: ${JSON.stringify(result, null, 2).substring(0, 100)}...`);
      }
      passedTests++;
      return result;
    } catch (error) {
      colorLog('red', '❌', `${name} - FAILED: ${error.message}`);
      return null;
    }
  }

  // ============================
  // HEALTH CHECK
  // ============================
  section('🏥 Health Check');
  
  await runTest('Server Health', async () => {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  });

  await runTest('Statistics Endpoint', async () => {
    const response = await axios.get(`${API_BASE}/api/stats`);
    return response.data;
  });

  // ============================
  // PROMPT VARIANT MANAGEMENT
  // ============================
  section('📝 Prompt Variant Management');

  // Create first variant
  const variantA = await runTest('Create Variant A (Direct Style)', async () => {
    const response = await axios.post(`${API_BASE}/api/prompts`, {
      name: 'Direct Answer Style',
      description: 'Direct, concise answering style',
      template: 'Answer the following question directly and concisely: {{question}}',
      variables: [
        { name: 'question', required: true, description: 'The question to answer' }
      ],
      model: 'gpt-3.5-turbo',
      parameters: { temperature: 0.3, maxTokens: 100 },
      tags: ['test', 'direct']
    });
    if (response.data.success) {
      createdData.variants.push(response.data.variant);
    }
    return response.data;
  });

  // Create second variant
  const variantB = await runTest('Create Variant B (Explanatory Style)', async () => {
    const response = await axios.post(`${API_BASE}/api/prompts`, {
      name: 'Explanatory Teaching Style',
      description: 'Detailed, educational answering style',
      template: 'Provide a comprehensive explanation for the following question, including context and examples: {{question}}',
      variables: [
        { name: 'question', required: true, description: 'The question to answer' }
      ],
      model: 'gpt-3.5-turbo',
      parameters: { temperature: 0.7, maxTokens: 300 },
      tags: ['test', 'explanatory']
    });
    if (response.data.success) {
      createdData.variants.push(response.data.variant);
    }
    return response.data;
  });

  // List variants
  await runTest('List All Variants', async () => {
    const response = await axios.get(`${API_BASE}/api/prompts`);
    colorLog('blue', '   ', `Found ${response.data.total} variants`);
    return response.data;
  });

  // Get specific variant
  if (createdData.variants.length > 0) {
    await runTest('Get Variant by ID', async () => {
      const variantId = createdData.variants[0].id;
      const response = await axios.get(`${API_BASE}/api/prompts/${variantId}`);
      return response.data;
    });
  }

  // Update variant
  if (createdData.variants.length > 0) {
    await runTest('Update Variant', async () => {
      const variantId = createdData.variants[0].id;
      const response = await axios.put(`${API_BASE}/api/prompts/${variantId}`, {
        description: 'Updated: Direct, concise answering style with optimization'
      });
      return response.data;
    });
  }

  // ============================
  // TEST INPUT MANAGEMENT
  // ============================
  section('📋 Test Input Management');

  // Create test inputs
  const testQuestions = [
    'What is machine learning?',
    'How does artificial intelligence work?',
    'Explain neural networks in simple terms.',
    'What are the benefits of cloud computing?',
    'How do databases store information?'
  ];

  for (let i = 0; i < testQuestions.length; i++) {
    const input = await runTest(`Create Test Input ${i + 1}`, async () => {
      const response = await axios.post(`${API_BASE}/api/test-inputs`, {
        prompt: testQuestions[i],
        variables: { question: testQuestions[i] },
        category: 'technology-qa',
        expectedOutput: 'Informative and accurate answer'
      });
      if (response.data.success) {
        createdData.inputs.push(response.data.input);
      }
      return response.data;
    });
  }

  // List test inputs
  await runTest('List All Test Inputs', async () => {
    const response = await axios.get(`${API_BASE}/api/test-inputs`);
    colorLog('blue', '   ', `Found ${response.data.total} test inputs`);
    return response.data;
  });

  // List by category
  await runTest('List Inputs by Category', async () => {
    const response = await axios.get(`${API_BASE}/api/test-inputs?category=technology-qa`);
    colorLog('blue', '   ', `Found ${response.data.total} inputs in 'technology-qa' category`);
    return response.data;
  });

  // ============================
  // TEMPLATE INTERPOLATION
  // ============================
  section('🔄 Template Processing');

  await runTest('Template Interpolation', async () => {
    const response = await axios.post(`${API_BASE}/api/prompts/interpolate`, {
      template: 'Answer this question: {{question}}. Use {{style}} approach.',
      variables: {
        question: 'What is AI?',
        style: 'educational'
      }
    });
    colorLog('blue', '   ', `Interpolated: ${response.data.interpolated}`);
    return response.data;
  });

  await runTest('Variable Extraction', async () => {
    const response = await axios.post(`${API_BASE}/api/prompts/interpolate`, {
      template: 'Hello {{name}}, your score is {{score}} out of {{total}}.'
    });
    colorLog('blue', '   ', `Variables found: ${response.data.variables.map(v => v.name).join(', ')}`);
    return response.data;
  });

  // ============================
  // A/B TEST MANAGEMENT
  // ============================
  section('🧬 A/B Test Management');

  // Create A/B test
  let abTest = null;
  if (createdData.variants.length >= 2 && createdData.inputs.length >= 2) {
    abTest = await runTest('Create A/B Test', async () => {
      const response = await axios.post(`${API_BASE}/api/ab-tests`, {
        name: 'Direct vs Explanatory Style Test',
        description: 'Testing direct answering style vs explanatory teaching style',
        variantIds: [createdData.variants[0].id, createdData.variants[1].id],
        inputIds: createdData.inputs.slice(0, 3).map(input => input.id),
        configuration: {
          minSampleSize: 5,
          confidenceLevel: 0.95,
          trafficSplit: [50, 50],
          maxDuration: 300000, // 5 minutes
          stopOnSignificance: true,
          primaryMetric: 'cost'
        }
      });
      if (response.data.success) {
        createdData.tests.push(response.data.test);
      }
      return response.data;
    });
  } else {
    colorLog('yellow', '⚠️ ', 'Skipping A/B test creation - need at least 2 variants and 2 inputs');
  }

  // List A/B tests
  await runTest('List A/B Tests', async () => {
    const response = await axios.get(`${API_BASE}/api/ab-tests`);
    colorLog('blue', '   ', `Found ${response.data.total} A/B tests`);
    return response.data;
  });

  // Get A/B test details
  if (createdData.tests.length > 0) {
    await runTest('Get A/B Test Details', async () => {
      const testId = createdData.tests[0].id;
      const response = await axios.get(`${API_BASE}/api/ab-tests/${testId}`);
      colorLog('blue', '   ', `Test Status: ${response.data.test.status}`);
      colorLog('blue', '   ', `Variants: ${response.data.test.variants.length}`);
      colorLog('blue', '   ', `Inputs: ${response.data.test.inputs.length}`);
      return response.data;
    });

    // Start A/B test
    await runTest('Start A/B Test', async () => {
      const testId = createdData.tests[0].id;
      const response = await axios.post(`${API_BASE}/api/ab-tests/${testId}/start`);
      colorLog('blue', '   ', `New Status: ${response.data.test.status}`);
      return response.data;
    });

    // Get A/B test results
    await runTest('Get A/B Test Results', async () => {
      const testId = createdData.tests[0].id;
      const response = await axios.get(`${API_BASE}/api/ab-tests/${testId}/results`);
      return response.data;
    });

    // Stop A/B test
    await runTest('Stop A/B Test', async () => {
      const testId = createdData.tests[0].id;
      const response = await axios.post(`${API_BASE}/api/ab-tests/${testId}/stop`);
      colorLog('blue', '   ', `Final Status: ${response.data.test.status}`);
      return response.data;
    });
  }

  // ============================
  // ERROR HANDLING TESTS
  // ============================
  section('🚨 Error Handling');

  await runTest('Invalid Variant Creation', async () => {
    try {
      await axios.post(`${API_BASE}/api/prompts`, {
        name: '', // Invalid - empty name
        description: 'Test',
        template: 'Test'
      });
      throw new Error('Should have failed with empty name');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return { error: 'Correctly rejected invalid input' };
      }
      throw error;
    }
  });

  await runTest('Non-existent Variant Retrieval', async () => {
    try {
      await axios.get(`${API_BASE}/api/prompts/non-existent-id`);
      throw new Error('Should have failed with 404');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return { error: 'Correctly returned 404 for non-existent variant' };
      }
      throw error;
    }
  });

  // ============================
  // FINAL STATISTICS
  // ============================
  section('📊 Final Statistics');

  await runTest('Updated Statistics', async () => {
    const response = await axios.get(`${API_BASE}/api/stats`);
    colorLog('blue', '   ', `Total Variants: ${response.data.stats.totalVariants}`);
    colorLog('blue', '   ', `Total Tests: ${response.data.stats.totalTests}`);
    colorLog('blue', '   ', `Active Tests: ${response.data.stats.activeTests}`);
    colorLog('blue', '   ', `Total Inputs: ${response.data.stats.totalInputs}`);
    return response.data;
  });

  // ============================
  // TEST SUMMARY
  // ============================
  section('🎯 Test Summary');

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  if (successRate === '100.0') {
    colorLog('green', '🎉', `ALL TESTS PASSED! ${passedTests}/${totalTests} (${successRate}%)`);
  } else if (successRate >= '90.0') {
    colorLog('yellow', '⚠️ ', `Most tests passed: ${passedTests}/${totalTests} (${successRate}%)`);
  } else {
    colorLog('red', '❌', `Many tests failed: ${passedTests}/${totalTests} (${successRate}%)`);
  }

  console.log('\n📋 Test Results Summary:');
  colorLog('blue', '•', `Prompt Variants Created: ${createdData.variants.length}`);
  colorLog('blue', '•', `Test Inputs Created: ${createdData.inputs.length}`);
  colorLog('blue', '•', `A/B Tests Created: ${createdData.tests.length}`);
  
  if (successRate === '100.0') {
    console.log('\n🚀 A/B Testing Backend is Ready for Production!');
    console.log('Next Steps:');
    colorLog('green', '1.', 'Build the A/B Test Execution Engine');
    colorLog('green', '2.', 'Add Statistical Analysis Service');
    colorLog('green', '3.', 'Create Frontend Components');
  }
}

// Wait for server to start, then run tests
setTimeout(testABTestingEndpoints, 3000); 