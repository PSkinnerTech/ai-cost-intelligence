import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromptManager } from '@/services/promptManager';
import { ABTestExecutor } from '@/services/abTestExecutor';
import { StatisticalAnalysis } from '@/services/statisticalAnalysis';
import { OpenAI } from 'openai'; // Needed for ABTestExecutor
import { asyncHandler } from '@/lib/asyncHandler';
import { ABTest, PromptVariant, TestResult } from '@/types/prompt'; // Ensure all necessary types are imported

const promptManager = new PromptManager();
const statisticalAnalysis = new StatisticalAnalysis();
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
      const test = await promptManager.getABTest(id);
      if (!test) {
        return res.status(404).json({ error: 'A/B test not found' });
      }

      if (test.results.length === 0) {
        return res.status(200).json({
          success: true,
          results: {
            testId: id,
            testName: test.name,
            status: test.status,
            variants: test.variants.length,
            totalResults: 0,
            message: 'No results available yet - test may still be running or has no results.'
          },
        });
      }

      console.log(`[API_RESULTS] 📊 Generating statistical analysis for test: ${test.name} (ID: ${id})`);
      
      // Ensure variants are actual PromptVariant objects, not just IDs, if determineWinner expects full objects
      // In our current PromptManager, getABTest already embeds full variant objects.
      const analysis = statisticalAnalysis.determineWinner(
        test.variants, // These should be full PromptVariant objects from the ABTest record
        test.results,
        test.configuration.primaryMetric === 'custom' ? 'cost' : test.configuration.primaryMetric
      );

      const variantMetrics = test.variants.map((variant: PromptVariant) => { // Explicitly type variant
        const variantResults = test.results.filter((r: TestResult) => r.variantId === variant.id); // Explicitly type r
        return {
          variant: {
            id: variant.id,
            name: variant.name,
            template: variant.template // Assuming this is useful, otherwise might trim down
          },
          metrics: abTestExecutor.calculateVariantMetrics(test.results, variant.id),
          sampleResults: variantResults.slice(0, 3) 
        };
      });

      return res.status(200).json({
        success: true,
        results: {
          testId: id,
          testName: test.name,
          status: test.status,
          variants: test.variants.length,
          totalResults: test.results.length,
          analysis,
          variantMetrics,
          configuration: test.configuration,
          executionTime: {
            startedAt: test.startedAt,
            completedAt: test.completedAt,
            duration: test.startedAt && test.completedAt ? 
              test.completedAt.getTime() - test.startedAt.getTime() : null
          }
        },
      });

    } catch (error: any) {
      console.error(`[API_AB_TEST_RESULTS_ERROR] ID: ${id}`, error);
      return res.status(500).json({ error: error.message || 'Failed to retrieve A/B test results' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(handler); 