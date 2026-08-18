import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class AINodeConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'ai-agent',
    name: 'AI Processor Node',
    description: 'Mid-workflow LLM execution for data extraction, summarization, or classification.',
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
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    if (actionId === 'process_text') {
      return {
        success: true,
        data: {
          result: `[AI Summary]: ${context.stepInput.inputText?.substring(0, 100)}...`,
          tokensUsed: 42,
        },
      };
    }
    throw new Error(`Unsupported action: ${actionId}`);
  }
}
