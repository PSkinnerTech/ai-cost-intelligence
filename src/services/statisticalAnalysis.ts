// src/services/statisticalAnalysis.ts
// Statistical Analysis for A/B Testing with significance testing and winner determination

import {
  TestResult,
  StatisticalResult,
  VariantComparison,
  VariantMetrics,
  ABTestResults,
  PromptVariant
} from '../types/prompt';

export class StatisticalAnalysis {

  // ============================
  // STATISTICAL SIGNIFICANCE TESTING
  // ============================

  calculateSignificance(
    controlResults: TestResult[],
    treatmentResults: TestResult[],
    metric: 'cost' | 'latency' | 'quality' = 'cost'
  ): StatisticalResult {
    console.log(`📊 Calculating Statistical Significance for ${metric.toUpperCase()}`);
    console.log(`   Control samples: ${controlResults.length}`);
    console.log(`   Treatment samples: ${treatmentResults.length}`);

    if (controlResults.length < 2 || treatmentResults.length < 2) {
      return this.createInsufficientDataResult(controlResults.length, treatmentResults.length);
    }

    // Extract values based on metric
    const controlValues = this.extractMetricValues(controlResults, metric);
    const treatmentValues = this.extractMetricValues(treatmentResults, metric);

    // Calculate means and standard deviations
    const controlMean = this.calculateMean(controlValues);
    const treatmentMean = this.calculateMean(treatmentValues);
    const controlStd = this.calculateStandardDeviation(controlValues);
    const treatmentStd = this.calculateStandardDeviation(treatmentValues);

    console.log(`   Control mean: ${controlMean.toFixed(6)}`);
    console.log(`   Treatment mean: ${treatmentMean.toFixed(6)}`);

    // Perform Welch's t-test (unequal variances)
    const result = this.welchTTest(
      controlValues, treatmentValues,
      controlMean, treatmentMean,
      controlStd, treatmentStd
    );

    // Calculate effect size (Cohen's d)
    const pooledStd = Math.sqrt(
      ((controlResults.length - 1) * controlStd * controlStd + 
       (treatmentResults.length - 1) * treatmentStd * treatmentStd) /
      (controlResults.length + treatmentResults.length - 2)
    );
    const effectSize = Math.abs(treatmentMean - controlMean) / pooledStd;

    // Calculate confidence interval for difference in means
    const confidenceInterval = this.calculateConfidenceInterval(
      controlValues, treatmentValues, 0.95
    );

    // Power analysis
    const powerAnalysis = this.calculatePowerAnalysis(effectSize, controlResults.length, treatmentResults.length);

    const statisticalResult: StatisticalResult = {
      significant: result.pValue < 0.05,
      pValue: result.pValue,
      confidenceInterval,
      effectSize,
      sampleSizeA: controlResults.length,
      sampleSizeB: treatmentResults.length,
      powerAnalysis
    };

    console.log(`   P-value: ${result.pValue.toFixed(6)}`);
    console.log(`   Significant: ${statisticalResult.significant ? 'YES' : 'NO'}`);
    console.log(`   Effect size: ${effectSize.toFixed(4)}`);

    return statisticalResult;
  }

  // ============================
  // VARIANT COMPARISON & WINNER DETERMINATION
  // ============================

  compareVariants(
    variantA: PromptVariant,
    variantB: PromptVariant,
    allResults: TestResult[],
    confidenceLevel: number = 0.95
  ): VariantComparison {
    console.log(`🔬 Comparing Variants: ${variantA.name} vs ${variantB.name}`);

    const resultsA = allResults.filter(r => r.variantId === variantA.id);
    const resultsB = allResults.filter(r => r.variantId === variantB.id);

    // Calculate metrics for each variant
    const metricsA = this.calculateVariantMetrics(resultsA);
    const metricsB = this.calculateVariantMetrics(resultsB);

    // Perform statistical test on cost (primary metric)
    const statistical = this.calculateSignificance(resultsA, resultsB, 'cost');

    // Determine winner and generate recommendation
    const recommendation = this.generateRecommendation(
      variantA, variantB, metricsA, metricsB, statistical
    );

    return {
      variantA: {
        id: variantA.id,
        name: variantA.name,
        metrics: metricsA
      },
      variantB: {
        id: variantB.id,
        name: variantB.name,
        metrics: metricsB
      },
      statistical,
      recommendation
    };
  }

  determineWinner(
    variants: PromptVariant[],
    allResults: TestResult[],
    primaryMetric: 'cost' | 'latency' | 'quality' = 'cost'
  ): ABTestResults {
    console.log(`🏆 Determining Overall Winner - Primary Metric: ${primaryMetric.toUpperCase()}`);

    const comparisons: VariantComparison[] = [];
    let overallWinner: ABTestResults['overallWinner'];
    let bestVariant = variants[0];
    let bestMetrics = this.calculateVariantMetrics(
      allResults.filter(r => r.variantId === variants[0].id)
    );

    // Compare all variant pairs
    for (let i = 0; i < variants.length; i++) {
      for (let j = i + 1; j < variants.length; j++) {
        const comparison = this.compareVariants(
          variants[i], 
          variants[j], 
          allResults
        );
        comparisons.push(comparison);
      }
    }

    // Find best variant based on primary metric
    for (const variant of variants) {
      const variantResults = allResults.filter(r => r.variantId === variant.id);
      const metrics = this.calculateVariantMetrics(variantResults);
      
      const isBetter = this.isVariantBetter(metrics, bestMetrics, primaryMetric);
      if (isBetter) {
        bestVariant = variant;
        bestMetrics = metrics;
      }
    }

    // Check if winner is statistically significant
    const bestVariantResults = allResults.filter(r => r.variantId === bestVariant.id);
    let confidence = 0.5; // Default 50% confidence
    let reasoning = `${bestVariant.name} selected based on ${primaryMetric} optimization`;

    // Find statistical significance against other variants
    const significantComparisons = comparisons.filter(comp => 
      comp.statistical.significant && 
      (comp.variantA.id === bestVariant.id || comp.variantB.id === bestVariant.id)
    );

    if (significantComparisons.length > 0) {
      confidence = 0.95;
      reasoning += ` with statistical significance (p < 0.05)`;
    } else if (bestVariantResults.length >= 10) {
      confidence = 0.8;
      reasoning += ` with sufficient sample size but no statistical significance`;
    }

    overallWinner = {
      variantId: bestVariant.id,
      confidence,
      reasoning
    };

    // Calculate insights
    const insights = this.generateInsights(variants, allResults, bestVariant, bestMetrics);

    // Calculate raw data summary
    const rawData = {
      totalSamples: allResults.length,
      totalCost: allResults.reduce((sum, r) => sum + r.cost.totalCost, 0),
      totalDuration: allResults.reduce((sum, r) => sum + r.metrics.latency, 0),
      errorCount: 0 // TODO: Track actual errors
    };

    const status: ABTestResults['status'] = 
      significantComparisons.length > 0 ? 'significant' :
      allResults.length >= variants.length * 10 ? 'inconclusive' : 'incomplete';

    return {
      id: `results-${Date.now()}`,
      testId: 'current-test',
      status,
      comparisons,
      overallWinner,
      insights,
      rawData,
      generatedAt: new Date()
    };
  }

  // ============================
  // STATISTICAL HELPER METHODS
  // ============================

  private welchTTest(
    sample1: number[], 
    sample2: number[], 
    mean1: number, 
    mean2: number, 
    std1: number, 
    std2: number
  ): { tStatistic: number; pValue: number; degreesOfFreedom: number } {
    const n1 = sample1.length;
    const n2 = sample2.length;

    // Calculate standard error
    const se = Math.sqrt((std1 * std1) / n1 + (std2 * std2) / n2);
    
    // Calculate t-statistic
    const tStatistic = (mean1 - mean2) / se;

    // Calculate degrees of freedom (Welch-Satterthwaite equation)
    const numerator = Math.pow((std1 * std1) / n1 + (std2 * std2) / n2, 2);
    const denominator = 
      Math.pow((std1 * std1) / n1, 2) / (n1 - 1) + 
      Math.pow((std2 * std2) / n2, 2) / (n2 - 1);
    const degreesOfFreedom = numerator / denominator;

    // Calculate p-value (two-tailed test)
    const pValue = this.tDistributionPValue(Math.abs(tStatistic), degreesOfFreedom) * 2;

    return { tStatistic, pValue, degreesOfFreedom };
  }

  private tDistributionPValue(t: number, df: number): number {
    // Simplified p-value calculation using approximation
    // For production, use a proper statistical library
    if (df >= 30) {
      // Use normal approximation for large df
      return 1 - this.normalCDF(t);
    }
    
    // Rough approximation for small degrees of freedom
    const critical95 = 2.0; // Approximate critical value for p=0.05
    const critical99 = 2.6; // Approximate critical value for p=0.01
    
    if (t >= critical99) return 0.005;
    if (t >= critical95) return 0.025;
    if (t >= 1.5) return 0.1;
    return 0.25;
  }

  private normalCDF(z: number): number {
    // Approximation of normal cumulative distribution function
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  private calculateConfidenceInterval(
    sample1: number[], 
    sample2: number[], 
    confidence: number
  ): { lower: number; upper: number } {
    const mean1 = this.calculateMean(sample1);
    const mean2 = this.calculateMean(sample2);
    const diff = mean2 - mean1;
    
    const std1 = this.calculateStandardDeviation(sample1);
    const std2 = this.calculateStandardDeviation(sample2);
    
    const se = Math.sqrt((std1 * std1) / sample1.length + (std2 * std2) / sample2.length);
    const margin = 1.96 * se; // Approximate 95% CI
    
    return {
      lower: diff - margin,
      upper: diff + margin
    };
  }

  // ============================
  // METRICS AND UTILITIES
  // ============================

  private extractMetricValues(results: TestResult[], metric: string): number[] {
    switch (metric) {
      case 'cost':
        return results.map(r => r.cost.totalCost);
      case 'latency':
        return results.map(r => r.metrics.latency);
      case 'quality':
        return results.map(r => r.evaluation?.qualityScore || 0.5);
      default:
        return results.map(r => r.cost.totalCost);
    }
  }

  private calculateVariantMetrics(results: TestResult[]): VariantMetrics {
    if (results.length === 0) {
      return {
        averageCost: 0,
        averageLatency: 0,
        totalSamples: 0,
        errorRate: 0,
        costEfficiency: 0,
        performanceScore: 0
      };
    }

    const totalCost = results.reduce((sum, r) => sum + r.cost.totalCost, 0);
    const totalLatency = results.reduce((sum, r) => sum + r.metrics.latency, 0);
    const averageCost = totalCost / results.length;
    const averageLatency = totalLatency / results.length;

    return {
      averageCost,
      averageLatency,
      averageQuality: results.reduce((sum, r) => sum + (r.evaluation?.qualityScore || 0.5), 0) / results.length,
      totalSamples: results.length,
      errorRate: 0, // TODO: Implement error tracking
      costEfficiency: 1 / averageCost,
      performanceScore: 1 / (averageCost * 1000 + averageLatency / 1000)
    };
  }

  private isVariantBetter(
    variantMetrics: VariantMetrics, 
    bestMetrics: VariantMetrics, 
    primaryMetric: string
  ): boolean {
    switch (primaryMetric) {
      case 'cost':
        return variantMetrics.averageCost < bestMetrics.averageCost;
      case 'latency':
        return variantMetrics.averageLatency < bestMetrics.averageLatency;
      case 'quality':
        return (variantMetrics.averageQuality || 0) > (bestMetrics.averageQuality || 0);
      default:
        return variantMetrics.performanceScore > bestMetrics.performanceScore;
    }
  }

  private generateRecommendation(
    variantA: PromptVariant,
    variantB: PromptVariant,
    metricsA: VariantMetrics,
    metricsB: VariantMetrics,
    statistical: StatisticalResult
  ): VariantComparison['recommendation'] {
    const costDiff = ((metricsB.averageCost - metricsA.averageCost) / metricsA.averageCost) * 100;
    const latencyDiff = ((metricsB.averageLatency - metricsA.averageLatency) / metricsA.averageLatency) * 100;
    
    let winner: string | undefined;
    let confidence: 'low' | 'medium' | 'high' = 'low';
    let reasoning = '';
    let actionRequired = '';

    if (statistical.significant) {
      confidence = 'high';
      winner = metricsA.averageCost < metricsB.averageCost ? variantA.id : variantB.id;
      const winnerName = winner === variantA.id ? variantA.name : variantB.name;
      const savings = Math.abs(costDiff);
      
      reasoning = `${winnerName} is statistically significantly better (p = ${statistical.pValue.toFixed(4)}). `;
      reasoning += `Cost difference: ${savings.toFixed(1)}%, Effect size: ${statistical.effectSize.toFixed(3)}`;
      actionRequired = `Deploy ${winnerName} - statistically proven improvement`;
      
    } else if (statistical.sampleSizeA >= 10 && statistical.sampleSizeB >= 10) {
      confidence = 'medium';
      const leadingVariant = metricsA.averageCost < metricsB.averageCost ? variantA : variantB;
      const leadingMetrics = leadingVariant.id === variantA.id ? metricsA : metricsB;
      
      reasoning = `${leadingVariant.name} shows better performance but not statistically significant. `;
      reasoning += `Need more samples for conclusive results. Current p-value: ${statistical.pValue.toFixed(4)}`;
      actionRequired = `Continue testing - collect ${statistical.powerAnalysis.requiredSampleSize} samples per variant`;
      
    } else {
      reasoning = 'Insufficient data for reliable comparison. ';
      reasoning += `Need at least 10 samples per variant (current: A=${statistical.sampleSizeA}, B=${statistical.sampleSizeB})`;
      actionRequired = 'Collect more data before making decisions';
    }

    return {
      winner,
      reasoning,
      confidence,
      actionRequired
    };
  }

  private generateInsights(
    variants: PromptVariant[],
    allResults: TestResult[],
    bestVariant: PromptVariant,
    bestMetrics: VariantMetrics
  ): ABTestResults['insights'] {
    const totalCost = allResults.reduce((sum, r) => sum + r.cost.totalCost, 0);
    const averageCost = totalCost / allResults.length;
    
    const costSavings = (averageCost - bestMetrics.averageCost) * allResults.length;
    const performanceGain = bestMetrics.performanceScore;
    
    const recommendations: string[] = [
      `Deploy ${bestVariant.name} as the winning variant`,
      `Potential cost savings: $${costSavings.toFixed(4)} based on current test volume`,
      `Monitor performance metrics continuously`,
      `Consider testing additional variants to optimize further`
    ];

    if (bestMetrics.totalSamples < 30) {
      recommendations.push('Increase sample size for more robust results');
    }

    return {
      costSavings: costSavings > 0 ? costSavings : undefined,
      performanceGain,
      qualityImprovement: bestMetrics.averageQuality,
      recommendations
    };
  }

  private calculatePowerAnalysis(
    effectSize: number, 
    sampleSizeA: number, 
    sampleSizeB: number
  ): StatisticalResult['powerAnalysis'] {
    // Simplified power calculation
    const minSampleSize = Math.min(sampleSizeA, sampleSizeB);
    const achievedPower = minSampleSize >= 30 ? 0.8 : minSampleSize / 30 * 0.8;
    
    // Required sample size for 80% power (rough estimate)
    const requiredSampleSize = Math.max(30, Math.ceil(16 / (effectSize * effectSize)));
    
    return {
      achievedPower,
      requiredSampleSize
    };
  }

  private createInsufficientDataResult(sampleSizeA: number, sampleSizeB: number): StatisticalResult {
    return {
      significant: false,
      pValue: 1.0,
      confidenceInterval: { lower: 0, upper: 0 },
      effectSize: 0,
      sampleSizeA,
      sampleSizeB,
      powerAnalysis: {
        achievedPower: 0,
        requiredSampleSize: 10
      }
    };
  }
} 