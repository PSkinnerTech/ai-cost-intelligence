import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromptManager } from '@/services/promptManager';
import { asyncHandler } from '@/lib/asyncHandler';

const promptManager = new PromptManager();

async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'A/B test ID must be a string' });
  }

  if (req.method === 'GET') {
    try {
      const test = await promptManager.getABTest(id);
      if (!test) {
        return res.status(404).json({ error: 'A/B test not found' });
      }
      return res.status(200).json({ success: true, test });
    } catch (error: any) {
      console.error(`[API_AB_TEST_GET_ERROR] ID: ${id}`, error);
      return res.status(500).json({ error: 'Failed to retrieve A/B test' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(handler); 