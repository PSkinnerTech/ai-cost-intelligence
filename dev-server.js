// dev-server.js - Local development server for API functions
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Development API server is running'
  });
});

// Cost calculation endpoint (mock for now)
app.get('/api/test/cost-calculation', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        model: 'gpt-3.5-turbo',
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
        model: 'gpt-4',
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
        model: 'gpt-4-turbo',
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
    ]
  });
});

// OpenAI test endpoint (mock for now)
app.post('/api/test/openai', (req, res) => {
  const { message } = req.body;
  res.json({
    success: true,
    data: {
      response: `Echo: ${message}`,
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      },
      cost: 0.0001
    }
  });
});

// Catch-all for other API routes (return mock success)
app.all('/api/*', (req, res) => {
  console.log(`📡 Mock API call: ${req.method} ${req.path}`);
  res.json({ 
    success: true, 
    message: `Mock response for ${req.method} ${req.path}`,
    data: {} 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Development API server running on http://localhost:${PORT}`);
  console.log(`📡 Frontend should connect to http://localhost:${PORT}/api/*`);
  console.log(`🔧 This is a simplified mock server for local development`);
}); 