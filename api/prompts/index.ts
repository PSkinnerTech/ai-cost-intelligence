import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asyncHandler } from '@/lib/asyncHandler';
import { PromptManager } from '@/services/promptManager'; // Assuming path

// TEMPORARY: Instantiate PromptManager per invocation. 
// This WILL NOT share state across requests. 
// Needs to be replaced with a shared data store solution.
const getPromptManager = () => new PromptManager();

async function promptsHandler(req: VercelRequest, res: VercelResponse) {
  const promptManager = getPromptManager(); // Get a new instance for now

  if (req.method === 'POST') {
    // Create prompt variant
    const { name, description, template, variables, model, parameters, tags, parentId } = req.body;
    
    if (!name || !description || !template) {
      return res.status(400).json({ 
        error: 'Name, description, and template are required' 
      });
    }

    try {
      const variant = await promptManager.createVariant({
        name,
        description,
        template,
        variables,
        model,
        parameters,
        tags,
        parentId
      });
      return res.status(201).json({ success: true, variant });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }

  } else if (req.method === 'GET') {
    // List prompt variants
    const { tags, model, parentId } = req.query;
    
    const options: any = {};
    if (tags) options.tags = (tags as string).split(',');
    if (model) options.model = model as string;
    if (parentId) options.parentId = parentId as string;

    try {
      const variants = await promptManager.listVariants(options);
      return res.status(200).json({
        success: true,
        variants,
        total: variants.length,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to list variants', details: error.message });
    }

  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default asyncHandler(promptsHandler); 