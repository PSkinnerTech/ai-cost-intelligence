import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PromptManager } from '@/services/promptManager';
import { asyncHandler } from '@/lib/asyncHandler';
import { ABTest, ABTestConfiguration } from '@/types/prompt'; // Assuming ABTestConfiguration is needed

const promptManager = new PromptManager();

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Create A/B test
    const { name, description, variantIds, inputIds, configuration, createdBy } = req.body as {
      name: string;
      description: string;
      variantIds: string[];
      inputIds: string[];
      configuration: ABTestConfiguration;
      createdBy: string; // Added createdBy from previous fix
    };

    if (!name || !description || !variantIds || !inputIds || !configuration || !createdBy) {
      return res.status(400).json({
        error: 'Name, description, variantIds, inputIds, configuration, and createdBy are required'
      });
    }

    try {
      const test = await promptManager.createABTest({
        name,
        description,
        variantIds,
        inputIds,
        configuration,
        createdBy
      });
      return res.status(201).json({ success: true, test });
    } catch (error: any) {
      console.error('[API_AB_TESTS_CREATE_ERROR]', error);
      return res.status(400).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    // List A/B tests
    const { status, createdBy } = req.query;
    
    const options: { status?: ABTest['status']; createdBy?: string } = {};
    if (status) options.status = status as ABTest['status'];
    if (createdBy) options.createdBy = createdBy as string;

    try {
      const tests = await promptManager.listABTests(options);
      return res.status(200).json({
        success: true,
        tests,
        total: tests.length,
      });
    } catch (error: any) {
      console.error('[API_AB_TESTS_LIST_ERROR]', error);
      return res.status(500).json({ error: 'Failed to list A/B tests' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(handler); 