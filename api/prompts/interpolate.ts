// api/prompts/interpolate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromptManager } from '@/services/promptManager';
import { asyncHandler } from '@/lib/asyncHandler';

const promptManager = new PromptManager();

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { template, variables } = req.body;

    if (!template) {
      return res.status(400).json({ error: 'Template is required' });
    }
    if (typeof template !== 'string') {
        return res.status(400).json({ error: 'Template must be a string' });
    }

    try {
      // Note: interpolateTemplate and extractVariables are synchronous in the current PromptManager
      // If they were to become async (e.g., if templates were stored/fetched),
      // these would need to be awaited.
      const interpolated = promptManager.interpolateTemplate(template, variables || {});
      const extractedVariables = promptManager.extractVariables(template);

      return res.status(200).json({
        success: true,
        interpolated,
        variables: extractedVariables,
      });
    } catch (error: any) {
      console.error('[API_PROMPTS_INTERPOLATE_ERROR]', error);
      return res.status(500).json({ error: 'Failed to interpolate template' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(handler); 