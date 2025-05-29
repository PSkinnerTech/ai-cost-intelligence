// frontend/src/config/api.ts
// API Configuration for different environments

const getApiBaseUrl = (): string => {
  // In development, use the local API server
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }
  
  // In production, use our stable backend alias (doesn't change with deployments)
  return 'https://api-only-lac.vercel.app';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to construct full API URLs
export const apiUrl = (path: string): string => {
  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/${path}`;
};

// Nevermined API endpoints
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  TEST: '/api/test',
  NEVERMINED: {
    INIT: '/api/init',
    CREDITS: '/api/credits',
    COMPARISON: '/api/comparison'
  }
};

// Mock data for development fallback (kept for reference)
export const mockCostData = [
  {
    model: "gpt-3.5-turbo",
    tokens: {
      prompt: 1000,
      completion: 500
    },
    cost: {
      prompt: 0.0015,
      completion: 0.002,
      total: 0.0035
    }
  },
  {
    model: "gpt-4",
    tokens: {
      prompt: 1000,
      completion: 500
    },
    cost: {
      prompt: 0.03,
      completion: 0.06,
      total: 0.09
    }
  },
  {
    model: "gpt-4-turbo",
    tokens: {
      prompt: 1000,
      completion: 500
    },
    cost: {
      prompt: 0.01,
      completion: 0.03,
      total: 0.04
    }
  }
]; 