// test-environment.js
// Comprehensive environment and API key validation
require('../dist/instrumentation');
const { OpenAI } = require('openai');

// ANSI color codes for better output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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

async function validateEnvironment() {
  console.log(`${colors.bold}🧪 Environment & API Key Validation${colors.reset}\n`);

  // 1. Check environment file existence
  section('📄 Environment File Check');
  
  try {
    const fs = require('fs');
    if (fs.existsSync('.env')) {
      colorLog('green', '✅', '.env file found');
    } else {
      colorLog('yellow', '⚠️ ', '.env file not found');
      colorLog('blue', 'ℹ️ ', 'Copy env.template to .env and configure your keys');
    }
  } catch (error) {
    colorLog('red', '❌', 'Error checking .env file: ' + error.message);
  }

  // 2. Environment Variables Check
  section('🔧 Environment Variables');
  
  const requiredVars = {
    // Phoenix Configuration
    'PHOENIX_COLLECTOR_ENDPOINT': { default: 'http://localhost:6006', required: false },
    'PHOENIX_PROJECT_NAME': { default: 'prompt-ab-testing', required: false },
    'PHOENIX_API_KEY': { required: false, description: 'Only needed for Phoenix Cloud' },
    
    // Service Configuration
    'SERVICE_NAME': { default: 'ab-testing-gui', required: false },
    'SERVICE_VERSION': { default: '1.0.0', required: false },
    'NODE_ENV': { default: 'development', required: false },
    
    // API Keys
    'OPENAI_API_KEY': { required: true, description: 'Required for OpenAI API calls' },
    'ARIZE_SPACE_ID': { required: false, description: 'Required for Arize integration' },
    'ARIZE_API_KEY': { required: false, description: 'Required for Arize integration' },
    'ARIZE_MODEL_ID': { default: 'ab-testing-gui', required: false },
    'ARIZE_MODEL_VERSION': { default: '1.0.0', required: false },
    
    // Server Configuration
    'PORT': { default: '3001', required: false },
    'FRONTEND_URL': { default: 'http://localhost:3000', required: false }
  };

  let missingRequired = [];
  let warnings = [];

  for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    
    if (value) {
      // Mask sensitive values
      const displayValue = varName.includes('API_KEY') || varName.includes('SECRET') 
        ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}`
        : value;
      colorLog('green', '✅', `${varName}: ${displayValue}`);
    } else if (config.required) {
      colorLog('red', '❌', `${varName}: Missing (required)`);
      missingRequired.push(varName);
      if (config.description) {
        colorLog('blue', '   ', config.description);
      }
    } else {
      const defaultMsg = config.default ? ` (using default: ${config.default})` : '';
      colorLog('yellow', '⚠️ ', `${varName}: Not set${defaultMsg}`);
      if (config.description) {
        colorLog('blue', '   ', config.description);
      }
      warnings.push(varName);
    }
  }

  // 3. API Key Validation
  section('🔑 API Key Validation');

  // Test OpenAI API Key
  if (process.env.OPENAI_API_KEY) {
    try {
      colorLog('blue', '🧪', 'Testing OpenAI API key...');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Make a minimal API call to test the key
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 1,
      });

      colorLog('green', '✅', `OpenAI API key valid (used ${response.usage?.total_tokens || 'unknown'} tokens)`);
      colorLog('blue', '   ', `Model: ${response.model}`);
    } catch (error) {
      colorLog('red', '❌', 'OpenAI API key validation failed');
      colorLog('red', '   ', error.message);
    }
  } else {
    colorLog('red', '❌', 'OpenAI API key not provided - cannot test');
  }

  // 4. Service Connectivity Tests
  section('🌐 Service Connectivity');

  // Test Phoenix connectivity
  try {
    colorLog('blue', '🧪', 'Testing Phoenix connectivity...');
    const phoenixEndpoint = process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006';
    const phoenixResponse = await fetch(`${phoenixEndpoint}/health`);
    
    if (phoenixResponse.ok) {
      colorLog('green', '✅', `Phoenix server reachable at ${phoenixEndpoint}`);
      
      // Test trace endpoint
      try {
        const traceResponse = await fetch(`${phoenixEndpoint}/v1/traces`, {
          method: 'HEAD'
        });
        colorLog('green', '✅', 'Phoenix trace endpoint accessible');
      } catch (error) {
        colorLog('yellow', '⚠️ ', 'Phoenix trace endpoint test failed');
      }
    } else {
      colorLog('red', '❌', `Phoenix server not reachable (status: ${phoenixResponse.status})`);
    }
  } catch (error) {
    colorLog('red', '❌', 'Phoenix connectivity failed: ' + error.message);
    colorLog('blue', 'ℹ️ ', 'Make sure Phoenix is running: phoenix serve');
  }

  // Test Arize connectivity (if configured)
  if (process.env.ARIZE_SPACE_ID && process.env.ARIZE_API_KEY) {
    try {
      colorLog('blue', '🧪', 'Testing Arize connectivity...');
      
      // We can't easily test Arize connectivity without sending a trace,
      // but we can validate the credential format
      const spaceId = process.env.ARIZE_SPACE_ID;
      const apiKey = process.env.ARIZE_API_KEY;
      
      if (spaceId.length > 10 && apiKey.length > 10) {
        colorLog('green', '✅', 'Arize credentials format looks valid');
        colorLog('blue', '   ', 'Actual connectivity will be tested during trace send');
      } else {
        colorLog('yellow', '⚠️ ', 'Arize credentials seem too short - please verify');
      }
      
    } catch (error) {
      colorLog('red', '❌', 'Arize credential validation failed: ' + error.message);
    }
  } else {
    colorLog('yellow', '⚠️ ', 'Arize not configured (optional)');
    colorLog('blue', 'ℹ️ ', 'Add ARIZE_SPACE_ID and ARIZE_API_KEY to enable Arize integration');
  }

  // 5. Integration Test
  section('🔄 Integration Test');
  
  if (process.env.OPENAI_API_KEY) {
    try {
      colorLog('blue', '🧪', 'Running end-to-end integration test...');
      
      const { withSession, tracedOperation } = require('../dist/instrumentation');
      const openai = new OpenAI();
      const sessionId = 'env-test-' + Date.now();
      
      const result = await withSession(sessionId, async () => {
        return tracedOperation('environment-validation-test', {
          'test.type': 'environment-validation',
          'test.timestamp': new Date().toISOString(),
          'validation.status': 'running',
        }, async () => {
          const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Say "Environment test successful!" in exactly 4 words.' }],
            max_tokens: 10,
            temperature: 0,
          });
          
          return response;
        });
      });
      
      colorLog('green', '✅', 'End-to-end integration test successful!');
      colorLog('blue', '   ', `Response: ${result.choices[0].message.content}`);
      colorLog('blue', '   ', `Tokens: ${result.usage?.total_tokens}`);
      colorLog('blue', '   ', `Session ID: ${sessionId}`);
      
    } catch (error) {
      colorLog('red', '❌', 'Integration test failed: ' + error.message);
    }
  } else {
    colorLog('yellow', '⚠️ ', 'Skipping integration test (no OpenAI API key)');
  }

  // 6. Summary and Recommendations
  section('📋 Summary & Recommendations');
  
  if (missingRequired.length === 0) {
    colorLog('green', '🎉', 'All required environment variables are configured!');
  } else {
    colorLog('red', '❌', `Missing ${missingRequired.length} required variables: ${missingRequired.join(', ')}`);
  }
  
  if (warnings.length > 0) {
    colorLog('yellow', '⚠️ ', `${warnings.length} optional variables not set: ${warnings.join(', ')}`);
  }

  // Specific recommendations
  console.log('\n📝 Recommendations:');
  
  if (!process.env.OPENAI_API_KEY) {
    colorLog('blue', '1.', 'Get OpenAI API key from https://platform.openai.com/api-keys');
  }
  
  if (!process.env.ARIZE_SPACE_ID || !process.env.ARIZE_API_KEY) {
    colorLog('blue', '2.', 'Optional: Get Arize credentials from https://app.arize.com (Space Settings)');
  }
  
  if (!require('fs').existsSync('.env')) {
    colorLog('blue', '3.', 'Copy env.template to .env and configure your keys');
  }
  
  console.log('\n📍 Next Steps:');
  colorLog('blue', '•', 'Phoenix UI: http://localhost:6006');
  colorLog('blue', '•', 'Arize Dashboard: https://app.arize.com');
  
  if (missingRequired.length === 0) {
    colorLog('green', '•', 'Ready to build the API server and services! 🚀');
  } else {
    colorLog('yellow', '•', 'Fix missing variables, then run this test again');
  }
}

// Wait for instrumentation to load, then run validation
setTimeout(validateEnvironment, 1000); 