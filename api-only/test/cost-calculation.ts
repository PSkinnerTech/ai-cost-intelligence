import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asyncHandler } from '@/lib/asyncHandler';
import { calculateCost } from '@/lib/costUtils';

async function costCalculationTestHandler(req: VercelRequest, res: VercelResponse) {
  // Check if it's a GET request, though Vercel routes by file name primarily
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const testData: Record<string, { prompt: number; completion: number }> = {
    'gpt-3.5-turbo': { prompt: 1000, completion: 500 },
    'gpt-4': { prompt: 1000, completion: 500 },
    'gpt-4o': { prompt: 1000, completion: 500 },
    'gpt-4o-mini': { prompt: 1000, completion: 500 },
  };

  const results = Object.entries(testData).map(([model, tokens]) => {
    const cost = calculateCost(tokens, model); // Uses the imported calculateCost
    return {
      model,
      tokens,
      cost,
    };
  });

  res.status(200).json({
    success: true,
    data: results,
  });
}

export default asyncHandler(costCalculationTestHandler); 