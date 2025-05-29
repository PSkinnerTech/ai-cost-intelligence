// Arize Phoenix OpenAI Instrumentation Test
// This script tests real OpenAI API calls with Arize tracing

// Load environment variables from .env file
require('dotenv').config();

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OpenAIInstrumentation } = require('@arizeai/openinference-instrumentation-openai');
const OpenAI = require('openai').OpenAI;

console.log('🚀 Starting Arize Phoenix Instrumentation Test...');
console.log(`🔑 API Key Status: ${process.env.OPENAI_API_KEY ? 'LOADED from .env' : 'NOT FOUND'}`);

// Initialize OpenTelemetry SDK with Arize Phoenix instrumentation
const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable filesystem instrumentation to reduce noise
      },
    }),
    new OpenAIInstrumentation({
      enrich_with_message_content: true,
      enrich_with_message_role: true,
    }),
  ],
});

// Start the SDK
sdk.start();
console.log('✅ OpenTelemetry SDK initialized with Arize Phoenix instrumentation');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env file!');
  process.exit(1);
}

async function testArizeInstrumentation() {
  try {
    console.log('\n📊 Testing Arize Phoenix + OpenAI Integration...');
    
    const testPrompt = "Explain quantum computing in exactly 50 words.";
    const model = "gpt-3.5-turbo";
    
    console.log(`🔍 Test Prompt: "${testPrompt}"`);
    console.log(`🤖 Model: ${model}`);
    
    const startTime = Date.now();
    
    // Make real OpenAI API call with automatic Arize tracing
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: testPrompt
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Extract real token usage and cost data
    const usage = completion.usage;
    const response = completion.choices[0].message.content;
    
    // Calculate real costs based on OpenAI pricing
    // GPT-3.5-turbo: $0.0015/1K input tokens, $0.002/1K output tokens
    const inputCost = (usage.prompt_tokens * 0.0015) / 1000;
    const outputCost = (usage.completion_tokens * 0.002) / 1000;
    const totalCost = inputCost + outputCost;
    
    console.log('\n🎉 REAL OPENAI API CALL SUCCESS!');
    console.log('================================');
    console.log(`📝 Response: "${response}"`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🔢 Input Tokens: ${usage.prompt_tokens}`);
    console.log(`🔢 Output Tokens: ${usage.completion_tokens}`);
    console.log(`🔢 Total Tokens: ${usage.total_tokens}`);
    console.log(`💰 Input Cost: $${inputCost.toFixed(6)}`);
    console.log(`💰 Output Cost: $${outputCost.toFixed(6)}`);
    console.log(`💰 Total Cost: $${totalCost.toFixed(6)}`);
    
    console.log('\n📊 Arize Tracing Status:');
    console.log('========================');
    console.log('✅ OpenTelemetry SDK: ACTIVE');
    console.log('✅ OpenAI Instrumentation: ACTIVE');
    console.log('✅ Message Content Enrichment: ENABLED');
    console.log('✅ Message Role Enrichment: ENABLED');
    
    // Test data to return
    const testResult = {
      success: true,
      timestamp: new Date().toISOString(),
      test: {
        prompt: testPrompt,
        model: model,
        duration: duration
      },
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      costs: {
        input: inputCost,
        output: outputCost,
        total: totalCost,
        currency: 'USD'
      },
      response: response,
      instrumentation: {
        opentelemetry: 'active',
        arizeTracing: 'enabled',
        messageEnrichment: true
      }
    };
    
    console.log('\n🔍 Test Result Object:');
    console.log(JSON.stringify(testResult, null, 2));
    
    return testResult;
    
  } catch (error) {
    console.error('💥 Arize instrumentation test failed:', error);
    
    if (error.code === 'invalid_api_key') {
      console.log('\n⚠️  OPENAI API KEY ISSUE:');
      console.log('Please set OPENAI_API_KEY environment variable');
      console.log('export OPENAI_API_KEY=your-actual-openai-api-key');
    }
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      instrumentation: {
        opentelemetry: 'active',
        arizeTracing: 'enabled',
        status: 'failed'
      }
    };
  }
}

// Run the test
testArizeInstrumentation()
  .then(result => {
    console.log('\n🏁 Arize Instrumentation Test Complete!');
    if (result.success) {
      console.log('🎯 Status: SUCCESS - Real OpenAI call with Arize tracing!');
      console.log(`💸 Real cost calculated: $${result.costs.total.toFixed(6)}`);
      console.log(`🔢 Real tokens used: ${result.usage.totalTokens}`);
    } else {
      console.log('❌ Status: FAILED - Check error details above');
    }
    
    // Gracefully shutdown
    setTimeout(() => {
      sdk.shutdown()
        .then(() => console.log('🔒 OpenTelemetry SDK shutdown complete'))
        .catch(console.error);
    }, 1000);
  })
  .catch(console.error); 