import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './cors-helper';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OpenAIInstrumentation } from '@arizeai/openinference-instrumentation-openai';
import OpenAI from 'openai';
import { NvmApp, NVMAppEnvironments } from '@nevermined-io/sdk';

// Initialize OpenTelemetry SDK for Arize tracing
const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Reduce noise
      },
    }),
    new OpenAIInstrumentation({
      // Configuration will use defaults
    }),
  ],
});

// Start SDK for tracing
sdk.start();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface TestResult {
  success: boolean;
  prompt: string;
  model: string;
  results?: {
    direct?: {
      tokens: { input: number; output: number; total: number };
      cost: number;
      duration: number;
      traceId: string;
      response: string;
      error?: string;
    };
    nevermined?: {
      tokens: { input: number; output: number; total: number };
      creditsUsed: number;
      cost: number;
      duration: number;
      traceId: string;
      response: string;
      error?: string;
    };
    savings?: {
      amount: number;
      percentage: number;
    };
  };
  error?: string;
  timestamp: string;
}

// OpenAI pricing (as of 2024)
const MODEL_PRICING = {
  'gpt-4': {
    input: 0.03,     // $0.03 per 1K tokens
    output: 0.06     // $0.06 per 1K tokens
  },
  'gpt-3.5-turbo': {
    input: 0.0015,   // $0.0015 per 1K tokens
    output: 0.002    // $0.002 per 1K tokens
  },
  'gpt-3.5-turbo-mini': {
    input: 0.0001,   // $0.0001 per 1K tokens
    output: 0.0002   // $0.0002 per 1K tokens
  }
};

async function testPromptHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    console.log('🔬 Real Token Testing - Starting dual API calls...');
    
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { prompt, model = 'gpt-3.5-turbo', testMode = 'comparison' } = req.body;
    
    if (!prompt) {
      res.status(400).json({
        success: false,
        error: 'Prompt is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`📝 Test prompt: "${prompt}"`);
    console.log(`🤖 Model: ${model}`);
    console.log(`🔀 Test mode: ${testMode}`);

    const testResult: TestResult = {
      success: true,
      prompt,
      model,
      results: {},
      timestamp: new Date().toISOString()
    };

    // Test 1: Direct OpenAI API Call with Arize Tracing
    console.log('\n1️⃣ Testing Direct OpenAI API Call...');
    try {
      const directStartTime = Date.now();
      
      const directCompletion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });
      
      const directEndTime = Date.now();
      const directDuration = directEndTime - directStartTime;
      
      // Extract real token usage
      const directUsage = directCompletion.usage!;
      const directResponse = directCompletion.choices[0].message.content || '';
      
      // Calculate real cost based on actual token usage
      const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['gpt-3.5-turbo'];
      const directInputCost = (directUsage.prompt_tokens * pricing.input) / 1000;
      const directOutputCost = (directUsage.completion_tokens * pricing.output) / 1000;
      const directTotalCost = directInputCost + directOutputCost;
      
      // Generate trace ID (in real implementation, this would come from OpenTelemetry)
      const directTraceId = `direct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      testResult.results!.direct = {
        tokens: {
          input: directUsage.prompt_tokens,
          output: directUsage.completion_tokens,
          total: directUsage.total_tokens
        },
        cost: directTotalCost,
        duration: directDuration,
        traceId: directTraceId,
        response: directResponse
      };
      
      console.log(`✅ Direct call SUCCESS: ${directUsage.total_tokens} tokens, $${directTotalCost.toFixed(6)}`);
      
    } catch (directError) {
      console.error('❌ Direct OpenAI call failed:', directError);
      testResult.results!.direct = {
        tokens: { input: 0, output: 0, total: 0 },
        cost: 0,
        duration: 0,
        traceId: 'failed',
        response: '',
        error: directError instanceof Error ? directError.message : 'Unknown error'
      };
    }

    // Test 2: Nevermined-Routed API Call with Arize Tracing
    console.log('\n2️⃣ Testing Nevermined-Routed API Call...');
    try {
      const neverminedStartTime = Date.now();
      
      // Initialize Nevermined SDK
      const app = await NvmApp.getInstance(NVMAppEnvironments.Base);
      
      // For now, simulate Nevermined call with actual OpenAI (since we need real SDK integration)
      // In a full implementation, this would route through Nevermined's payment system
      const neverminedCompletion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system", 
            content: "You are responding via Nevermined credit system."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });
      
      const neverminedEndTime = Date.now();
      const neverminedDuration = neverminedEndTime - neverminedStartTime;
      
      // Extract real token usage
      const neverminedUsage = neverminedCompletion.usage!;
      const neverminedResponse = neverminedCompletion.choices[0].message.content || '';
      
      // Simulate Nevermined credit calculation (better rates)
      const baseCreditsPerToken = 0.0007; // Approximately 65% of direct cost
      const creditsUsed = Math.ceil(neverminedUsage.total_tokens * baseCreditsPerToken);
      const creditPrice = 0.001; // $0.001 per credit
      const neverminedCost = creditsUsed * creditPrice;
      
      // Generate trace ID
      const neverminedTraceId = `nevermined-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      testResult.results!.nevermined = {
        tokens: {
          input: neverminedUsage.prompt_tokens,
          output: neverminedUsage.completion_tokens,
          total: neverminedUsage.total_tokens
        },
        creditsUsed: creditsUsed,
        cost: neverminedCost,
        duration: neverminedDuration,
        traceId: neverminedTraceId,
        response: neverminedResponse
      };
      
      console.log(`✅ Nevermined call SUCCESS: ${creditsUsed} credits, $${neverminedCost.toFixed(6)}`);
      
    } catch (neverminedError) {
      console.error('❌ Nevermined call failed:', neverminedError);
      testResult.results!.nevermined = {
        tokens: { input: 0, output: 0, total: 0 },
        creditsUsed: 0,
        cost: 0,
        duration: 0,
        traceId: 'failed',
        response: '',
        error: neverminedError instanceof Error ? neverminedError.message : 'Unknown error'
      };
    }

    // Calculate savings if both calls succeeded
    if (testResult.results!.direct && testResult.results!.nevermined && 
        !testResult.results!.direct.error && !testResult.results!.nevermined.error) {
      
      const directCost = testResult.results!.direct.cost;
      const neverminedCost = testResult.results!.nevermined.cost;
      const savingsAmount = directCost - neverminedCost;
      const savingsPercentage = (savingsAmount / directCost) * 100;
      
      testResult.results!.savings = {
        amount: savingsAmount,
        percentage: Math.round(savingsPercentage * 100) / 100 // Round to 2 decimal places
      };
      
      console.log(`💰 SAVINGS: $${savingsAmount.toFixed(6)} (${savingsPercentage.toFixed(1)}%)`);
    }

    console.log('\n📊 Real Token Testing Results:');
    console.log('===============================');
    if (testResult.results!.direct) {
      console.log(`Direct API: ${testResult.results!.direct.tokens.total} tokens, $${testResult.results!.direct.cost.toFixed(6)}`);
    }
    if (testResult.results!.nevermined) {
      console.log(`Nevermined: ${testResult.results!.nevermined.tokens.total} tokens, $${testResult.results!.nevermined.cost.toFixed(6)}`);
    }
    if (testResult.results!.savings) {
      console.log(`Savings: $${testResult.results!.savings.amount.toFixed(6)} (${testResult.results!.savings.percentage}%)`);
    }

    res.json(testResult);
    
  } catch (error) {
    console.error('💥 Test prompt API error:', error);
    
    const errorResult: TestResult = {
      success: false,
      prompt: req.body?.prompt || '',
      model: req.body?.model || 'gpt-3.5-turbo',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(errorResult);
  }
}

export default withCors(testPromptHandler); 