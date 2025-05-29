import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './cors-helper';

async function healthHandler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ 
    status: 'healthy',
    service: 'ab-testing-api',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    phoenix: {
      endpoint: process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006',
      configured: !!process.env.PHOENIX_COLLECTOR_ENDPOINT
    },
    openai: {
      configured: !!process.env.OPENAI_API_KEY
    }
  });
}

export default withCors(healthHandler); 