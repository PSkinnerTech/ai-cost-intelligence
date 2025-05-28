import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tracedOperation, withSession } from '@/lib/instrumentationUtils'; // Changed path
import { openaiClient } from '@/lib/openaiClient'; // Changed path
import { calculateCost } from '@/lib/costUtils'; // Changed path
import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';

interface EvaluateRequestBody {
  sessionId?: string;
  userId?: string;
  prompts: Array<{ id: string; content: string; model: string; variables?: Record<string, string> }>;
  testData: Array<Record<string, string>>;
}

interface CostInfo {
  prompt_cost: number;
  completion_cost: number;
  total_cost: number;
  model: string;
  pricing: { input: number; output: number };
}

interface PromptResult {
  promptId: string;
  model: string;
  response: string | null | undefined;
  usage: OpenAI.Chat.Completions.ChatCompletion['usage'] | null | undefined;
  cost: CostInfo | null;
  testCaseVariables: Record<string, string>;
  error: string | null;
}

interface TestCaseResult {
  testCase: Record<string, string>;
  results: PromptResult[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { sessionId: querySessionId, userId: queryUserId } = req.query;
  const body = req.body as EvaluateRequestBody;

  const sessionId = body.sessionId || querySessionId as string || uuidv4();
  const userId = body.userId || queryUserId as string || 'anonymous_user';

  if (!body.prompts || !body.testData || body.prompts.length === 0 || body.testData.length === 0) {
    return res.status(400).json({ error: 'Missing prompts or testData' });
  }

  try {
    const results = await withSession(sessionId, async () => {
      return tracedOperation('full_evaluation_request', { 'user.id': userId, 'session.id': sessionId }, async (mainSpan) => {
        const evaluationResults: TestCaseResult[] = []; // Typed array

        for (const testCase of body.testData) {
          const caseResults: PromptResult[] = []; // Typed array
          for (const promptConfig of body.prompts) {
            let fullPrompt = promptConfig.content;
            if (promptConfig.variables) {
              for (const key in promptConfig.variables) {
                fullPrompt = fullPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), testCase[promptConfig.variables[key]] || '');
              }
            }

            const operationName = `llm_call_prompt_${promptConfig.id}`;
            const attributes = {
              'llm.model_name': promptConfig.model,
              'llm.prompt_template.content': promptConfig.content,
              'llm.prompt_template.id': promptConfig.id,
              'llm.prompt_template.variables': JSON.stringify(promptConfig.variables || {}),
              'llm.input_variables': JSON.stringify(testCase),
              'user.id': userId,
              'session.id': sessionId,
            };

            try {
              const llmResponse = await tracedOperation(operationName, attributes, async (span) => {
                const chatCompletion = await openaiClient.chat.completions.create({
                  model: promptConfig.model,
                  messages: [{ role: 'user', content: fullPrompt }],
                });
                span.setAttributes({
                  'llm.response.id': chatCompletion.id,
                  'llm.usage.prompt_tokens': chatCompletion.usage?.prompt_tokens,
                  'llm.usage.completion_tokens': chatCompletion.usage?.completion_tokens,
                  'llm.usage.total_tokens': chatCompletion.usage?.total_tokens,
                  'llm.content.response': chatCompletion.choices[0]?.message?.content?.substring(0, 100) + '...', // Log snippet
                });
                return chatCompletion;
              });

              const costInfo = calculateCost(
                { 
                  prompt: llmResponse.usage?.prompt_tokens || 0,
                  completion: llmResponse.usage?.completion_tokens || 0,
                },
                promptConfig.model
              );

              caseResults.push({
                promptId: promptConfig.id,
                model: promptConfig.model,
                response: llmResponse.choices[0]?.message?.content,
                usage: llmResponse.usage,
                cost: costInfo,
                testCaseVariables: testCase,
                error: null,
              });
            } catch (error: any) {
              console.error(`Error processing prompt ${promptConfig.id} for test case:`, error);
              caseResults.push({
                promptId: promptConfig.id,
                model: promptConfig.model,
                response: null,
                usage: null,
                cost: null,
                testCaseVariables: testCase,
                error: error.message,
              });
            }
          }
          evaluationResults.push({ testCase, results: caseResults });
        }
        mainSpan.setAttribute('app.evaluation.total_test_cases', body.testData.length);
        mainSpan.setAttribute('app.evaluation.total_prompts_evaluated', body.prompts.length * body.testData.length);
        return evaluationResults;
      });
    });
    return res.status(200).json({ sessionId, userId, results });
  } catch (error: any) {
    console.error('Failed to evaluate prompts:', error);
    return res.status(500).json({ error: 'Failed to evaluate prompts', details: error.message });
  }
} 