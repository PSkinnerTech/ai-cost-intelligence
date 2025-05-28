// api/ab-tests/[id]/start.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromptManager } from '@/services/promptManager';
import { ABTestExecutor } from '@/services/abTestExecutor'; // Needed for background execution
import { OpenAI } from 'openai'; // Needed for ABTestExecutor
import { asyncHandler } from '@/lib/asyncHandler';
// import { broadcastToClients } from '@/lib/websocketUtils'; // Websocket a separate concern for now

const promptManager = new PromptManager();
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error("OPENAI_API_KEY is not set. ABTestExecutor cannot be initialized.");
  // Potentially throw an error or have a fallback if critical at startup
}
const abTestExecutor = openaiApiKey ? new ABTestExecutor(new OpenAI({ apiKey: openaiApiKey }), promptManager) : null;

async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'A/B test ID must be a string' });
  }

  if (req.method === 'POST') {
    if (!abTestExecutor) {
        return res.status(500).json({ error: 'ABTestExecutor not initialized due to missing OpenAI API key.' });
    }
    try {
      const test = await promptManager.startABTest(id);
      if (!test) {
        return res.status(404).json({ error: 'A/B test not found or could not be started.' });
      }

      // Trigger actual test execution in background
      // Note: Long-running background tasks in serverless functions have limitations.
      // For Vercel, functions have a maximum execution duration.
      // If executeABTest is very long, consider Vercel cron jobs, queues, or dedicated worker services.
      console.log(`[API_AB_TEST_START] 🚀 Starting A/B test execution for: ${test.name} (ID: ${id})`);
      setImmediate(async () => {
        try {
          await abTestExecutor.executeABTest(id);
          console.log(`[API_AB_TEST_START] ✅ A/B test execution completed: ${id}`);
          // TODO: Replace with appropriate notification (e.g., webhook, queue, database update)
          // broadcastToClients({ type: 'test-completed', testId: id, timestamp: new Date().toISOString() });
        } catch (error: any) {
          console.error(`[API_AB_TEST_START] ❌ A/B test execution failed: ${id}`, error);
          // TODO: Replace with appropriate error handling/notification
          // broadcastToClients({ type: 'test-failed', testId: id, error: error.message, timestamp: new Date().toISOString() });
        }
      });

      return res.status(200).json({
        success: true,
        test,
        message: 'A/B test started successfully - execution in progress',
      });
    } catch (error: any) {
      console.error(`[API_AB_TEST_START_ERROR] ID: ${id}`, error);
      return res.status(400).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(handler); 