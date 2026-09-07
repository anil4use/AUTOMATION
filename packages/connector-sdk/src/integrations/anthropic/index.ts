import axios from 'axios';
import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest, ChoiceOption } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

function anthropicClient(apiKey: string) {
  return axios.create({
    baseURL: ANTHROPIC_BASE,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'Content-Type': 'application/json',
    },
  });
}

// ─── Choices ──────────────────────────────────────────────────────────────────

const ANTHROPIC_MODELS: ChoiceOption[] = [
  { label: 'Claude Opus 4.5 (Most Capable)', value: 'claude-opus-4-5' },
  { label: 'Claude Sonnet 4.5 (Balanced)', value: 'claude-sonnet-4-5' },
  { label: 'Claude Haiku 4.5 (Fastest)', value: 'claude-haiku-4-5' },
  { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
  { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
  { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
];

export async function getAnthropicChoices(
  fieldId: string,
  _credentials: { apiKey: string }
): Promise<ChoiceOption[]> {
  // Anthropic has no /models endpoint — return static list
  return fieldId === 'model' ? ANTHROPIC_MODELS : [];
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

const anthropicManifest: ConnectorManifest = {
  id: 'anthropic',
  name: 'Anthropic / Claude',
  description:
    'Full Anthropic Claude integration — send messages, multi-turn conversations, document analysis (PDF/text/HTML), token counting, and batch processing via the Anthropic Messages API.',
  category: 'AI & Machine Learning',
  icon: '/icons/anthropic.svg',
  authType: 'api_key',
  authConfig: {
    fields: [
      { key: 'apiKey', label: 'Anthropic API Key', type: 'password', required: true, description: 'Found at console.anthropic.com/settings/keys' },
    ],
  },
  docsUrl: 'https://docs.anthropic.com/en/api',
  version: '1.0.0',
  triggers: [],
  actions: [
    {
      id: 'send_message',
      name: 'Send Message to Claude',
      description: 'Sends a single user message to a Claude model and returns the response.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/messages',
      inputs: [
        { key: 'model', label: 'Model', type: 'select', required: true, hasDynamicChoices: true, choicesFieldId: 'model', options: ANTHROPIC_MODELS },
        { key: 'systemPrompt', label: 'System Prompt (optional)', type: 'string', required: false },
        { key: 'userMessage', label: 'User Message', type: 'string', required: true },
        { key: 'maxTokens', label: 'Max Output Tokens (default 4096)', type: 'number', required: false },
        { key: 'temperature', label: 'Temperature (0-1)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'content', label: 'Response Text', type: 'string', required: true },
        { key: 'inputTokens', label: 'Input Tokens Used', type: 'number', required: true },
        { key: 'outputTokens', label: 'Output Tokens Used', type: 'number', required: true },
        { key: 'stopReason', label: 'Stop Reason', type: 'string', required: true },
        { key: 'model', label: 'Model Used', type: 'string', required: true },
      ],
    },
    {
      id: 'send_with_history',
      name: 'Multi-turn Conversation',
      description: 'Sends a conversation history (array of messages) to Claude for context-aware multi-turn responses.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/messages',
      inputs: [
        { key: 'model', label: 'Model', type: 'select', required: true, options: ANTHROPIC_MODELS },
        { key: 'messages', label: 'Messages Array (JSON)', type: 'json', required: true, description: '[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi!"},...]' },
        { key: 'systemPrompt', label: 'System Prompt (optional)', type: 'string', required: false },
        { key: 'maxTokens', label: 'Max Output Tokens (default 4096)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'content', label: 'Response Text', type: 'string', required: true },
        { key: 'inputTokens', label: 'Input Tokens', type: 'number', required: true },
        { key: 'outputTokens', label: 'Output Tokens', type: 'number', required: true },
        { key: 'stopReason', label: 'Stop Reason', type: 'string', required: true },
      ],
    },
    {
      id: 'send_with_document',
      name: 'Send Message with Document',
      description: 'Sends a document (PDF, plain text, or HTML) along with a message to Claude for analysis, summarization, or extraction.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/messages',
      inputs: [
        { key: 'model', label: 'Model', type: 'select', required: true, options: ANTHROPIC_MODELS, description: 'Claude 3+ models support document input.' },
        {
          key: 'documentBase64',
          label: 'Document Content (Base64 encoded)',
          type: 'string',
          required: true,
          description: 'Base64 encoded document content. Max 32MB. From upstream step output (e.g. Google Drive download).',
        },
        {
          key: 'documentType',
          label: 'Document MIME Type',
          type: 'select',
          required: true,
          options: [
            { label: 'PDF', value: 'application/pdf' },
            { label: 'Plain Text', value: 'text/plain' },
            { label: 'HTML', value: 'text/html' },
          ],
          description: 'Only PDF, plain text, and HTML are supported by the Anthropic Documents API.',
        },
        { key: 'userMessage', label: 'User Message / Question about the Document', type: 'string', required: true },
        { key: 'systemPrompt', label: 'System Prompt (optional)', type: 'string', required: false },
        { key: 'maxTokens', label: 'Max Output Tokens (default 4096)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'content', label: 'Response Text', type: 'string', required: true },
        { key: 'inputTokens', label: 'Input Tokens', type: 'number', required: true },
        { key: 'outputTokens', label: 'Output Tokens', type: 'number', required: true },
        { key: 'stopReason', label: 'Stop Reason', type: 'string', required: true },
      ],
    },
    {
      id: 'count_tokens',
      name: 'Count Tokens',
      description: 'Counts the tokens in messages before sending, for cost estimation and context limit management.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/messages/count_tokens',
      inputs: [
        { key: 'model', label: 'Model', type: 'select', required: true, options: ANTHROPIC_MODELS },
        { key: 'messages', label: 'Messages Array (JSON)', type: 'json', required: true },
        { key: 'systemPrompt', label: 'System Prompt (optional)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'inputTokens', label: 'Input Token Count', type: 'number', required: true },
      ],
    },
    {
      id: 'batch_messages',
      name: 'Batch Messages',
      description: 'Submits a batch of message requests to be processed asynchronously. Returns a batchId to check status.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/messages/batches',
      inputs: [
        { key: 'model', label: 'Default Model', type: 'select', required: true, options: ANTHROPIC_MODELS },
        { key: 'requests', label: 'Batch Requests (JSON array)', type: 'json', required: true, description: '[{"custom_id":"req-1","params":{"model":"...","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}}]' },
      ],
      outputs: [
        { key: 'batchId', label: 'Batch ID', type: 'string', required: true },
        { key: 'requestCounts', label: 'Request Counts (processing/succeeded/errored)', type: 'json', required: true },
        { key: 'processingStatus', label: 'Processing Status', type: 'string', required: true },
        { key: 'resultsUrl', label: 'Results URL (available when complete)', type: 'string', required: false },
      ],
    },
    {
      id: 'get_batch_results',
      name: 'Get Batch Results',
      description: 'Fetches the status and results of a previously submitted batch job.',
      type: 'action',
      httpMethod: 'GET',
      endpoint: '/messages/batches/{batch_id}',
      inputs: [
        { key: 'batchId', label: 'Batch ID', type: 'string', required: true, description: 'From the Batch Messages action output.' },
      ],
      outputs: [
        { key: 'batchId', label: 'Batch ID', type: 'string', required: true },
        { key: 'processingStatus', label: 'Processing Status (in_progress/ended)', type: 'string', required: true },
        { key: 'requestCounts', label: 'Request Counts', type: 'json', required: true },
        { key: 'resultsUrl', label: 'Results URL', type: 'string', required: false },
        { key: 'endedAt', label: 'Ended At', type: 'string', required: false },
      ],
    },
  ],
};

// ─── Connector Class ──────────────────────────────────────────────────────────

export class AnthropicConnector extends BaseConnector {
  manifest = anthropicManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const apiKey = credentials?.apiKey as string;

    if (!apiKey) {
      return { success: false, data: {}, error: 'Anthropic API Key is required.' };
    }

    const client = anthropicClient(apiKey);

    try {
      switch (actionId) {
        case 'send_message': {
          const body: any = {
            model: inputs.model || 'claude-sonnet-4-5',
            max_tokens: Number(inputs.maxTokens) || 4096,
            messages: [{ role: 'user', content: inputs.userMessage }],
          };
          if (inputs.systemPrompt) body.system = inputs.systemPrompt;
          if (inputs.temperature !== undefined) body.temperature = Number(inputs.temperature);

          const { data } = await client.post('/messages', body);
          return {
            success: true,
            data: {
              content: data.content[0]?.text || '',
              inputTokens: data.usage.input_tokens,
              outputTokens: data.usage.output_tokens,
              stopReason: data.stop_reason,
              model: data.model,
            },
          };
        }

        case 'send_with_history': {
          const messages = typeof inputs.messages === 'string'
            ? JSON.parse(inputs.messages)
            : inputs.messages;
          const body: any = {
            model: inputs.model || 'claude-sonnet-4-5',
            max_tokens: Number(inputs.maxTokens) || 4096,
            messages,
          };
          if (inputs.systemPrompt) body.system = inputs.systemPrompt;

          const { data } = await client.post('/messages', body);
          return {
            success: true,
            data: {
              content: data.content[0]?.text || '',
              inputTokens: data.usage.input_tokens,
              outputTokens: data.usage.output_tokens,
              stopReason: data.stop_reason,
            },
          };
        }

        case 'send_with_document': {
          // Validate size: base64 string length * 0.75 ≈ byte size
          const approxBytes = (inputs.documentBase64 as string).length * 0.75;
          const maxBytes = 32 * 1024 * 1024; // 32MB
          if (approxBytes > maxBytes) {
            return { success: false, data: {}, error: `Document exceeds 32MB limit (estimated ${Math.round(approxBytes / 1024 / 1024)}MB). Compress or split the document.` };
          }

          const supportedTypes = ['application/pdf', 'text/plain', 'text/html'];
          if (!supportedTypes.includes(inputs.documentType)) {
            return { success: false, data: {}, error: `Unsupported document type: ${inputs.documentType}. Supported: application/pdf, text/plain, text/html` };
          }

          // Exact API payload format per Anthropic documentation
          const body: any = {
            model: inputs.model || 'claude-sonnet-4-5',
            max_tokens: Number(inputs.maxTokens) || 4096,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: inputs.documentType,
                    data: inputs.documentBase64,
                  },
                },
                {
                  type: 'text',
                  text: inputs.userMessage,
                },
              ],
            }],
          };
          if (inputs.systemPrompt) body.system = inputs.systemPrompt;

          const { data } = await client.post('/messages', body);
          return {
            success: true,
            data: {
              content: data.content[0]?.text || '',
              inputTokens: data.usage.input_tokens,
              outputTokens: data.usage.output_tokens,
              stopReason: data.stop_reason,
            },
          };
        }

        case 'count_tokens': {
          const messages = typeof inputs.messages === 'string'
            ? JSON.parse(inputs.messages)
            : inputs.messages;
          const body: any = {
            model: inputs.model || 'claude-sonnet-4-5',
            messages,
          };
          if (inputs.systemPrompt) body.system = inputs.systemPrompt;

          const { data } = await client.post('/messages/count_tokens', body);
          return { success: true, data: { inputTokens: data.input_tokens } };
        }

        case 'batch_messages': {
          const requests = typeof inputs.requests === 'string'
            ? JSON.parse(inputs.requests)
            : inputs.requests;

          const { data } = await client.post('/messages/batches', { requests });
          return {
            success: true,
            data: {
              batchId: data.id,
              requestCounts: data.request_counts,
              processingStatus: data.processing_status,
              resultsUrl: data.results_url || null,
            },
          };
        }

        case 'get_batch_results': {
          const { data } = await client.get(`/messages/batches/${inputs.batchId}`);
          return {
            success: true,
            data: {
              batchId: data.id,
              processingStatus: data.processing_status,
              requestCounts: data.request_counts,
              resultsUrl: data.results_url || null,
              endedAt: data.ended_at || null,
            },
          };
        }

        default:
          return { success: false, data: {}, error: `Unknown Anthropic action: ${actionId}` };
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error?.message || err?.message || 'Anthropic API error';

      if (status === 401) return { success: false, data: {}, error: `Anthropic authentication failed. Check your API key. (${message})` };
      if (status === 429) return { success: false, data: {}, error: `Anthropic rate limit exceeded. (${message})` };
      if (status === 400) return { success: false, data: {}, error: `Anthropic bad request: ${message}` };
      if (status === 529) return { success: false, data: {}, error: 'Anthropic API is overloaded. Try again in a moment.' };

      return { success: false, data: {}, error: `Anthropic error (${status || 'unknown'}): ${message}` };
    }
  }
}

// ─── Self-Registration ────────────────────────────────────────────────────────
export const anthropicConnector = new AnthropicConnector();
manifestRegistry.register(anthropicManifest);

