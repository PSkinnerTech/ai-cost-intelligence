// src/server.ts
// IMPORTANT: Import instrumentation first!
import './instrumentation';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import * as dotenv from 'dotenv';

// Import our instrumentation helpers
import { withSession, tracedOperation, getTracer } from './instrumentation';

// Import A/B testing services
import { PromptManager } from './services/promptManager';
import { ABTestExecutor } from './services/abTestExecutor';
import { StatisticalAnalysis } from './services/statisticalAnalysis';

dotenv.config();

// Initialize Express app
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Initialize services
const promptManager = new PromptManager();
const abTestExecutor = new ABTestExecutor(
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  promptManager
);
const statisticalAnalysis = new StatisticalAnalysis();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Initialize OpenAI client
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Error handling middleware
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================
// HEALTH CHECK
// ============================

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============================
// BASIC TEST ENDPOINTS
// ============================

// Test OpenAI integration
app.post('/api/test/openai', asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const sessionId = uuidv4();
  
  const result = await withSession(sessionId, async () => {
    return tracedOperation('api-openai-test', {
      'api.endpoint': '/api/test/openai',
      'test.message': message,
    }, async () => {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
        max_tokens: 100,
        temperature: 0.7,
      });

      return {
        response: response.choices[0].message.content,
        usage: response.usage,
        model: response.model,
        sessionId,
      };
    });
  });

  res.json({
    success: true,
    data: result,
  });
}));

// Test cost calculation
app.get('/api/test/cost-calculation', asyncHandler(async (req: Request, res: Response) => {
  const testData = {
    'gpt-3.5-turbo': { prompt: 1000, completion: 500 },
    'gpt-4': { prompt: 1000, completion: 500 },
    'gpt-4o': { prompt: 1000, completion: 500 },
  };

  const results = Object.entries(testData).map(([model, tokens]) => {
    const cost = calculateTokenCost(tokens.prompt, tokens.completion, model);
    return {
      model,
      tokens,
      cost,
    };
  });

  res.json({
    success: true,
    data: results,
  });
}));

// ============================
// SESSION MANAGEMENT
// ============================

// Create session
app.post('/api/sessions', asyncHandler(async (req: Request, res: Response) => {
  const { metadata = {} } = req.body;
  
  const session = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    metadata,
    status: 'active',
  };

  res.json({
    success: true,
    session,
  });
}));

// Get session (placeholder)
app.get('/api/sessions/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  // For now, return a basic session object
  // Later: implement with SessionManager service
  res.json({
    success: true,
    session: {
      id: sessionId,
      createdAt: new Date().toISOString(),
      status: 'active',
    },
  });
}));

// ============================
// PROMPT VARIANT MANAGEMENT
// ============================

// Create prompt variant
app.post('/api/prompts', asyncHandler(async (req: Request, res: Response) => {
  const { name, description, template, variables, model, parameters, tags, parentId } = req.body;
  
  if (!name || !description || !template) {
    return res.status(400).json({ 
      error: 'Name, description, and template are required' 
    });
  }

  const variant = promptManager.createVariant({
    name,
    description,
    template,
    variables,
    model,
    parameters,
    tags,
    parentId
  });

  res.json({
    success: true,
    variant,
  });
}));

// List prompt variants
app.get('/api/prompts', asyncHandler(async (req: Request, res: Response) => {
  const { tags, model, parentId } = req.query;
  
  const options: any = {};
  if (tags) options.tags = (tags as string).split(',');
  if (model) options.model = model as string;
  if (parentId) options.parentId = parentId as string;

  const variants = promptManager.listVariants(options);

  res.json({
    success: true,
    variants,
    total: variants.length,
  });
}));

// Get prompt variant
app.get('/api/prompts/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const variant = promptManager.getVariant(id);
  if (!variant) {
    return res.status(404).json({ error: 'Prompt variant not found' });
  }

  res.json({
    success: true,
    variant,
  });
}));

// Update prompt variant
app.put('/api/prompts/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    const variant = promptManager.updateVariant(id, updates);
    res.json({
      success: true,
      variant,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}));

// Delete prompt variant
app.delete('/api/prompts/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const deleted = promptManager.deleteVariant(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Prompt variant not found' });
    }
    
    res.json({
      success: true,
      message: 'Prompt variant deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}));

// ============================
// TEST INPUT MANAGEMENT
// ============================

// Create test input
app.post('/api/test-inputs', asyncHandler(async (req: Request, res: Response) => {
  const { prompt, variables, expectedOutput, category } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const input = promptManager.createTestInput({
    prompt,
    variables,
    expectedOutput,
    category
  });

  res.json({
    success: true,
    input,
  });
}));

// List test inputs
app.get('/api/test-inputs', asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.query;
  
  const inputs = promptManager.listTestInputs(category as string);

  res.json({
    success: true,
    inputs,
    total: inputs.length,
  });
}));

// ============================
// A/B TEST MANAGEMENT
// ============================

// Create A/B test
app.post('/api/ab-tests', asyncHandler(async (req: Request, res: Response) => {
  const { name, description, variantIds, inputIds, configuration } = req.body;
  
  if (!name || !description || !variantIds || !inputIds || !configuration) {
    return res.status(400).json({ 
      error: 'Name, description, variantIds, inputIds, and configuration are required' 
    });
  }

  try {
    const test = promptManager.createABTest({
      name,
      description,
      variantIds,
      inputIds,
      configuration
    });

    res.json({
      success: true,
      test,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}));

// List A/B tests
app.get('/api/ab-tests', asyncHandler(async (req: Request, res: Response) => {
  const { status, createdBy } = req.query;
  
  const options: any = {};
  if (status) options.status = status as any;
  if (createdBy) options.createdBy = createdBy as string;

  const tests = promptManager.listABTests(options);

  res.json({
    success: true,
    tests,
    total: tests.length,
  });
}));

// Get A/B test
app.get('/api/ab-tests/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const test = promptManager.getABTest(id);
  if (!test) {
    return res.status(404).json({ error: 'A/B test not found' });
  }

  res.json({
    success: true,
    test,
  });
}));

// Start A/B test
app.post('/api/ab-tests/:id/start', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const test = promptManager.startABTest(id);
    
    // Trigger actual test execution in background
    console.log(`🚀 Starting real A/B test execution for: ${test.name}`);
    
    // Execute test asynchronously
    setImmediate(async () => {
      try {
        await abTestExecutor.executeABTest(id);
        console.log(`✅ A/B test execution completed: ${id}`);
        
        // Broadcast completion to WebSocket clients
        broadcastToClients({
          type: 'test-completed',
          testId: id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`❌ A/B test execution failed: ${id}`, error);
        broadcastToClients({
          type: 'test-failed',
          testId: id,
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    res.json({
      success: true,
      test,
      message: 'A/B test started successfully - execution in progress',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}));

// Stop A/B test
app.post('/api/ab-tests/:id/stop', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const test = promptManager.stopABTest(id);
    
    res.json({
      success: true,
      test,
      message: 'A/B test stopped successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}));

// Get A/B test execution status
app.get('/api/ab-tests/:id/execution', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const execution = await abTestExecutor.getExecutionStatus(id);
    if (!execution) {
      return res.status(404).json({ error: 'A/B test execution not found' });
    }

    res.json({
      success: true,
      execution,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}));

// Execute single variant comparison
app.post('/api/ab-tests/compare', asyncHandler(async (req: Request, res: Response) => {
  const { variantAId, variantBId, inputId } = req.body;
  
  if (!variantAId || !variantBId || !inputId) {
    return res.status(400).json({ 
      error: 'variantAId, variantBId, and inputId are required' 
    });
  }

  try {
    const variantA = promptManager.getVariant(variantAId);
    const variantB = promptManager.getVariant(variantBId);
    const input = promptManager.getTestInput(inputId);

    if (!variantA || !variantB || !input) {
      return res.status(404).json({ error: 'Variant or input not found' });
    }

    console.log(`🔄 Running side-by-side comparison: ${variantA.name} vs ${variantB.name}`);
    
    const comparison = await abTestExecutor.executeVariantComparison(
      variantA, variantB, input
    );

    // Calculate basic statistical comparison
    const statistical = statisticalAnalysis.calculateSignificance(
      [comparison.resultA],
      [comparison.resultB],
      'cost'
    );

    res.json({
      success: true,
      comparison: {
        ...comparison,
        statistical
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}));

// Get A/B test results with statistical analysis
app.get('/api/ab-tests/:id/results', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const test = promptManager.getABTest(id);
  if (!test) {
    return res.status(404).json({ error: 'A/B test not found' });
  }

  try {
    // Generate comprehensive statistical analysis
    if (test.results.length > 0) {
      console.log(`📊 Generating statistical analysis for test: ${test.name}`);
      
      const analysis = statisticalAnalysis.determineWinner(
        test.variants,
        test.results,
        test.configuration.primaryMetric === 'custom' ? 'cost' : test.configuration.primaryMetric
      );

      // Calculate individual variant metrics
      const variantMetrics = test.variants.map(variant => {
        const variantResults = test.results.filter(r => r.variantId === variant.id);
        return {
          variant: {
            id: variant.id,
            name: variant.name,
            template: variant.template
          },
          metrics: abTestExecutor.calculateVariantMetrics(test.results, variant.id),
          sampleResults: variantResults.slice(0, 3) // Show first 3 results as examples
        };
      });

      res.json({
        success: true,
        results: {
          testId: id,
          testName: test.name,
          status: test.status,
          variants: test.variants.length,
          totalResults: test.results.length,
          analysis,
          variantMetrics,
          configuration: test.configuration,
          executionTime: {
            startedAt: test.startedAt,
            completedAt: test.completedAt,
            duration: test.startedAt && test.completedAt ? 
              test.completedAt.getTime() - test.startedAt.getTime() : null
          }
        },
      });
    } else {
      // No results yet
      res.json({
        success: true,
        results: {
          testId: id,
          testName: test.name,
          status: test.status,
          variants: test.variants.length,
          totalResults: 0,
          message: 'No results available yet - test may still be running'
        },
      });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}));

// ============================
// PROMPT TEMPLATE UTILITIES
// ============================

// Interpolate template with variables
app.post('/api/prompts/interpolate', asyncHandler(async (req: Request, res: Response) => {
  const { template, variables } = req.body;
  
  if (!template) {
    return res.status(400).json({ error: 'Template is required' });
  }

  const interpolated = promptManager.interpolateTemplate(template, variables || {});
  const extractedVariables = promptManager.extractVariables(template);

  res.json({
    success: true,
    interpolated,
    variables: extractedVariables,
  });
}));

// ============================
// STATISTICS & MANAGEMENT
// ============================

// Get prompt manager statistics
app.get('/api/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = promptManager.getStats();

  res.json({
    success: true,
    stats,
    timestamp: new Date().toISOString(),
  });
}));

// ============================
// WEBSOCKET HANDLING
// ============================

const clients = new Set<any>();

wss.on('connection', (ws) => {
  console.log('🔗 WebSocket client connected');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
  
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'WebSocket connected successfully',
    timestamp: new Date().toISOString(),
  }));
});

export function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// ============================
// HELPER FUNCTIONS
// ============================

function calculateTokenCost(promptTokens: number, completionTokens: number, model: string) {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  };

  const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];

  return {
    prompt: (promptTokens / 1000) * modelPricing.input,
    completion: (completionTokens / 1000) * modelPricing.output,
    total: (promptTokens / 1000) * modelPricing.input + 
           (completionTokens / 1000) * modelPricing.output,
  };
}

// ============================
// ERROR HANDLING
// ============================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ API Error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString(),
  });
});

// ============================
// START SERVER
// ============================

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log('🚀 API Server Details:');
  console.log(`   📡 Server: http://localhost:${PORT}`);
  console.log(`   🏥 Health: http://localhost:${PORT}/health`);
  console.log(`   🧪 Test: http://localhost:${PORT}/api/test/openai`);
  console.log(`   💰 Costs: http://localhost:${PORT}/api/test/cost-calculation`);
  console.log(`   🔗 WebSocket: ws://localhost:${PORT}`);
  console.log(`   📊 Phoenix: ${process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006'}`);
  console.log(`   🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, server }; 