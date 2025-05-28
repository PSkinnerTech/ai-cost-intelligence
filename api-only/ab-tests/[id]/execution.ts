import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromptManager } from '@/services/promptManager'; // May not be directly needed if executor handles it
import { ABTestExecutor } from '@/services/abTestExecutor';
import { OpenAI } from 'openai'; // Needed for ABTestExecutor
import { asyncHandler } from '@/lib/asyncHandler';

const promptManager = new PromptManager(); // Executor might need it
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error("OPENAI_API_KEY is not set. ABTestExecutor cannot be initialized.");
}
const abTestExecutor = openaiApiKey ? new ABTestExecutor(new OpenAI({ apiKey: openaiApiKey }), promptManager) : null;

async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'A/B test ID must be a string' });
  }

  if (req.method === 'GET') {
    if (!abTestExecutor) {
        return res.status(500).json({ error: 'ABTestExecutor not initialized due to missing OpenAI API key.' });
    }
    try {
      // Note: getExecutionStatus might be in-memory. For true serverless,
      // execution status would ideally be read from a persistent store updated by the execution process.
      const execution = await abTestExecutor.getExecutionStatus(id);
      if (!execution) {
        // It's possible a test exists (checked by promptManager.getABTest) but execution hasn't started
        // or status is not tracked by current getExecutionStatus logic.
        // Consider fetching the test itself to provide more context.
        const test = await promptManager.getABTest(id);
        if (!test) {
            return res.status(404).json({ error: 'A/B test not found.' });
        }
        // If test exists but no execution status, it might mean it's pending or status tracking needs enhancement
        return res.status(200).json({ 
            success: true, 
            message: 'Execution status not available or test pending. Test exists.',
            testStatus: test.status 
        }); 
      }
      return res.status(200).json({ success: true, execution });
    } catch (error: any) {
      console.error(`[API_AB_TEST_EXECUTION_ERROR] ID: ${id}`, error);
      return res.status(500).json({ error: 'Failed to retrieve A/B test execution status' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(handler); 