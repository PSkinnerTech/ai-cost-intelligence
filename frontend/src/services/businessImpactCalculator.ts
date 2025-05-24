// Business Impact Calculator Service
// Transforms technical A/B test metrics into actionable business intelligence

export interface BusinessImpact {
  costSavings: {
    perRequest: number;          // Dollar savings per request
    percentage: number;          // Percentage cost reduction
    monthly: number;             // Monthly savings projection
    annual: number;              // Annual savings projection
    paybackPeriod: string;       // Time to break even
  };
  qualityAssurance: {
    satisfactionScore: number;   // Quality score maintained (0-100)
    latencyImprovement: number;  // Performance improvement percentage
    tokenEfficiency: number;     // Token efficiency multiplier
    riskLevel: 'Minimal' | 'Low' | 'Medium' | 'High';
  };
  deploymentRecommendation: {
    confidence: 'High' | 'Medium' | 'Low';
    action: 'Deploy' | 'Test Further' | 'Redesign';
    reasoning: string;
    timeline: string;
  };
  executiveSummary: {
    headline: string;
    keyMetrics: string[];
    businessJustification: string;
    nextSteps: string[];
  };
}

export interface UsagePattern {
  requestsPerMonth: number;
  growthRate?: number;
  peakMultiplier?: number;
}

export interface TestResults {
  variantA: {
    avgCost: number;
    avgLatency: number;
    totalSamples: number;
    avgTokens: number;
  };
  variantB: {
    avgCost: number;
    avgLatency: number;
    totalSamples: number;
    avgTokens: number;
  };
  statistical: {
    significant: boolean;
    pValue: number;
    winner: string;
    effectSize: number;
  };
}

export class BusinessImpactCalculator {
  // Default usage pattern for calculations
  private defaultUsage: UsagePattern = {
    requestsPerMonth: 10000,
    growthRate: 0.15, // 15% monthly growth
    peakMultiplier: 1.5
  };

  /**
   * Calculate comprehensive business impact from A/B test results
   */
  calculateBusinessImpact(
    testResults: TestResults, 
    usage: UsagePattern = this.defaultUsage
  ): BusinessImpact {
    const costSavings = this.calculateCostSavings(testResults, usage);
    const qualityAssurance = this.assessQualityImpact(testResults);
    const deploymentRecommendation = this.generateDeploymentRecommendation(testResults, qualityAssurance);
    const executiveSummary = this.generateExecutiveSummary(testResults, costSavings, qualityAssurance);

    return {
      costSavings,
      qualityAssurance,
      deploymentRecommendation,
      executiveSummary
    };
  }

  /**
   * Calculate cost savings and ROI projections
   */
  private calculateCostSavings(testResults: TestResults, usage: UsagePattern): BusinessImpact['costSavings'] {
    const { variantA, variantB, statistical } = testResults;
    
    // Determine winner and cost difference
    const winnerIsA = statistical.winner === 'Variant A' || variantA.avgCost < variantB.avgCost;
    const lowerCost = winnerIsA ? variantA.avgCost : variantB.avgCost;
    const higherCost = winnerIsA ? variantB.avgCost : variantA.avgCost;
    
    const perRequestSavings = higherCost - lowerCost;
    const percentageReduction = (perRequestSavings / higherCost) * 100;
    
    // Monthly and annual projections
    const monthlySavings = perRequestSavings * usage.requestsPerMonth;
    const annualSavings = monthlySavings * 12;
    
    // Factor in growth
    const annualSavingsWithGrowth = annualSavings * (1 + (usage.growthRate || 0) * 6); // Mid-year growth effect
    
    return {
      perRequest: perRequestSavings,
      percentage: percentageReduction,
      monthly: monthlySavings,
      annual: annualSavingsWithGrowth,
      paybackPeriod: perRequestSavings > 0 ? 'Immediate' : 'N/A'
    };
  }

  /**
   * Assess quality impact and performance changes
   */
  private assessQualityImpact(testResults: TestResults): BusinessImpact['qualityAssurance'] {
    const { variantA, variantB, statistical } = testResults;
    
    // Determine winner metrics
    const winnerIsA = statistical.winner === 'Variant A' || variantA.avgCost < variantB.avgCost;
    const winnerMetrics = winnerIsA ? variantA : variantB;
    const loserMetrics = winnerIsA ? variantB : variantA;
    
    // Calculate performance improvements
    const latencyChange = ((loserMetrics.avgLatency - winnerMetrics.avgLatency) / loserMetrics.avgLatency) * 100;
    const tokenEfficiency = loserMetrics.avgTokens / winnerMetrics.avgTokens;
    
    // Quality score based on cost efficiency + performance
    const costEfficiency = (loserMetrics.avgCost / winnerMetrics.avgCost) * 30; // Max 30 points
    const speedImprovement = Math.max(0, latencyChange) * 0.5; // Max ~15-20 points  
    const tokenScore = Math.min(20, tokenEfficiency * 5); // Max 20 points
    const statisticalConfidence = statistical.significant ? 25 : 10; // Max 25 points
    
    const satisfactionScore = Math.min(100, costEfficiency + speedImprovement + tokenScore + statisticalConfidence);
    
    // Risk assessment
    let riskLevel: 'Minimal' | 'Low' | 'Medium' | 'High' = 'Minimal';
    if (!statistical.significant) riskLevel = 'Medium';
    if (latencyChange < -20) riskLevel = 'High'; // Significant slowdown
    if (satisfactionScore < 70) riskLevel = 'High';
    else if (satisfactionScore < 85) riskLevel = 'Low';
    
    return {
      satisfactionScore: Math.round(satisfactionScore),
      latencyImprovement: Math.max(0, latencyChange),
      tokenEfficiency: tokenEfficiency,
      riskLevel
    };
  }

  /**
   * Generate deployment recommendation based on results
   */
  private generateDeploymentRecommendation(
    testResults: TestResults, 
    quality: BusinessImpact['qualityAssurance']
  ): BusinessImpact['deploymentRecommendation'] {
    const { statistical } = testResults;
    
    let confidence: 'High' | 'Medium' | 'Low' = 'High';
    let action: 'Deploy' | 'Test Further' | 'Redesign' = 'Deploy';
    let reasoning = '';
    let timeline = 'Deploy immediately for maximum savings';
    
    // Determine confidence and action
    if (!statistical.significant) {
      confidence = 'Medium';
      action = 'Test Further';
      reasoning = 'Results not statistically significant. Recommend additional testing.';
      timeline = 'Collect more data before deployment';
    } else if (quality.riskLevel === 'High') {
      confidence = 'Low';
      action = 'Redesign';
      reasoning = 'Quality concerns detected. Optimization needed before deployment.';
      timeline = 'Redesign and retest before deployment';
    } else if (quality.satisfactionScore < 85) {
      confidence = 'Medium';
      action = 'Test Further';
      reasoning = 'Good results but recommend additional validation for quality assurance.';
      timeline = 'Deploy after additional quality validation';
    } else {
      confidence = 'High';
      action = 'Deploy';
      reasoning = 'Strong results with maintained quality. Safe for immediate deployment.';
      timeline = 'Deploy immediately for maximum savings';
    }
    
    return {
      confidence,
      action,
      reasoning,
      timeline
    };
  }

  /**
   * Generate executive summary for stakeholders
   */
  private generateExecutiveSummary(
    testResults: TestResults,
    costSavings: BusinessImpact['costSavings'],
    quality: BusinessImpact['qualityAssurance']
  ): BusinessImpact['executiveSummary'] {
    const winnerName = testResults.statistical.winner || 'Optimized variant';
    
    const headline = `${winnerName} delivers ${costSavings.percentage.toFixed(0)}% cost reduction with ${quality.satisfactionScore}% quality maintained`;
    
    const keyMetrics = [
      `Annual Savings: $${costSavings.annual.toLocaleString()}`,
      `Monthly Impact: $${costSavings.monthly.toLocaleString()}`,
      `Quality Score: ${quality.satisfactionScore}% maintained`,
      `Performance: ${quality.latencyImprovement.toFixed(0)}% faster`,
      `Statistical Significance: ${testResults.statistical.significant ? '✅ Confirmed' : '⚠️ Pending'}`
    ];
    
    const businessJustification = `This optimization reduces costs by ${costSavings.percentage.toFixed(0)}% while maintaining ${quality.satisfactionScore}% quality score. ` +
      `With ${quality.tokenEfficiency.toFixed(1)}x token efficiency and ${quality.latencyImprovement.toFixed(0)}% performance improvement, ` +
      `the solution delivers immediate ROI with ${quality.riskLevel.toLowerCase()} risk.`;
    
    const nextSteps = [
      quality.riskLevel === 'Minimal' || quality.riskLevel === 'Low' ? 
        'Deploy optimized prompts to production' : 'Address quality concerns before deployment',
      'Set up monitoring for cost and quality metrics',
      'Schedule next optimization opportunity assessment',
      'Prepare stakeholder report with business impact'
    ];
    
    return {
      headline,
      keyMetrics,
      businessJustification,
      nextSteps
    };
  }

  /**
   * Format currency values for display
   */
  formatCurrency(amount: number): string {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount.toFixed(0)}`;
    }
  }

  /**
   * Generate deployment action items
   */
  generateActionItems(impact: BusinessImpact): Array<{
    action: string;
    type: 'deploy' | 'export' | 'report' | 'monitor';
    priority: 'high' | 'medium' | 'low';
    description: string;
  }> {
    const items = [];
    
    if (impact.deploymentRecommendation.action === 'Deploy') {
      items.push({
        action: `Deploy for ${this.formatCurrency(impact.costSavings.annual)} Annual Savings`,
        type: 'deploy' as const,
        priority: 'high' as const,
        description: `One-click deployment with ${impact.qualityAssurance.satisfactionScore}% quality maintained`
      });
    }
    
    items.push({
      action: 'Export Optimized Code',
      type: 'export' as const,
      priority: 'medium' as const,
      description: 'Production-ready prompt implementations (TypeScript, Python, curl)'
    });
    
    items.push({
      action: 'Email Executive Summary',
      type: 'report' as const,
      priority: 'medium' as const,
      description: 'Send stakeholder report with business impact analysis'
    });
    
    items.push({
      action: 'Set Up Monitoring',
      type: 'monitor' as const,
      priority: 'low' as const,
      description: 'Configure cost and quality alerts for production deployment'
    });
    
    return items;
  }
}

// Export singleton instance
export const businessImpactCalculator = new BusinessImpactCalculator(); 