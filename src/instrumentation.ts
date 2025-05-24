// src/instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as GrpcOTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Metadata } from '@grpc/grpc-js';
import { 
  BatchSpanProcessor, 
  ConsoleSpanExporter,
  SpanProcessor 
} from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { OpenAIInstrumentation } from '@arizeai/openinference-instrumentation-openai';
import * as opentelemetry from '@opentelemetry/api';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Initialize OpenTelemetry with both Phoenix and Arize collectors
 */
export function initializeTelemetry(): NodeSDK {
  // 1. Configure the Phoenix collector endpoint (existing)
  const phoenixEndpoint = process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006';
  const phoenixOtlpEndpoint = `${phoenixEndpoint}/v1/traces`;
  
  // 2. Create headers for Phoenix authentication (if using Phoenix cloud)
  const phoenixHeaders: Record<string, string> = {};
  if (process.env.PHOENIX_API_KEY) {
    phoenixHeaders['api_key'] = process.env.PHOENIX_API_KEY;
  }

  // 3. Create the Phoenix OTLP exporter
  const phoenixExporter = new OTLPTraceExporter({
    url: phoenixOtlpEndpoint,
    headers: phoenixHeaders,
    timeoutMillis: 30000,
  });

  // 4. Create Phoenix span processor
  const phoenixProcessor = new BatchSpanProcessor(phoenixExporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
  });

  // 5. Configure Arize collector (if credentials are provided)
  const spanProcessors: SpanProcessor[] = [phoenixProcessor];
  
  if (process.env.ARIZE_SPACE_ID && process.env.ARIZE_API_KEY) {
    console.log('🌐 Configuring Arize integration...');
    
    // Create Arize metadata
    const arizeMetadata = new Metadata();
    arizeMetadata.set('space_id', process.env.ARIZE_SPACE_ID);
    arizeMetadata.set('api_key', process.env.ARIZE_API_KEY);

    // Create Arize gRPC exporter
    const arizeExporter = new GrpcOTLPTraceExporter({
      url: "https://otlp.arize.com/v1",
      metadata: arizeMetadata,
    });

    // Create Arize span processor
    const arizeProcessor = new BatchSpanProcessor(arizeExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    });

    spanProcessors.push(arizeProcessor);
    console.log('✅ Arize processor added');
  } else {
    console.log('ℹ️  Arize integration skipped (no ARIZE_SPACE_ID or ARIZE_API_KEY found)');
    console.log('   Add these to .env to send traces to Arize as well');
  }

  // Optional: Add console exporter for debugging
  const debugProcessor = new BatchSpanProcessor(new ConsoleSpanExporter());

  // 6. Create resource with service information
  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'ab-testing-gui',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    // Add custom attributes
    'service.environment': process.env.NODE_ENV || 'development',
    'phoenix.project.name': process.env.PHOENIX_PROJECT_NAME || 'prompt-ab-testing',
    // Arize specific attributes
    ...(process.env.ARIZE_MODEL_ID && { 'model_id': process.env.ARIZE_MODEL_ID }),
    ...(process.env.ARIZE_MODEL_VERSION && { 'model_version': process.env.ARIZE_MODEL_VERSION }),
  });

  // 7. Initialize the NodeSDK with all processors
  const sdk = new NodeSDK({
    resource,
    spanProcessors,
    // Uncomment for debugging:
    // spanProcessors: [...spanProcessors, debugProcessor],
  });

  // 8. Register OpenAI instrumentation with basic configuration
  registerInstrumentations({
    instrumentations: [
      new OpenAIInstrumentation({
        // Basic configuration for JavaScript version
        // Custom hooks and enhanced options will be added later
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

  const modelPricing = pricing[model] || pricing['gpt-3.5-turbo']; // Default to gpt-3.5-turbo if model not found
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
    console.log(`📡 Phoenix: ${process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006'}`);
    
    if (process.env.ARIZE_SPACE_ID && process.env.ARIZE_API_KEY) {
      console.log('🌐 Arize: https://otlp.arize.com/v1 (configured)');
      console.log(`📊 Arize Model: ${process.env.ARIZE_MODEL_ID || 'default'} v${process.env.ARIZE_MODEL_VERSION || '1.0'}`);
    } else {
      console.log('ℹ️  Arize: Not configured (add ARIZE_SPACE_ID & ARIZE_API_KEY to enable)');
    }
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await sdk?.shutdown();
      console.log('📴 OpenTelemetry instrumentation shut down');
    });
  }
}

// Auto-start if this file is imported
startTelemetry().catch(console.error); 