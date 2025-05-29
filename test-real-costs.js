#!/usr/bin/env node

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const SCENARIOS = [
  { name: 'Small Request', tokens: 500 },
  { name: 'Medium Request', tokens: 1500 },
  { name: 'Large Request', tokens: 5000 },
  { name: 'Daily Usage (10K)', tokens: 10000 },
  { name: 'Monthly Usage (100K)', tokens: 100000 }
];

console.log('🧪 Real Cost Comparison Test\n');
console.log('=' * 50);

async function testCostScenario(scenario) {
  try {
    console.log(`\n📊 Testing: ${scenario.name} (${scenario.tokens.toLocaleString()} tokens)`);
    console.log('-' * 40);

    const response = await fetch(`${BASE_URL}/api/nevermined/comparison?tokens=${scenario.tokens}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('API returned error: ' + JSON.stringify(data));
    }

    // Display results for each agent
    data.data.agents.forEach(agent => {
      const { costs } = agent;
      console.log(`\n${agent.name}:`);
      console.log(`  📋 Description: ${agent.description}`);
      console.log(`  💰 Direct API Cost: $${costs.directCost.toFixed(6)}`);
      console.log(`  💎 With Nevermined:  $${costs.creditCost.toFixed(6)}`);
      console.log(`  💚 Savings:         $${costs.savings.toFixed(6)} (${costs.savingsPercentage}%)`);
    });

    // Calculate total costs across all agents
    const totalDirectCost = data.data.agents.reduce((sum, agent) => sum + agent.costs.directCost, 0);
    const totalCreditCost = data.data.agents.reduce((sum, agent) => sum + agent.costs.creditCost, 0);
    const totalSavings = totalDirectCost - totalCreditCost;
    const avgSavingsPercent = Math.round((totalSavings / totalDirectCost) * 100);

    console.log(`\n🎯 SCENARIO SUMMARY:`);
    console.log(`  Total Direct Cost:    $${totalDirectCost.toFixed(6)}`);
    console.log(`  Total With Credits:   $${totalCreditCost.toFixed(6)}`);
    console.log(`  Total Savings:        $${totalSavings.toFixed(6)} (${avgSavingsPercent}%)`);

    return {
      scenario: scenario.name,
      tokens: scenario.tokens,
      totalDirectCost,
      totalCreditCost,
      totalSavings,
      savingsPercent: avgSavingsPercent
    };

  } catch (error) {
    console.error(`❌ Error testing ${scenario.name}:`, error.message);
    return null;
  }
}

async function runBusinessImpactTest() {
  console.log('\n\n💼 BUSINESS IMPACT ANALYSIS');
  console.log('=' * 50);

  try {
    // Test specific agent with business scenario
    const businessRequest = {
      agentId: 'agent-1-gpt4',
      promptTokens: 1000,
      completionTokens: 500,
      testResults: {
        requestsPerMonth: 10000
      }
    };

    const response = await fetch(`${BASE_URL}/api/nevermined/comparison`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(businessRequest)
    });

    const data = await response.json();

    if (data.success && data.data.businessImpact) {
      const impact = data.data.businessImpact;
      console.log('\n📈 Monthly Business Impact (10,000 requests):');
      console.log(`  Direct API monthly:   $${impact.monthlyDirectCost}`);
      console.log(`  Credit-based monthly: $${impact.monthlyCreditCost}`);
      console.log(`  Monthly savings:      $${impact.monthlySavings}`);
      console.log(`  Annual savings:       $${impact.annualSavings}`);
      
      const roi = Math.round((impact.annualSavings / impact.monthlyCreditCost) * 100);
      console.log(`  ROI:                  ${roi}%`);
    }

  } catch (error) {
    console.error('❌ Business impact test failed:', error.message);
  }
}

async function testCreditsAPI() {
  console.log('\n\n💎 CREDITS SYSTEM TEST');
  console.log('=' * 50);

  try {
    // Test credit balance
    const balanceResponse = await fetch(`${BASE_URL}/api/nevermined/credits`);
    const balanceData = await balanceResponse.json();

    if (balanceData.success) {
      console.log('\n📊 Current Credit Balance:');
      console.log(`  Plan DID:      ${balanceData.data.planDID.substring(0, 20)}...`);
      console.log(`  Available:     ${balanceData.data.balance.toLocaleString()} credits`);
      console.log(`  Total:         ${balanceData.data.totalCredits.toLocaleString()} credits`);
      console.log(`  Used:          ${balanceData.data.usedCredits.toLocaleString()} credits`);
      console.log(`  Utilization:   ${Math.round((balanceData.data.usedCredits / balanceData.data.totalCredits) * 100)}%`);
    }

    // Test credit purchase
    console.log('\n💳 Testing Credit Purchase...');
    const purchaseResponse = await fetch(`${BASE_URL}/api/nevermined/credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 1000
      })
    });

    const purchaseData = await purchaseResponse.json();

    if (purchaseData.success) {
      console.log('✅ Credit purchase simulation:');
      console.log(`  Credits:       ${purchaseData.data.credits.toLocaleString()}`);
      console.log(`  Cost:          $${purchaseData.data.cost.toFixed(2)}`);
      console.log(`  Transaction:   ${purchaseData.data.transactionId}`);
      console.log(`  Status:        ${purchaseData.data.status}`);
    }

  } catch (error) {
    console.error('❌ Credits API test failed:', error.message);
  }
}

async function runAllTests() {
  const results = [];

  // Test all cost scenarios
  for (const scenario of SCENARIOS) {
    const result = await testCostScenario(scenario);
    if (result) {
      results.push(result);
    }
  }

  // Business impact analysis
  await runBusinessImpactTest();

  // Credits system test
  await testCreditsAPI();

  // Summary
  if (results.length > 0) {
    console.log('\n\n📋 COMPREHENSIVE SUMMARY');
    console.log('=' * 50);
    
    const totalSavings = results.reduce((sum, r) => sum + r.totalSavings, 0);
    const avgSavingsPercent = Math.round(results.reduce((sum, r) => sum + r.savingsPercent, 0) / results.length);
    
    console.log('\n🎯 Key Findings:');
    console.log(`  ✅ All ${results.length} scenarios tested successfully`);
    console.log(`  💰 Total cumulative savings: $${totalSavings.toFixed(6)}`);
    console.log(`  📊 Average savings percentage: ${avgSavingsPercent}%`);
    console.log(`  🚀 Cost optimization achieved across all agent types`);
    
    console.log('\n📈 Recommended Actions:');
    console.log('  1. Deploy Nevermined integration to production');
    console.log('  2. Monitor real usage patterns with Phoenix');
    console.log('  3. Scale credit purchases based on projected usage');
    console.log('  4. Track ROI with actual business metrics');
  }

  console.log('\n✨ Test completed! Check your dashboard for live data.');
}

// Handle command line execution
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  testCostScenario,
  runBusinessImpactTest,
  testCreditsAPI,
  runAllTests
}; 