// src/services/abTestExecutor.ts
// A/B Test Execution Engine - Runs real tests with OpenAI integration

import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { 
  ABTest, 
  TestResult, 
  ABTestExecution, 
  PromptVariant, 
  TestInput,
  VariantMetrics 
} from '../types/prompt';
import { withSession, tracedOperation } from '../instrumentation';
import { PromptManager } from './promptManager';

export class ABTestExecutor {
  constructor(
    private openai: OpenAI,
    private promptManager: PromptManager
  ) {}

  // ============================
  // MAIN EXECUTION METHODS
  // ============================

  async executeABTest(testId: string): Promise<ABTestExecution> {
    const test = this.promptManager.getABTest(testId);
    if (!test) {
      throw new Error(`A/B test ${testId} not found`);
    }

    if (test.status !== 'running') {
      throw new Error(`Cannot execute test in ${test.status} status`);
    }

    console.log(`🧬 Starting A/B Test Execution: ${test.name}`);
    console.log(`   📊 Variants: ${test.variants.length}`);
    console.log(`   📋 Inputs: ${test.inputs.length}`);
    console.log(`   🎯 Min Samples: ${test.configuration.minSampleSize} per variant`);

    const execution: ABTestExecution = {
      testId,
      status: 'running',
      progress: {
        completed: 0,
        total: this.calculateTotalExecutions(test),
        percentage: 0
      },
      currentResults: [],
      liveMetrics: {
        averageCostPerVariant: {},
        averageLatencyPerVariant: {},
        sampleCountPerVariant: {}
      },
      errors: []
    };

    try {
      // Execute test samples according to configuration
      const results = await this.executeTestSamples(test, execution);
      
      // Update test with results
      const updatedTest = this.promptManager.updateABTest(testId, {
        results: results,
        status: 'completed',
        completedAt: new Date()
      });

      execution.status = 'completed';
      execution.currentResults = results;
      execution.progress.completed = execution.progress.total;
      execution.progress.percentage = 100;

      console.log(`✅ A/B Test Execution Complete: ${results.length} results collected`);
      
      return execution;

    } catch (error) {
      console.error(`❌ A/B Test Execution Failed:`, error);
      execution.status = 'failed';
      execution.errors.push((error as Error).message);
      
      // Mark test as stopped due to error
      this.promptManager.updateABTest(testId, {
        status: 'stopped',
        completedAt: new Date()
      });

      throw error;
    }
  }

  async executeVariantComparison(
    variantA: PromptVariant,
    variantB: PromptVariant,
    input: TestInput
  ): Promise<{ resultA: TestResult; resultB: TestResult }> {
    console.log(`🔄 Running Side-by-Side Comparison:`);
    console.log(`   A: ${variantA.name}`);
    console.log(`   B: ${variantB.name}`);
    console.log(`   Input: ${input.prompt.substring(0, 50)}...`);

    const sessionId = `comparison-${Date.now()}`;

    // Execute both variants in parallel
    const [resultA, resultB] = await Promise.all([
      this.executeSingleVariant(variantA, input, sessionId, 'A'),
      this.executeSingleVariant(variantB, input, sessionId, 'B')
    ]);

    return { resultA, resultB };
  }

  // ============================
  // EXECUTION IMPLEMENTATION
  // ============================

  private async executeTestSamples(
    test: ABTest, 
    execution: ABTestExecution
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { minSampleSize, trafficSplit } = test.configuration;
    
    // Calculate samples per variant based on traffic split
    const samplesPerVariant = test.variants.map((_, index) => 
      Math.ceil((minSampleSize * trafficSplit[index]) / 100)
    );

    console.log(`📊 Execution Plan:`);
    test.variants.forEach((variant, index) => {
      console.log(`   ${variant.name}: ${samplesPerVariant[index]} samples`);
    });

    // Execute samples for each variant
    for (let variantIndex = 0; variantIndex < test.variants.length; variantIndex++) {
      const variant = test.variants[variantIndex];
      const targetSamples = samplesPerVariant[variantIndex];
      
      console.log(`\n🧪 Executing Variant ${variantIndex + 1}/${test.variants.length}: ${variant.name}`);
      
      // Execute samples for this variant
      for (let sampleIndex = 0; sampleIndex < targetSamples; sampleIndex++) {
        // Cycle through available inputs
        const inputIndex = sampleIndex % test.inputs.length;
        const input = test.inputs[inputIndex];
        
        try {
          const result = await this.executeSingleVariant(
            variant, 
            input, 
            `${test.id}-execution`,
            `${variant.name}-sample-${sampleIndex + 1}`
          );
          
          results.push(result);
          
          // Update live metrics
          this.updateLiveMetrics(execution, result, variant.id);
          
          // Update progress
          execution.progress.completed++;
          execution.progress.percentage = Math.round(
            (execution.progress.completed / execution.progress.total) * 100
          );
          
          console.log(`   ✅ Sample ${sampleIndex + 1}/${targetSamples} - Cost: $${result.cost.totalCost.toFixed(4)} - Latency: ${result.metrics.latency}ms`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`   ❌ Sample ${sampleIndex + 1} failed:`, (error as Error).message);
          execution.errors.push(`Variant ${variant.name} sample ${sampleIndex + 1}: ${(error as Error).message}`);
        }
      }
    }

    return results;
  }

  private async executeSingleVariant(
    variant: PromptVariant,
    input: TestInput,
    sessionId: string,
    executionContext: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    return withSession(sessionId, async () => {
      return tracedOperation(`ab-test-variant-execution`, {
        'variant.id': variant.id,
        'variant.name': variant.name,
        'variant.model': variant.metadata.model,
        'input.id': input.id,
        'test.context': executionContext,
        'execution.type': 'ab-test'
      }, async () => {
        
        // Interpolate template with variables
        const prompt = this.promptManager.interpolateTemplate(
          variant.template, 
          input.variables
        );

        console.log(`      📝 Prompt: ${prompt.substring(0, 80)}...`);

        // Execute OpenAI call
        const response = await this.openai.chat.completions.create({
          model: variant.metadata.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: variant.metadata.parameters.temperature || 0.7,
          max_tokens: variant.metadata.parameters.maxTokens || 1000,
          top_p: variant.metadata.parameters.topP,
          frequency_penalty: variant.metadata.parameters.frequencyPenalty,
          presence_penalty: variant.metadata.parameters.presencePenalty,
        });

        const endTime = Date.now();
        const latency = endTime - startTime;

        // Calculate costs
        const cost = this.calculateCost(
          response.usage?.prompt_tokens || 0,
          response.usage?.completion_tokens || 0,
          variant.metadata.model
        );

        // Create test result
        const result: TestResult = {
          id: uuidv4(),
          variantId: variant.id,
          inputId: input.id,
          response: response.choices[0].message.content || '',
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          },
          cost: {
            promptCost: cost.prompt,
            completionCost: cost.completion,
            totalCost: cost.total
          },
          metrics: {
            latency,
            timestamp: new Date(),
            sessionId,
            traceId: response.id
          }
        };

        console.log(`      💰 Cost: $${cost.total.toFixed(4)} | ⏱️ ${latency}ms | 🔢 ${result.usage.totalTokens} tokens`);

        return result;
      });
    });
  }

  // ============================
  // UTILITY METHODS
  // ============================

  private calculateTotalExecutions(test: ABTest): number {
    const { minSampleSize, trafficSplit } = test.configuration;
    return test.variants.reduce((total, _, index) => {
      return total + Math.ceil((minSampleSize * trafficSplit[index]) / 100);
    }, 0);
  }

  private updateLiveMetrics(
    execution: ABTestExecution,
    result: TestResult,
    variantId: string
  ): void {
    const { liveMetrics } = execution;

    // Initialize if first result for this variant
    if (!liveMetrics.averageCostPerVariant[variantId]) {
      liveMetrics.averageCostPerVariant[variantId] = 0;
      liveMetrics.averageLatencyPerVariant[variantId] = 0;
      liveMetrics.sampleCountPerVariant[variantId] = 0;
    }

    const currentCount = liveMetrics.sampleCountPerVariant[variantId];
    const newCount = currentCount + 1;

    // Update running averages
    liveMetrics.averageCostPerVariant[variantId] = 
      (liveMetrics.averageCostPerVariant[variantId] * currentCount + result.cost.totalCost) / newCount;
    
    liveMetrics.averageLatencyPerVariant[variantId] = 
      (liveMetrics.averageLatencyPerVariant[variantId] * currentCount + result.metrics.latency) / newCount;
    
    liveMetrics.sampleCountPerVariant[variantId] = newCount;
  }

  private calculateCost(
    promptTokens: number, 
    completionTokens: number, 
    model: string
  ): { prompt: number; completion: number; total: number } {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];

    const promptCost = (promptTokens / 1000) * modelPricing.input;
    const completionCost = (completionTokens / 1000) * modelPricing.output;

    return {
      prompt: promptCost,
      completion: completionCost,
      total: promptCost + completionCost
    };
  }

  // ============================
  // METRICS CALCULATION
  // ============================

  calculateVariantMetrics(results: TestResult[], variantId: string): VariantMetrics {
    const variantResults = results.filter(r => r.variantId === variantId);
    
    if (variantResults.length === 0) {
      return {
        averageCost: 0,
        averageLatency: 0,
        totalSamples: 0,
        errorRate: 0,
        costEfficiency: 0,
        performanceScore: 0
      };
    }

    const totalCost = variantResults.reduce((sum, r) => sum + r.cost.totalCost, 0);
    const totalLatency = variantResults.reduce((sum, r) => sum + r.metrics.latency, 0);
    const averageCost = totalCost / variantResults.length;
    const averageLatency = totalLatency / variantResults.length;

    // Simple performance score (inverse of cost + latency)
    const performanceScore = 1 / (averageCost * 1000 + averageLatency / 1000);

    return {
      averageCost,
      averageLatency,
      averageQuality: undefined, // TODO: Implement quality scoring
      totalSamples: variantResults.length,
      errorRate: 0, // TODO: Track errors
      costEfficiency: 1 / averageCost, // Simple inverse relationship
      performanceScore
    };
  }

  // ============================
  // EXECUTION MONITORING
  // ============================

  async getExecutionStatus(testId: string): Promise<ABTestExecution | null> {
    const test = this.promptManager.getABTest(testId);
    if (!test) {
      return null;
    }

    // Create execution status from current test state
    const execution: ABTestExecution = {
      testId,
      status: test.status === 'running' ? 'running' : 
              test.status === 'completed' ? 'completed' : 'queued',
      progress: {
        completed: test.results.length,
        total: this.calculateTotalExecutions(test),
        percentage: Math.round((test.results.length / this.calculateTotalExecutions(test)) * 100)
      },
      currentResults: test.results,
      liveMetrics: this.calculateLiveMetrics(test.results, test.variants.map(v => v.id)),
      errors: []
    };

    return execution;
  }

  private calculateLiveMetrics(
    results: TestResult[], 
    variantIds: string[]
  ): ABTestExecution['liveMetrics'] {
    const metrics = {
      averageCostPerVariant: {} as Record<string, number>,
      averageLatencyPerVariant: {} as Record<string, number>,
      sampleCountPerVariant: {} as Record<string, number>
    };

    variantIds.forEach(variantId => {
      const variantResults = results.filter(r => r.variantId === variantId);
      
      if (variantResults.length > 0) {
        metrics.averageCostPerVariant[variantId] = 
          variantResults.reduce((sum, r) => sum + r.cost.totalCost, 0) / variantResults.length;
        
        metrics.averageLatencyPerVariant[variantId] = 
          variantResults.reduce((sum, r) => sum + r.metrics.latency, 0) / variantResults.length;
        
        metrics.sampleCountPerVariant[variantId] = variantResults.length;
      } else {
        metrics.averageCostPerVariant[variantId] = 0;
        metrics.averageLatencyPerVariant[variantId] = 0;
        metrics.sampleCountPerVariant[variantId] = 0;
      }
    });

    return metrics;
  }
} 