import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { withSession, tracedOperation } from '@/lib/instrumentationUtils';
import { openaiClient } from '@/lib/openaiClient';
import { asyncHandler } from '@/lib/asyncHandler'; // Assuming asyncHandler is also in lib

async function openAiTestHandler(req: VercelRequest, res: VercelResponse) {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const sessionId = uuidv4();
  
  const result = await withSession(sessionId, async () => {
    return tracedOperation('api-openai-test', {
      'api.endpoint': '/api/test/openai',
      'test.message': message,
      'vercel.request_id': req.headers['x-vercel-id'],
    }, async (span) => { // tracedOperation now passes the span
      const startTime = Date.now();
      
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message as string }],
        max_tokens: 100,
        temperature: 0.7,
      });

      const endTime = Date.now();
      const usage = response.usage;

      // Set attributes on the span
      span.setAttributes({
        'llm.response.id': response.id,
        'llm.model_name': response.model,
        'llm.usage.prompt_tokens': usage?.prompt_tokens,
        'llm.usage.completion_tokens': usage?.completion_tokens,
        'llm.latency_ms': endTime - startTime,
      });

      return {
        sessionId,
        response: response.choices[0].message.content,
        usage: {
          prompt_tokens: usage?.prompt_tokens || 0,
          completion_tokens: usage?.completion_tokens || 0,
          total_tokens: usage?.total_tokens || 0,
        },
        model: response.model,
        latency: endTime - startTime,
        timestamp: new Date().toISOString(),
      };
    });
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

export default asyncHandler(openAiTestHandler); 