// Real OpenAI Pricing Configuration
// Source: https://openai.com/api/pricing/ (as of 2024)
// Updated: 2024-12-19

export interface ModelPricing {
  input: number;   // Per 1K tokens
  output: number;  // Per 1K tokens
  model: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
  tokens: TokenUsage;
}

// Real OpenAI pricing as of December 2024
export const OPENAI_PRICING: Record<string, ModelPricing> = {
  'gpt-4': {
    model: 'gpt-4',
    input: 0.03,    // $0.03 per 1K input tokens
    output: 0.06,   // $0.06 per 1K output tokens
  },
  'gpt-4-turbo': {
    model: 'gpt-4-turbo',
    input: 0.01,    // $0.01 per 1K input tokens
    output: 0.03,   // $0.03 per 1K output tokens
  },
  'gpt-3.5-turbo': {
    model: 'gpt-3.5-turbo',
    input: 0.0015,  // $0.0015 per 1K input tokens  
    output: 0.002,  // $0.002 per 1K output tokens
  },
  'gpt-3.5-turbo-0125': {
    model: 'gpt-3.5-turbo-0125',
    input: 0.0005,  // $0.0005 per 1K input tokens
    output: 0.0015, // $0.0015 per 1K output tokens
  },
  'gpt-3.5-turbo-mini': {
    model: 'gpt-3.5-turbo-mini',
    input: 0.0001,  // $0.0001 per 1K input tokens
    output: 0.0002, // $0.0002 per 1K output tokens
  }
};

/**
 * Calculate real cost based on actual token usage
 * NO MORE ASSUMPTIONS - uses actual API response tokens
 */
export const calculateRealCost = (
  usage: TokenUsage, 
  model: string
): CostCalculation => {
  const pricing = OPENAI_PRICING[model];
  
  if (!pricing) {
    throw new Error(`Unknown model: ${model}. Please add pricing for this model.`);
  }

  const inputCost = (usage.prompt_tokens / 1000) * pricing.input;
  const outputCost = (usage.completion_tokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    model: pricing.model,
    tokens: usage
  };
};

/**
 * Get pricing for display in UI (with proper formatting)
 */
export const getPricingDisplay = (model: string): string => {
  const pricing = OPENAI_PRICING[model];
  if (!pricing) return 'Unknown pricing';
  
  return `$${pricing.input.toFixed(4)}/$${pricing.output.toFixed(4)} per 1K tokens`;
};

/**
 * Calculate savings between two real cost calculations
 */
export const calculateSavings = (
  directCost: CostCalculation, 
  neverminedCost: CostCalculation
): { absolute: number; percentage: number } => {
  const absolute = directCost.totalCost - neverminedCost.totalCost;
  const percentage = directCost.totalCost > 0 
    ? (absolute / directCost.totalCost) * 100 
    : 0;

  return { absolute, percentage };
};

/**
 * Get all available models for selection
 */
export const getAvailableModels = (): ModelPricing[] => {
  return Object.values(OPENAI_PRICING);
};

// Export model names for easy access
export const MODEL_NAMES = Object.keys(OPENAI_PRICING);

// Export for backward compatibility (but these should be calculated, not hardcoded)
export const getModelDisplayName = (model: string): string => {
  const displayNames: Record<string, string> = {
    'gpt-4': 'GPT-4',
    'gpt-4-turbo': 'GPT-4 Turbo', 
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'gpt-3.5-turbo-0125': 'GPT-3.5 Turbo (0125)',
    'gpt-3.5-turbo-mini': 'GPT-3.5 Mini'
  };
  
  return displayNames[model] || model;
}; 