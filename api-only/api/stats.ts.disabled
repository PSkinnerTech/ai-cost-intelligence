// api/stats.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromptManager } from '@/services/promptManager';
import { asyncHandler } from '@/lib/asyncHandler';

const promptManager = new PromptManager();

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const stats = await promptManager.getStats();
      return res.status(200).json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[API_STATS_ERROR]', error);
      return res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(handler); 