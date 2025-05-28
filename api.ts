const isDevelopment = process.env.NODE_ENV === 'development';
const baseUrl = isDevelopment ? 'http://localhost:3001' : '';

export const apiUrl = (path: string) => `${baseUrl}${path}`;

// Mock data for production fallback
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