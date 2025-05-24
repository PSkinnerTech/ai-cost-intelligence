export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}

export interface CostBreakdown {
  prompt: number;
  completion: number;
  total: number;
  model: string;
  currency: string;
}

export interface CostAnalytics {
  totalCost: number;
  totalTokens: number;
  breakdown: {
    byModel: Record<string, CostBreakdown>;
    byTimeRange: Array<{
      period: string;
      cost: number;
      tokens: number;
    }>;
  };
  averageCostPerToken: number;
  mostExpensiveModel: string;
  costTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface PricingTier {
  input: number;  // Price per 1K tokens
  output: number; // Price per 1K tokens
  effectiveDate?: string;
  deprecated?: boolean;
}

export class CostCalculator {
  private pricing: Record<string, PricingTier> = {
    // OpenAI Models (as of 2024)
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
    'gpt-4-1106-preview': { input: 0.01, output: 0.03 },
    'gpt-4-0125-preview': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-3.5-turbo-0125': { input: 0.0005, output: 0.0015 },
    'gpt-3.5-turbo-1106': { input: 0.001, output: 0.002 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o-2024-05-13': { input: 0.005, output: 0.015 },
    
    // Legacy models
    'text-davinci-003': { input: 0.02, output: 0.02, deprecated: true },
    'text-curie-001': { input: 0.002, output: 0.002, deprecated: true },
    
    // Default fallback
    'default': { input: 0.001, output: 0.002 },
  };

  private currency = 'USD';

  /**
   * Calculate cost for token usage
   */
  calculateCost(usage: TokenUsage): CostBreakdown {
    const modelPricing = this.pricing[usage.model] || this.pricing['default'];
    
    const promptCost = (usage.promptTokens / 1000) * modelPricing.input;
    const completionCost = (usage.completionTokens / 1000) * modelPricing.output;
    const totalCost = promptCost + completionCost;

    return {
      prompt: Number(promptCost.toFixed(6)),
      completion: Number(completionCost.toFixed(6)),
      total: Number(totalCost.toFixed(6)),
      model: usage.model,
      currency: this.currency,
    };
  }

  /**
   * Calculate cost from separate token counts
   */
  calculateTokenCost(promptTokens: number, completionTokens: number, model: string): CostBreakdown {
    return this.calculateCost({
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model,
    });
  }

  /**
   * Get pricing for a specific model
   */
  getModelPricing(model: string): PricingTier | null {
    return this.pricing[model] || null;
  }

  /**
   * List all available models and their pricing
   */
  getAllPricing(): Record<string, PricingTier> {
    return { ...this.pricing };
  }

  /**
   * Update pricing for a model
   */
  updateModelPricing(model: string, pricing: PricingTier): void {
    this.pricing[model] = {
      ...pricing,
      effectiveDate: new Date().toISOString(),
    };
    console.log(`💰 Updated pricing for ${model}: $${pricing.input}/$${pricing.output} per 1K tokens`);
  }

  /**
   * Estimate cost for a prompt before execution
   */
  estimateCost(promptText: string, model: string, maxTokens: number = 100): CostBreakdown {
    // Rough estimation: 1 token ≈ 4 characters for English text
    const estimatedPromptTokens = Math.ceil(promptText.length / 4);
    const estimatedCompletionTokens = maxTokens;

    return this.calculateTokenCost(estimatedPromptTokens, estimatedCompletionTokens, model);
  }

  /**
   * Compare costs between different models for the same usage
   */
  compareModels(usage: TokenUsage, models: string[]): Record<string, CostBreakdown> {
    const comparison: Record<string, CostBreakdown> = {};
    
    models.forEach(model => {
      comparison[model] = this.calculateTokenCost(
        usage.promptTokens,
        usage.completionTokens,
        model
      );
    });

    return comparison;
  }

  /**
   * Aggregate costs from multiple usage records
   */
  aggregateCosts(usages: TokenUsage[]): CostAnalytics {
    let totalCost = 0;
    let totalTokens = 0;
    const byModel: Record<string, CostBreakdown> = {};

    usages.forEach(usage => {
      const cost = this.calculateCost(usage);
      totalCost += cost.total;
      totalTokens += usage.totalTokens;

      if (!byModel[usage.model]) {
        byModel[usage.model] = {
          prompt: 0,
          completion: 0,
          total: 0,
          model: usage.model,
          currency: this.currency,
        };
      }

      byModel[usage.model].prompt += cost.prompt;
      byModel[usage.model].completion += cost.completion;
      byModel[usage.model].total += cost.total;
    });

    // Find most expensive model
    const mostExpensiveModel = Object.entries(byModel)
      .sort(([,a], [,b]) => b.total - a.total)[0]?.[0] || 'unknown';

    return {
      totalCost: Number(totalCost.toFixed(6)),
      totalTokens,
      breakdown: {
        byModel,
        byTimeRange: [], // TODO: Implement time-based aggregation
      },
      averageCostPerToken: totalTokens > 0 ? Number((totalCost / totalTokens).toFixed(8)) : 0,
      mostExpensiveModel,
      costTrend: 'stable', // TODO: Implement trend analysis
    };
  }

  /**
   * Calculate savings from using a cheaper model
   */
  calculateSavings(usage: TokenUsage, fromModel: string, toModel: string): {
    originalCost: number;
    newCost: number;
    savings: number;
    savingsPercentage: number;
  } {
    const originalCost = this.calculateTokenCost(usage.promptTokens, usage.completionTokens, fromModel);
    const newCost = this.calculateTokenCost(usage.promptTokens, usage.completionTokens, toModel);
    
    const savings = originalCost.total - newCost.total;
    const savingsPercentage = originalCost.total > 0 ? (savings / originalCost.total) * 100 : 0;

    return {
      originalCost: originalCost.total,
      newCost: newCost.total,
      savings: Number(savings.toFixed(6)),
      savingsPercentage: Number(savingsPercentage.toFixed(2)),
    };
  }

  /**
   * Get cost-effectiveness ranking of models
   */
  getCostEffectivenessRanking(usage: TokenUsage): Array<{
    model: string;
    cost: number;
    ranking: number;
  }> {
    const models = Object.keys(this.pricing).filter(m => m !== 'default' && !this.pricing[m].deprecated);
    
    const costs = models.map(model => ({
      model,
      cost: this.calculateTokenCost(usage.promptTokens, usage.completionTokens, model).total,
      ranking: 0,
    }));

    // Sort by cost (ascending) and assign rankings
    costs.sort((a, b) => a.cost - b.cost);
    costs.forEach((item, index) => {
      item.ranking = index + 1;
    });

    return costs;
  }

  /**
   * Format cost for display
   */
  formatCost(cost: number, includeSymbol: boolean = true): string {
    const symbol = includeSymbol ? '$' : '';
    
    if (cost < 0.01) {
      return `${symbol}${cost.toFixed(6)}`;
    } else if (cost < 1) {
      return `${symbol}${cost.toFixed(4)}`;
    } else {
      return `${symbol}${cost.toFixed(2)}`;
    }
  }

  /**
   * Get monthly cost projection based on current usage
   */
  projectMonthlyCost(dailyUsages: TokenUsage[]): {
    dailyAverage: number;
    monthlyProjection: number;
    breakdown: Record<string, number>;
  } {
    const dailyAnalytics = this.aggregateCosts(dailyUsages);
    const dailyAverage = dailyAnalytics.totalCost;
    const monthlyProjection = dailyAverage * 30;

    const breakdown: Record<string, number> = {};
    Object.entries(dailyAnalytics.breakdown.byModel).forEach(([model, cost]) => {
      breakdown[model] = cost.total * 30;
    });

    return {
      dailyAverage: Number(dailyAverage.toFixed(6)),
      monthlyProjection: Number(monthlyProjection.toFixed(2)),
      breakdown,
    };
  }
}

// Export singleton instance
export const costCalculator = new CostCalculator(); 