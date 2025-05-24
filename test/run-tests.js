#!/usr/bin/env node
// run-tests.js
// Convenient test runner for all A/B Testing GUI tests

const { spawn } = require('child_process');
const path = require('path');

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

const tests = {
  env: {
    file: 'test-environment.js',
    name: 'Environment & API Key Validation',
    description: 'Validates environment variables and API connectivity'
  },
  instrumentation: {
    file: 'test-instrumentation.js', 
    name: 'OpenTelemetry Instrumentation',
    description: 'Tests tracing setup and Phoenix connectivity'
  },
  dual: {
    file: 'test-dual-destinations.js',
    name: 'Dual Destination Tracing',
    description: 'Tests Phoenix + Arize tracing integration'
  },
  arize: {
    file: 'test-arize-verification.js',
    name: 'Arize Verification',
    description: 'Specific verification that traces reach Arize'
  },
  api: {
    file: 'test-api-endpoints.js',
    name: 'API Endpoints',
    description: 'Comprehensive backend API testing (9 tests)'
  }
};

function showUsage() {
  console.log(`${colors.bold}${colors.cyan}🧪 A/B Testing GUI Test Runner${colors.reset}\n`);
  
  console.log('Usage:');
  console.log(`  ${colors.green}node test/run-tests.js [test-name]${colors.reset}\n`);
  
  console.log('Available tests:');
  Object.entries(tests).forEach(([key, test]) => {
    console.log(`  ${colors.yellow}${key.padEnd(15)}${colors.reset} - ${test.name}`);
    console.log(`  ${' '.repeat(17)}${colors.blue}${test.description}${colors.reset}`);
  });
  
  console.log(`\n  ${colors.yellow}all${' '.repeat(12)}${colors.reset} - Run all tests in sequence`);
  
  console.log('\nExamples:');
  console.log(`  ${colors.green}node test/run-tests.js env${colors.reset}          # Test environment only`);
  console.log(`  ${colors.green}node test/run-tests.js api${colors.reset}          # Test API endpoints only`);
  console.log(`  ${colors.green}node test/run-tests.js all${colors.reset}          # Run all tests`);
  console.log(`  ${colors.green}node test/run-tests.js${colors.reset}              # Show this help`);
}

async function runTest(testKey) {
  const test = tests[testKey];
  if (!test) {
    colorLog('red', '❌', `Unknown test: ${testKey}`);
    return false;
  }

  colorLog('blue', '🧪', `Running ${test.name}...`);
  console.log(`${colors.blue}   ${test.description}${colors.reset}\n`);

  return new Promise((resolve) => {
    const testProcess = spawn('node', [path.join(__dirname, test.file)], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')  // Run from project root
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        colorLog('green', '✅', `${test.name} completed successfully`);
        resolve(true);
      } else {
        colorLog('red', '❌', `${test.name} failed (exit code: ${code})`);
        resolve(false);
      }
    });

    testProcess.on('error', (error) => {
      colorLog('red', '❌', `Failed to start ${test.name}: ${error.message}`);
      resolve(false);
    });
  });
}

async function runAllTests() {
  colorLog('cyan', '🚀', 'Running all tests in sequence...\n');
  
  const results = {};
  let totalPassed = 0;
  let totalTests = 0;

  // Run tests in a logical order
  const testOrder = ['env', 'instrumentation', 'api', 'dual', 'arize'];
  
  for (const testKey of testOrder) {
    totalTests++;
    console.log(`${'='.repeat(60)}`);
    
    const success = await runTest(testKey);
    results[testKey] = success;
    
    if (success) {
      totalPassed++;
    }
    
    console.log(''); // Add spacing between tests
  }

  // Summary
  console.log(`${'='.repeat(60)}`);
  colorLog('cyan', '📊', 'Test Suite Summary');
  console.log(`${'='.repeat(60)}`);
  
  Object.entries(results).forEach(([testKey, success]) => {
    const symbol = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    colorLog(color, symbol, `${tests[testKey].name}`);
  });
  
  console.log('');
  const passRate = (totalPassed / totalTests * 100).toFixed(1);
  
  if (totalPassed === totalTests) {
    colorLog('green', '🎉', `All tests passed! (${totalPassed}/${totalTests}) - ${passRate}%`);
  } else {
    colorLog('yellow', '⚠️', `Tests passed: ${totalPassed}/${totalTests} (${passRate}%)`);
  }
}

async function main() {
  const testName = process.argv[2];

  if (!testName) {
    showUsage();
    return;
  }

  if (testName === 'all') {
    await runAllTests();
  } else if (tests[testName]) {
    await runTest(testName);
  } else {
    colorLog('red', '❌', `Unknown test: ${testName}`);
    console.log('');
    showUsage();
    process.exit(1);
  }
}

main().catch(console.error); 