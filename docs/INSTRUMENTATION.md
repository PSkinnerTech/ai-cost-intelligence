# Building src/instrumentation.ts for Tracing with Token Capture

## Overview
This file sets up OpenTelemetry to capture detailed traces from LLM calls, including token usage for cost calculation. The traces are sent to Phoenix for visualization and analysis.

## Step 1: Install Required Dependencies

```bash
npm install \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/instrumentation \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @arizeai/openinference-semantic-conventions \
  @arizeai/openinference-instrumentation-openai \
  @arizeai/openinference-core
```

## Step 2: Create the Instrumentation File

Create `src/instrumentation.ts` with the following content:

```typescript
// src/instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { 
  BatchSpanProcessor, 
  ConsoleSpanExporter,
  SpanProcessor 
} from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { OpenAIInstrumentation } from '@arizeai/openinference-instrumentation-openai';
import * as opentelemetry from '@opentelemetry/api';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

/**
 * Initialize OpenTelemetry with Phoenix collector
 */
export function initializeTelemetry(): NodeSDK {
  // 1. Configure the Phoenix collector endpoint
  const phoenixEndpoint = process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006';
  const otlpEndpoint = `${phoenixEndpoint}/v1/traces`;
  
  // 2. Create headers for authentication (if using Phoenix cloud)
  const headers: Record<string, string> = {};
  if (process.env.PHOENIX_API_KEY) {
    headers['api_key'] = process.env.PHOENIX_API_KEY;
  }

  // 3. Create the OTLP exporter for Phoenix
  const traceExporter = new OTLPTraceExporter({
    url: otlpEndpoint,
    headers,
    // Important: Set timeout for long-running LLM calls
    timeoutMillis: 30000,
  });

  // 4. Configure the span processor
  // Use BatchSpanProcessor for production (better performance)
  const spanProcessor = new BatchSpanProcessor(traceExporter, {
    // Adjust these based on your needs
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
  });

  // Optional: Add console exporter for debugging
  const debugProcessor = new BatchSpanProcessor(new ConsoleSpanExporter());

  // 5. Create resource with service information
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'ab-testing-gui',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    // Add custom attributes
    'service.environment': process.env.NODE_ENV || 'development',
    'phoenix.project.name': process.env.PHOENIX_PROJECT_NAME || 'prompt-ab-testing',
  });

  // 6. Initialize the NodeSDK
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    spanProcessors: [
      spanProcessor,
      // Uncomment for debugging:
      // debugProcessor,
    ],
  });

  // 7. Register OpenAI instrumentation with enhanced configuration
  registerInstrumentations({
    instrumentations: [
      new OpenAIInstrumentation({
        // Capture streaming token usage (requires openai>=1.26)
        captureStreamingResponses: true,
        // Include request/response bodies for debugging
        includeRequestBody: true,
        includeResponseBody: true,
        // Custom span attributes for cost tracking
        responseHook: (span, response) => {
          // Add custom attributes for cost calculation
          if (response?.usage) {
            span.setAttributes({
              'llm.token_count.prompt': response.usage.prompt_tokens,
              'llm.token_count.completion': response.usage.completion_tokens,
              'llm.token_count.total': response.usage.total_tokens,
              // Add cost calculation attributes
              'llm.usage.prompt_tokens_cost': calculateTokenCost(
                response.usage.prompt_tokens, 
                response.model, 
                'input'
              ),
              'llm.usage.completion_tokens_cost': calculateTokenCost(
                response.usage.completion_tokens, 
                response.model, 
                'output'
              ),
            });
          }
        },
      }),
    ],
  });

  return sdk;
}

/**
 * Helper function to calculate token costs
 */
function calculateTokenCost(tokens: number, model: string, type: 'input' | 'output'): number {
  // Define your pricing here (prices per 1K tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    // Add more models as needed
  };

  const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
  const costPer1k = type === 'input' ? modelPricing.input : modelPricing.output;
  
  return (tokens / 1000) * costPer1k;
}

/**
 * Get the global tracer for manual instrumentation
 */
export function getTracer(name: string = 'ab-testing-gui'): opentelemetry.Tracer {
  return opentelemetry.trace.getTracer(name);
}

/**
 * Helper to add session information to spans
 */
export function withSession<T>(
  sessionId: string, 
  fn: () => T | Promise<T>
): T | Promise<T> {
  const span = opentelemetry.trace.getActiveSpan();
  if (span) {
    span.setAttributes({
      'session.id': sessionId,
      'openinference.session.id': sessionId, // Phoenix-specific attribute
    });
  }
  return fn();
}

/**
 * Helper to create a traced operation
 */
export async function tracedOperation<T>(
  name: string,
  attributes: Record<string, any>,
  operation: () => Promise<T>
): Promise<T> {
  const tracer = getTracer();
  
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await operation();
      span.setStatus({ code: opentelemetry.SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ 
        code: opentelemetry.SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Initialize telemetry on module load
 */
let sdk: NodeSDK | null = null;

export async function startTelemetry(): Promise<void> {
  if (!sdk) {
    sdk = initializeTelemetry();
    
    // Start the SDK
    await sdk.start();
    
    console.log('✅ OpenTelemetry instrumentation started');
    console.log(`📡 Sending traces to: ${process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006'}`);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await sdk?.shutdown();
      console.log('📴 OpenTelemetry instrumentation shut down');
    });
  }
}

// Auto-start if this file is imported
startTelemetry().catch(console.error);
```

## Step 3: Create a Type Declaration File

Create `src/types/instrumentation.d.ts` for better TypeScript support:

```typescript
// src/types/instrumentation.d.ts
import { Span } from '@opentelemetry/api';

declare module '@opentelemetry/api' {
  interface Span {
    // Custom methods if needed
  }
}

// Extend response types for token tracking
declare global {
  interface LLMResponse {
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    model: string;
  }
}
```

## Step 4: Update Your Application Entry Point

In your main application file (`src/app.ts` or `src/index.ts`), import the instrumentation before anything else:

```typescript
// src/app.ts
// IMPORTANT: Import instrumentation first!
import './instrumentation';

import express from 'express';
import { OpenAI } from 'openai';
// ... rest of your imports

const app = express();
// ... your application code
```

## Step 5: Configure Environment Variables

Create or update your `.env` file:

```bash
# Phoenix Configuration
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006
PHOENIX_PROJECT_NAME=prompt-ab-testing
# PHOENIX_API_KEY=your-api-key  # Only if using Phoenix cloud

# Service Configuration
SERVICE_NAME=ab-testing-gui
SERVICE_VERSION=1.0.0
NODE_ENV=development

# LLM Configuration
OPENAI_API_KEY=your-openai-api-key
```

## Step 6: Enable Streaming Token Capture

When making OpenAI calls, ensure you're capturing streaming tokens:

```typescript
// Example usage in your application
import { OpenAI } from 'openai';
import { withSession, tracedOperation } from './instrumentation';

const openai = new OpenAI();

async function testPrompt(promptContent: string, sessionId: string) {
  return withSession(sessionId, async () => {
    return tracedOperation('test-prompt', {
      'prompt.name': 'email-generator',
      'prompt.variant': 'A',
    }, async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: promptContent }],
        // Important for token tracking in streaming:
        stream: true,
        stream_options: { include_usage: true },
      });

      // Process streaming response
      let fullResponse = '';
      for await (const chunk of response) {
        if (chunk.choices[0]?.delta?.content) {
          fullResponse += chunk.choices[0].delta.content;
        }
      }

      return fullResponse;
    });
  });
}
```

## Step 7: Verify Token Capture

To verify tokens are being captured:

1. Make a test LLM call
2. Check Phoenix UI for the trace
3. Look for these span attributes:
   - `llm.token_count.prompt`
   - `llm.token_count.completion`
   - `llm.token_count.total`
   - `llm.usage.prompt_tokens_cost`
   - `llm.usage.completion_tokens_cost`

## Troubleshooting

### Tokens Not Appearing
- Ensure you're using OpenAI SDK version 1.26 or higher
- For streaming, include `stream_options: { include_usage: true }`
- Check that the instrumentation is loaded before OpenAI client creation

### Traces Not Reaching Phoenix
- Verify Phoenix is running: `curl http://localhost:6006/health`
- Check the console for connection errors
- Try the ConsoleSpanExporter for debugging
- Ensure PHOENIX_COLLECTOR_ENDPOINT is correct

### Missing Custom Attributes
- Verify responseHook is being called (add console.log)
- Check span.setAttributes is using correct attribute names
- Ensure attributes are primitive types (string, number, boolean)

## Next Steps

With instrumentation set up, you can now:
1. Create API endpoints that use the instrumented OpenAI client
2. Track costs across different prompt variants
3. Visualize token usage in Phoenix UI
4. Build cost comparison features in your frontend