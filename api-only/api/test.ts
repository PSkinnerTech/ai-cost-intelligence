import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './cors-helper';

async function testHandler(req: VercelRequest, res: VercelResponse) {
  res.json({ 
    message: 'Test API endpoint working',
    timestamp: new Date().toISOString(),
    method: req.method,
    query: req.query
  });
}

export default withCors(testHandler); 