// api/test-inputs/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromptManager } from '@/services/promptManager';
import { asyncHandler } from '@/lib/asyncHandler';
import { TestInput } from '@/types/prompt';

const promptManager = new PromptManager();

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Create Test Input
    const { prompt, variables, expectedOutput, category } = req.body as Partial<TestInput>; // Use Partial for incoming data

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
      const input = await promptManager.createTestInput({
        prompt,
        variables: variables || {},
        expectedOutput,
        category
      });
      return res.status(201).json({ success: true, input });
    } catch (error: any) {
      console.error('[API_TEST_INPUTS_CREATE_ERROR]', error);
      return res.status(500).json({ error: 'Failed to create test input' });
    }
  } else if (req.method === 'GET') {
    // List Test Inputs
    const { category } = req.query;

    try {
      const inputs = await promptManager.listTestInputs(category as string | undefined);
      return res.status(200).json({
        success: true,
        inputs,
        total: inputs.length,
      });
    } catch (error: any) {
      console.error('[API_TEST_INPUTS_LIST_ERROR]', error);
      return res.status(500).json({ error: 'Failed to list test inputs' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(handler); 