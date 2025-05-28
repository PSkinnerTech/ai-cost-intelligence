import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asyncHandler } from '@/lib/asyncHandler';
import { PromptManager } from '@/services/promptManager'; // Assuming path

// TEMPORARY: Instantiate PromptManager per invocation. 
// This WILL NOT share state across requests. 
// Needs to be replaced with a shared data store solution.
const getPromptManager = () => new PromptManager();

async function promptByIdHandler(req: VercelRequest, res: VercelResponse) {
  const promptManager = getPromptManager(); // Get a new instance for now
  const { id } = req.query; // ID comes from the [id].ts filename pattern

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt ID' });
  }

  if (req.method === 'GET') {
    // Get prompt variant by ID
    try {
      const variant = await promptManager.getVariant(id as string);
      if (!variant) {
        return res.status(404).json({ error: 'Prompt variant not found' });
      }
      return res.status(200).json({ success: true, variant });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to get variant', details: error.message });
    }
  } else if (req.method === 'PUT') {
    // Update prompt variant
    const updates = req.body;
    try {
      const variant = await promptManager.updateVariant(id as string, updates);
      return res.status(200).json({ success: true, variant });
    } catch (error: any) {
      // PromptManager might throw specific errors for not found or bad input
      if (error.message.includes('not found')) { // Simple check, improve if PromptManager has error codes
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    // Delete prompt variant
    try {
      const deleted = await promptManager.deleteVariant(id as string);
      if (!deleted) {
        return res.status(404).json({ error: 'Prompt variant not found' });
      }
      return res.status(200).json({ success: true, message: 'Prompt variant deleted successfully' });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(promptByIdHandler); 