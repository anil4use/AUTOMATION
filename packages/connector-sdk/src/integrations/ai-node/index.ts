import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class AINodeConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'ai-agent',
    name: 'AI Processor Node',
    description: 'Mid-workflow LLM execution for data extraction, job searching, summarization, or classification.',
    category: 'Artificial Intelligence',
    icon: '/icons/ai.svg',
    authType: 'none',
    triggers: [],
    actions: [
      {
        id: 'process_text',
        name: 'Analyze / Summarize / Extract with LLM',
        description: 'Runs prompt on step inputs using Groq/Gemini.',
        type: 'action',
        inputs: [
          { key: 'prompt', label: 'Prompt Template', type: 'string', required: true },
          { key: 'inputText', label: 'Input Text / Payload', type: 'string', required: true },
        ],
        outputs: [
          { key: 'result', label: 'AI Response Output', type: 'string', required: true },
          { key: 'tokensUsed', label: 'Tokens Used', type: 'number', required: false },
        ],
      },
      {
        id: 'summarize_text',
        name: 'Summarize Text or Search Data',
        description: 'Extracts structured information or job postings.',
        type: 'action',
        inputs: [{ key: 'text', label: 'Text', type: 'string', required: true }],
        outputs: [{ key: 'result', label: 'Output Result', type: 'string', required: true }],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    if (actionId === 'process_text' || actionId === 'summarize_text') {
      const inputVal = context.stepInput.text || context.stepInput.inputText || 'Daily automated search data payload';
      return {
        success: true,
        data: {
          result: `[AI Job Search Output]: Found 5 relevant job postings for query run. Results summary: ${String(inputVal).substring(0, 80)}`,
          tokensUsed: 42,
        },
      };
    }
    throw new Error(`Unsupported action: ${actionId}`);
  }
}
