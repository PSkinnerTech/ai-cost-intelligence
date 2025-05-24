// src/types/prompt.ts
// Data models for A/B testing and prompt management

export interface PromptVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required: boolean;
}

export interface PromptVariant {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  version: number;
  parentId?: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tags: string[];
    model: string;
    parameters: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    };
  };
}

export interface TestInput {
  id: string;
  prompt: string;
  variables: Record<string, string>;
  expectedOutput?: string;
  category?: string;
}

export interface TestResult {
  id: string;
  variantId: string;
  inputId: string;
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: {
    promptCost: number;
    completionCost: number;
    totalCost: number;
  };
  metrics: {
    latency: number;
    timestamp: Date;
    sessionId: string;
    traceId?: string;
  };
  evaluation?: {
    qualityScore?: number;
    relevanceScore?: number;
    userRating?: number;
    feedback?: string;
  };
}

export interface ABTestConfiguration {
  minSampleSize: number;
  maxSampleSize?: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  trafficSplit: number[]; // [50, 50] for equal split
  maxDuration: number; // milliseconds
  stopOnSignificance: boolean;
  primaryMetric: 'cost' | 'quality' | 'latency' | 'custom';
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: PromptVariant[];
  inputs: TestInput[];
  configuration: ABTestConfiguration;
  status: 'draft' | 'running' | 'completed' | 'paused' | 'stopped';
  results: TestResult[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
}

export interface StatisticalResult {
  significant: boolean;
  pValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  effectSize: number;
  sampleSizeA: number;
  sampleSizeB: number;
  powerAnalysis: {
    achievedPower: number;
    requiredSampleSize: number;
  };
}

export interface VariantComparison {
  variantA: {
    id: string;
    name: string;
    metrics: VariantMetrics;
  };
  variantB: {
    id: string;
    name: string;
    metrics: VariantMetrics;
  };
  statistical: StatisticalResult;
  recommendation: {
    winner?: string;
    reasoning: string;
    confidence: 'low' | 'medium' | 'high';
    actionRequired: string;
  };
}

export interface VariantMetrics {
  averageCost: number;
  averageLatency: number;
  averageQuality?: number;
  totalSamples: number;
  errorRate: number;
  costEfficiency: number; // quality per dollar
  performanceScore: number; // composite metric
}

export interface ABTestResults {
  id: string;
  testId: string;
  status: 'incomplete' | 'significant' | 'inconclusive';
  comparisons: VariantComparison[];
  overallWinner?: {
    variantId: string;
    confidence: number;
    reasoning: string;
  };
  insights: {
    costSavings?: number;
    performanceGain?: number;
    qualityImprovement?: number;
    recommendations: string[];
  };
  rawData: {
    totalSamples: number;
    totalCost: number;
    totalDuration: number;
    errorCount: number;
  };
  generatedAt: Date;
}

export interface ABTestExecution {
  testId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  currentResults: TestResult[];
  liveMetrics: {
    averageCostPerVariant: Record<string, number>;
    averageLatencyPerVariant: Record<string, number>;
    sampleCountPerVariant: Record<string, number>;
  };
  estimatedCompletion?: Date;
  errors: string[];
} 