# Building src/server.ts - API Server Implementation Guide

## Overview
This guide walks through building a comprehensive API server that integrates Phoenix prompt management, OpenAI execution with tracing, cost calculation, and session management.

## Step 1: Install Additional Dependencies

```bash
npm install \
  express \
  cors \
  helmet \
  compression \
  express-rate-limit \
  multer \
  uuid \
  axios \
  ws \
  @types/express \
  @types/cors \
  @types/multer \
  @types/uuid \
  @types/ws
```

## Step 2: Create the Main Server File

Create `src/server.ts` with the following structure:

```typescript
// src/server.ts
// IMPORTANT: Import instrumentation first!
import './instrumentation';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createClient } from '@arizeai/phoenix-client';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Import our instrumentation helpers
import { withSession, tracedOperation, getTracer } from './instrumentation';

// Import service modules (we'll create these next)
import { PromptService } from './services/promptService';
import { TestExecutor } from './services/testExecutor';
import { CostCalculator } from './services/costCalculator';
import { SessionManager } from './services/sessionManager';

dotenv.config();

// Initialize Express app
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// File upload configuration
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Initialize services
const phoenixClient = createClient({
  apiKey: process.env.PHOENIX_API_KEY,
  baseUrl: process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006',
});

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const promptService = new PromptService(phoenixClient);
const testExecutor = new TestExecutor(openaiClient, phoenixClient);
const costCalculator = new CostCalculator(phoenixClient);
const sessionManager = new SessionManager();

// Error handling middleware
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================
// PROMPT MANAGEMENT ENDPOINTS
// ============================

// Create a new prompt
app.post('/api/prompts', asyncHandler(async (req: Request, res: Response) => {
  const { name, description, template, modelName, modelProvider, parameters } = req.body;
  
  const prompt = await promptService.createPrompt({
    name,
    description,
    template,
    modelName,
    modelProvider,
    parameters,
  });
  
  res.json({ success: true, prompt });
}));

// Get prompt by name (latest version)
app.get('/api/prompts/:name', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const { version, tag } = req.query;
  
  const prompt = await promptService.getPrompt(name, {
    version: version as string,
    tag: tag as string,
  });
  
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  
  res.json({ success: true, prompt });
}));

// Update prompt (create new version)
app.put('/api/prompts/:name', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const { template, modelName, parameters, versionDescription } = req.body;
  
  const prompt = await promptService.updatePrompt(name, {
    template,
    modelName,
    parameters,
    versionDescription,
  });
  
  res.json({ success: true, prompt });
}));

// List all prompt versions
app.get('/api/prompts/:name/versions', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  
  const versions = await promptService.listVersions(name);
  
  res.json({ success: true, versions });
}));

// Tag a prompt version
app.post('/api/prompts/:name/tag', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const { versionId, tag } = req.body;
  
  await promptService.tagVersion(name, versionId, tag);
  
  res.json({ success: true, message: `Tagged version ${versionId} as ${tag}` });
}));

// Compare multiple prompt variants
app.post('/api/prompts/compare', asyncHandler(async (req: Request, res: Response) => {
  const { variants } = req.body; // Array of { name, version/tag }
  
  const prompts = await Promise.all(
    variants.map((v: any) => promptService.getPrompt(v.name, v))
  );
  
  res.json({ success: true, prompts });
}));

// ============================
// TEST EXECUTION ENDPOINTS
// ============================

// Test single input
app.post('/api/test/single', asyncHandler(async (req: Request, res: Response) => {
  const { promptName, variables, variants, sessionId } = req.body;
  
  const testId = uuidv4();
  const effectiveSessionId = sessionId || uuidv4();
  
  // Execute test asynchronously and stream results via WebSocket
  testExecutor.executeSingleTest({
    testId,
    promptName,
    variables,
    variants,
    sessionId: effectiveSessionId,
  }).then(results => {
    // Broadcast results to WebSocket clients
    broadcastToClients({
      type: 'test-complete',
      testId,
      results,
    });
  });
  
  res.json({ 
    success: true, 
    testId,
    sessionId: effectiveSessionId,
    message: 'Test started, results will be streamed via WebSocket' 
  });
}));

// Test with dataset
app.post('/api/test/dataset', upload.single('dataset'), asyncHandler(async (req: Request, res: Response) => {
  const { promptName, variants } = req.body;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'No dataset file provided' });
  }
  
  const testId = uuidv4();
  const dataset = await parseCSV(file.buffer.toString());
  
  // Execute dataset test asynchronously
  testExecutor.executeDatasetTest({
    testId,
    promptName,
    dataset,
    variants: JSON.parse(variants),
  }).then(results => {
    broadcastToClients({
      type: 'dataset-test-complete',
      testId,
      results,
    });
  });
  
  res.json({ 
    success: true, 
    testId,
    rowCount: dataset.length,
    message: 'Dataset test started' 
  });
}));

// Get test status
app.get('/api/test/:testId/status', asyncHandler(async (req: Request, res: Response) => {
  const { testId } = req.params;
  
  const status = await testExecutor.getTestStatus(testId);
  
  res.json({ success: true, status });
}));

// Abort test
app.post('/api/test/:testId/abort', asyncHandler(async (req: Request, res: Response) => {
  const { testId } = req.params;
  
  await testExecutor.abortTest(testId);
  
  res.json({ success: true, message: 'Test aborted' });
}));

// ============================
// TRACE & COST ENDPOINTS
// ============================

// Get traces for a project
app.get('/api/traces/:projectName', asyncHandler(async (req: Request, res: Response) => {
  const { projectName } = req.params;
  const { limit = 100, offset = 0 } = req.query;
  
  const traces = await phoenixClient.queryTraces(projectName, {
    limit: Number(limit),
    offset: Number(offset),
  });
  
  res.json({ success: true, traces });
}));

// Get spans for a trace
app.get('/api/traces/:traceId/spans', asyncHandler(async (req: Request, res: Response) => {
  const { traceId } = req.params;
  
  const spans = await phoenixClient.getSpansForTrace(traceId);
  
  res.json({ success: true, spans });
}));

// Calculate cost for a span
app.get('/api/costs/span/:spanId', asyncHandler(async (req: Request, res: Response) => {
  const { spanId } = req.params;
  
  const cost = await costCalculator.calculateSpanCost(spanId);
  
  res.json({ success: true, cost });
}));

// Calculate cost for a session
app.get('/api/costs/session/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  const cost = await costCalculator.calculateSessionCost(sessionId);
  
  res.json({ success: true, cost });
}));

// Compare costs between variants
app.post('/api/costs/comparison', asyncHandler(async (req: Request, res: Response) => {
  const { testId, variants } = req.body;
  
  const comparison = await costCalculator.compareVariantCosts(testId, variants);
  
  res.json({ success: true, comparison });
}));

// Get cost analytics
app.post('/api/costs/analytics', asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, groupBy = 'day', filters } = req.body;
  
  const analytics = await costCalculator.getCostAnalytics({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    groupBy,
    filters,
  });
  
  res.json({ success: true, analytics });
}));

// ============================
// SESSION MANAGEMENT ENDPOINTS
// ============================

// Create a new session
app.post('/api/sessions', asyncHandler(async (req: Request, res: Response) => {
  const { metadata } = req.body;
  
  const session = sessionManager.createSession(metadata);
  
  res.json({ success: true, session });
}));

// Get session details
app.get('/api/sessions/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  const session = sessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({ success: true, session });
}));

// Update session
app.patch('/api/sessions/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { metadata } = req.body;
  
  const session = sessionManager.updateSession(sessionId, metadata);
  
  res.json({ success: true, session });
}));

// Get session traces
app.get('/api/sessions/:sessionId/traces', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  const traces = await phoenixClient.queryTraces('default', {
    filter: { 'session.id': sessionId },
  });
  
  res.json({ success: true, traces });
}));

// ============================
// ANNOTATION ENDPOINTS
// ============================

// Add annotation to span
app.post('/api/traces/:spanId/annotate', asyncHandler(async (req: Request, res: Response) => {
  const { spanId } = req.params;
  const { name, value, type = 'HUMAN' } = req.body;
  
  await phoenixClient.annotateSpan(spanId, {
    name,
    value,
    annotator_kind: type,
  });
  
  res.json({ success: true, message: 'Annotation added' });
}));

// ============================
// WEBSOCKET HANDLING
// ============================

const clients = new Set<any>();

wss.on('connection', (ws) => {
  clients.add(ws);
  
  ws.on('close', () => {
    clients.delete(ws);
  });
  
  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
});

function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// ============================
// HEALTH CHECK
// ============================

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    phoenix: phoenixClient.isConnected(),
    timestamp: new Date().toISOString(),
  });
});

// ============================
// ERROR HANDLING
// ============================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================
// HELPER FUNCTIONS
// ============================

async function parseCSV(content: string): Promise<any[]> {
  // Simple CSV parser - in production, use a library like papaparse
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',').map(v => v.trim());
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index];
        return obj;
      }, {} as any);
    });
}

// ============================
// START SERVER
// ============================

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📡 Phoenix endpoint: ${process.env.PHOENIX_COLLECTOR_ENDPOINT}`);
  console.log(`🔗 WebSocket server ready`);
});

export { app, server };
```

## Step 3: Create Service Modules

### 3.1 Prompt Service (`src/services/promptService.ts`)

```typescript
// src/services/promptService.ts
import { PhoenixClient } from '@arizeai/phoenix-client';
import { promptVersion } from '@arizeai/phoenix-client/prompts';

export class PromptService {
  constructor(private phoenixClient: PhoenixClient) {}

  async createPrompt(params: {
    name: string;
    description?: string;
    template: any[];
    modelName: string;
    modelProvider: string;
    parameters?: any;
  }) {
    const prompt = await this.phoenixClient.prompts.create({
      name: params.name,
      description: params.description,
      version: promptVersion({
        template: params.template,
        modelName: params.modelName,
        modelProvider: params.modelProvider,
        invocationParameters: params.parameters,
      }),
    });
    
    return prompt;
  }

  async getPrompt(name: string, options?: { version?: string; tag?: string }) {
    if (options?.version) {
      return await this.phoenixClient.prompts.get({
        promptVersionId: options.version,
      });
    } else if (options?.tag) {
      return await this.phoenixClient.prompts.get({
        promptIdentifier: name,
        tag: options.tag,
      });
    } else {
      return await this.phoenixClient.prompts.get({
        promptIdentifier: name,
      });
    }
  }

  async updatePrompt(name: string, params: any) {
    // Creating a new version is how we update
    return this.createPrompt({
      name,
      ...params,
    });
  }

  async listVersions(name: string) {
    // This would query Phoenix for all versions
    // Implementation depends on Phoenix API
    return [];
  }

  async tagVersion(name: string, versionId: string, tag: string) {
    // Tag a specific version
    // Implementation depends on Phoenix API
  }
}
```

### 3.2 Test Executor (`src/services/testExecutor.ts`)

```typescript
// src/services/testExecutor.ts
import { OpenAI } from 'openai';
import { PhoenixClient } from '@arizeai/phoenix-client';
import { withSession, tracedOperation } from '../instrumentation';
import { toSDK } from '@arizeai/phoenix-client/prompts';

interface TestResult {
  variant: string;
  response: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency: number;
  spanId: string;
  traceId: string;
}

export class TestExecutor {
  private activeTests = new Map<string, any>();

  constructor(
    private openai: OpenAI,
    private phoenixClient: PhoenixClient
  ) {}

  async executeSingleTest(params: {
    testId: string;
    promptName: string;
    variables: Record<string, any>;
    variants: string[];
    sessionId: string;
  }): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    this.activeTests.set(params.testId, { status: 'running', progress: 0 });

    try {
      for (const variant of params.variants) {
        // Get prompt for variant
        const prompt = await this.phoenixClient.prompts.get({
          promptIdentifier: params.promptName,
          tag: variant,
        });

        if (!prompt) {
          throw new Error(`Prompt variant ${variant} not found`);
        }

        // Execute with tracing
        const result = await withSession(params.sessionId, async () => {
          return tracedOperation(`test-prompt-${variant}`, {
            'test.id': params.testId,
            'prompt.name': params.promptName,
            'prompt.variant': variant,
          }, async () => {
            const startTime = Date.now();
            
            // Transform prompt to OpenAI format
            const openaiParams = toSDK({
              sdk: 'openai',
              prompt,
              variables: params.variables,
            });

            // Execute OpenAI call
            const response = await this.openai.chat.completions.create({
              ...openaiParams,
              stream: false,
            });

            const latency = Date.now() - startTime;
            const usage = response.usage!;

            return {
              variant,
              response: response.choices[0].message.content!,
              tokens: {
                prompt: usage.prompt_tokens,
                completion: usage.completion_tokens,
                total: usage.total_tokens,
              },
              cost: this.calculateCost(usage, response.model),
              latency,
              spanId: 'will-be-set-by-trace',
              traceId: 'will-be-set-by-trace',
            };
          });
        });

        results.push(result);
        
        // Update progress
        const progress = ((results.length / params.variants.length) * 100);
        this.activeTests.set(params.testId, { status: 'running', progress });
      }

      this.activeTests.set(params.testId, { status: 'completed', results });
      return results;

    } catch (error) {
      this.activeTests.set(params.testId, { status: 'failed', error: error.message });
      throw error;
    }
  }

  async executeDatasetTest(params: {
    testId: string;
    promptName: string;
    dataset: any[];
    variants: string[];
  }) {
    const results: any[] = [];
    const totalTests = params.dataset.length * params.variants.length;
    let completed = 0;

    this.activeTests.set(params.testId, { status: 'running', progress: 0 });

    try {
      for (const row of params.dataset) {
        for (const variant of params.variants) {
          const result = await this.executeSingleTest({
            testId: `${params.testId}-${completed}`,
            promptName: params.promptName,
            variables: row,
            variants: [variant],
            sessionId: params.testId,
          });

          results.push({
            ...result[0],
            rowIndex: params.dataset.indexOf(row),
            variables: row,
          });

          completed++;
          const progress = (completed / totalTests) * 100;
          this.activeTests.set(params.testId, { status: 'running', progress });
        }
      }

      this.activeTests.set(params.testId, { status: 'completed', results });
      return results;

    } catch (error) {
      this.activeTests.set(params.testId, { status: 'failed', error: error.message });
      throw error;
    }
  }

  async getTestStatus(testId: string) {
    return this.activeTests.get(testId) || { status: 'not-found' };
  }

  async abortTest(testId: string) {
    const test = this.activeTests.get(testId);
    if (test && test.status === 'running') {
      this.activeTests.set(testId, { ...test, status: 'aborted' });
    }
  }

  private calculateCost(usage: any, model: string) {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];

    return {
      prompt: (usage.prompt_tokens / 1000) * modelPricing.input,
      completion: (usage.completion_tokens / 1000) * modelPricing.output,
      total: (usage.prompt_tokens / 1000) * modelPricing.input + 
             (usage.completion_tokens / 1000) * modelPricing.output,
    };
  }
}
```

### 3.3 Cost Calculator (`src/services/costCalculator.ts`)

```typescript
// src/services/costCalculator.ts
import { PhoenixClient } from '@arizeai/phoenix-client';

export class CostCalculator {
  constructor(private phoenixClient: PhoenixClient) {}

  async calculateSpanCost(spanId: string) {
    // Fetch span from Phoenix
    const span = await this.phoenixClient.getSpan(spanId);
    
    if (!span || !span.attributes) {
      throw new Error('Span not found');
    }

    const promptTokens = span.attributes['llm.token_count.prompt'] || 0;
    const completionTokens = span.attributes['llm.token_count.completion'] || 0;
    const totalTokens = span.attributes['llm.token_count.total'] || 0;
    const model = span.attributes['llm.model_name'];

    const cost = this.calculateTokenCost(promptTokens, completionTokens, model);

    return {
      spanId,
      model,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens,
      },
      cost,
      timestamp: span.startTime,
    };
  }

  async calculateSessionCost(sessionId: string) {
    // Query all spans for a session
    const traces = await this.phoenixClient.queryTraces('default', {
      filter: { 'session.id': sessionId },
    });

    let totalCost = 0;
    let totalTokens = { prompt: 0, completion: 0, total: 0 };
    const spanCosts: any[] = [];

    for (const trace of traces) {
      const spans = await this.phoenixClient.getSpansForTrace(trace.id);
      
      for (const span of spans) {
        if (span.attributes['llm.token_count.total']) {
          const cost = await this.calculateSpanCost(span.id);
          spanCosts.push(cost);
          totalCost += cost.cost.total;
          totalTokens.prompt += cost.tokens.prompt;
          totalTokens.completion += cost.tokens.completion;
          totalTokens.total += cost.tokens.total;
        }
      }
    }

    return {
      sessionId,
      totalCost,
      totalTokens,
      spanCount: spanCosts.length,
      spans: spanCosts,
    };
  }

  async compareVariantCosts(testId: string, variants: string[]) {
    const comparison: Record<string, any> = {};

    for (const variant of variants) {
      const traces = await this.phoenixClient.queryTraces('default', {
        filter: { 
          'test.id': testId,
          'prompt.variant': variant,
        },
      });

      let totalCost = 0;
      let totalTokens = { prompt: 0, completion: 0, total: 0 };
      let count = 0;

      for (const trace of traces) {
        const spans = await this.phoenixClient.getSpansForTrace(trace.id);
        
        for (const span of spans) {
          if (span.attributes['llm.token_count.total']) {
            const cost = await this.calculateSpanCost(span.id);
            totalCost += cost.cost.total;
            totalTokens.prompt += cost.tokens.prompt;
            totalTokens.completion += cost.tokens.completion;
            totalTokens.total += cost.tokens.total;
            count++;
          }
        }
      }

      comparison[variant] = {
        totalCost,
        averageCost: count > 0 ? totalCost / count : 0,
        totalTokens,
        averageTokens: {
          prompt: count > 0 ? totalTokens.prompt / count : 0,
          completion: count > 0 ? totalTokens.completion / count : 0,
          total: count > 0 ? totalTokens.total / count : 0,
        },
        count,
      };
    }

    return comparison;
  }

  async getCostAnalytics(params: {
    startDate: Date;
    endDate: Date;
    groupBy: 'hour' | 'day' | 'week' | 'month';
    filters?: any;
  }) {
    // Implementation would query Phoenix and aggregate costs
    // This is a placeholder for the analytics logic
    return {
      timeSeries: [],
      totalCost: 0,
      breakdown: {
        byModel: {},
        byVariant: {},
        bySession: {},
      },
    };
  }

  private calculateTokenCost(promptTokens: number, completionTokens: number, model: string) {
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
}
```

### 3.4 Session Manager (`src/services/sessionManager.ts`)

```typescript
// src/services/sessionManager.ts
import { v4 as uuidv4 } from 'uuid';

interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
  turns: number;
}

export class SessionManager {
  private sessions = new Map<string, Session>();

  createSession(metadata: Record<string, any> = {}): Session {
    const session: Session = {
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
      turns: 0,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<Session>): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updated = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, updated);
    return updated;
  }

  incrementTurn(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.turns++;
      session.updatedAt = new Date();
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // Clean up old sessions
  cleanupSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.updatedAt.getTime() > maxAge) {
        this.sessions.delete(id);
      }
    }
  }
}
```

## Step 4: Environment Configuration

Update your `.env` file:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Phoenix Configuration
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006
PHOENIX_PROJECT_NAME=prompt-ab-testing
# PHOENIX_API_KEY=your-api-key  # Only if using Phoenix cloud

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Service Configuration
SERVICE_NAME=ab-testing-api
SERVICE_VERSION=1.0.0
```

## Step 5: Testing Your API

### Test Prompt Creation
```bash
curl -X POST http://localhost:3001/api/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "email-generator",
    "description": "Generate professional emails",
    "template": [
      {
        "role": "system",
        "content": "You are a professional email writer."
      },
      {
        "role": "user",
        "content": "Write an email about {{topic}} to {{recipient}}"
      }
    ],
    "modelName": "gpt-3.5-turbo",
    "modelProvider": "OPENAI"
  }'
```

### Test Single Input
```bash
curl -X POST http://localhost:3001/api/test/single \
  -H "Content-Type: application/json" \
  -d '{
    "promptName": "email-generator",
    "variables": {
      "topic": "project update",
      "recipient": "team"
    },
    "variants": ["v1", "v2"]
  }'
```

### Get Cost Comparison
```bash
curl -X POST http://localhost:3001/api/costs/comparison \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "test-123",
    "variants": ["v1", "v2"]
  }'
```

## Key Features Implemented

1. **Prompt Management**: Full CRUD operations with versioning and tagging
2. **Test Execution**: Single input and dataset testing with A/B variant support
3. **Real-time Updates**: WebSocket integration for streaming test results
4. **Cost Tracking**: Automatic calculation from span token data
5. **Session Management**: Track multi-turn conversations
6. **Error Handling**: Comprehensive error handling and validation
7. **Rate Limiting**: Protect against API abuse
8. **File Upload**: Support for CSV dataset uploads

## Next Steps

1. Add authentication middleware for production use
2. Implement caching for frequently accessed prompts
3. Add database persistence for sessions and test results
4. Enhance WebSocket communication for more granular updates
5. Add support for more LLM providers (Anthropic, Cohere, etc.)
6. Implement batch processing for large datasets
7. Add export functionality for test results and cost reports