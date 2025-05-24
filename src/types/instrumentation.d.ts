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