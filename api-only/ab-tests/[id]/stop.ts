// api/ab-tests/[id]/stop.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromptManager } from '@/services/promptManager';
import { asyncHandler } from '@/lib/asyncHandler';

const promptManager = new PromptManager();

async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'A/B test ID must be a string' });
  }

  if (req.method === 'POST') {
    try {
      const test = await promptManager.stopABTest(id);
      if (!test) {
        return res.status(404).json({ error: 'A/B test not found or could not be stopped.' });
      }
      return res.status(200).json({
        success: true,
        test,
        message: 'A/B test stopped successfully',
      });
    } catch (error: any) {
      console.error(`[API_AB_TEST_STOP_ERROR] ID: ${id}`, error);
      return res.status(400).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(handler); 