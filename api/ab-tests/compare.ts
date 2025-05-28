// api/ab-tests/compare.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromptManager } from '@/services/promptManager';
import { ABTestExecutor } from '@/services/abTestExecutor';
import { StatisticalAnalysis } from '@/services/statisticalAnalysis';
import { OpenAI } from 'openai'; // Needed for ABTestExecutor
import { asyncHandler } from '@/lib/asyncHandler';
import { PromptVariant, TestInput, TestResult } from '@/types/prompt'; // Added TestResult for executeVariantComparison

const promptManager = new PromptManager();
const statisticalAnalysis = new StatisticalAnalysis();
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error("OPENAI_API_KEY is not set. ABTestExecutor cannot be initialized.");
}
const abTestExecutor = openaiApiKey ? new ABTestExecutor(new OpenAI({ apiKey: openaiApiKey }), promptManager) : null;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    if (!abTestExecutor) {
        return res.status(500).json({ error: 'ABTestExecutor not initialized due to missing OpenAI API key.' });
    }
    const { variantAId, variantBId, inputId } = req.body;

    if (!variantAId || !variantBId || !inputId || 
        typeof variantAId !== 'string' || typeof variantBId !== 'string' || typeof inputId !== 'string') {
      return res.status(400).json({
        error: 'variantAId, variantBId, and inputId are required and must be strings'
      });
    }

    try {
      const variantA = await promptManager.getVariant(variantAId);
      const variantB = await promptManager.getVariant(variantBId);
      const input = await promptManager.getTestInput(inputId);

      if (!variantA || !variantB || !input) {
        let missing = [];
        if (!variantA) missing.push(`Variant A (ID: ${variantAId})`);
        if (!variantB) missing.push(`Variant B (ID: ${variantBId})`);
        if (!input) missing.push(`Input (ID: ${inputId})`);
        return res.status(404).json({ error: `Entities not found: ${missing.join(', ')}` });
      }

      console.log(`[API_COMPARE] 🔄 Running side-by-side comparison: ${variantA.name} vs ${variantB.name}`);
      
      const comparison = await abTestExecutor.executeVariantComparison(
        variantA, variantB, input
      );

      // Assuming comparison.resultA and comparison.resultB are TestResult objects
      // and statisticalAnalysis can work with them directly.
      const resultA = comparison.resultA as TestResult | undefined;
      const resultB = comparison.resultB as TestResult | undefined;

      if (!resultA || !resultB) {
          return res.status(500).json({ error: 'Comparison did not yield valid results for statistical analysis.'});
      }

      const statistical = statisticalAnalysis.calculateSignificance(
        [resultA], // calculateSignificance expects arrays of TestResult
        [resultB],
        'cost' // Assuming 'cost' is the metric. This might need to be dynamic.
      );

      return res.status(200).json({
        success: true,
        comparison: {
          ...comparison,
          statistical
        },
      });
    } catch (error: any) {
      console.error(`[API_AB_TEST_COMPARE_ERROR]`, error);
      return res.status(500).json({ error: error.message || 'Failed to execute comparison' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(handler); 