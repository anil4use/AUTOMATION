import axios from 'axios';
import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest, ChoiceOption } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

const OPENAI_BASE = 'https://api.openai.com/v1';

function openaiClient(apiKey: string) {
  return axios.create({
    baseURL: OPENAI_BASE,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
}

// ─── Choices ──────────────────────────────────────────────────────────────────

export async function getOpenAIChoices(
  fieldId: string,
  credentials: { apiKey: string }
): Promise<ChoiceOption[]> {
  if (fieldId !== 'model') return [];
  try {
    const { data } = await openaiClient(credentials.apiKey).get('/models');
    const gptModels = data.data
      .filter((m: any) => m.id.startsWith('gpt') || m.id.startsWith('o1') || m.id.startsWith('o3'))
      .sort((a: any, b: any) => b.created - a.created)
      .slice(0, 20);
    return gptModels.map((m: any): ChoiceOption => ({
      label: m.id,
      value: m.id,
      description: `Created: ${new Date(m.created * 1000).toLocaleDateString()}`,
    }));
  } catch {
    // Return static fallback if API call fails
    return [
      { label: 'GPT-4o', value: 'gpt-4o' },
      { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
      { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
      { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
      { label: 'o1', value: 'o1' },
      { label: 'o1-mini', value: 'o1-mini' },
    ];
  }
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

const openaiManifest: ConnectorManifest = {
  id: 'openai',
  name: 'OpenAI',
  description:
    'Full OpenAI integration — chat completions, image generation (DALL-E), audio transcription (Whisper), embeddings, content moderation, assistants, and token counting.',
  category: 'AI & Machine Learning',
  icon: '/icons/openai.svg',
  authType: 'api_key',
  authConfig: {
    fields: [
      { key: 'apiKey', label: 'OpenAI API Key', type: 'password', required: true, description: 'Found at platform.openai.com/api-keys' },
    ],
  },
  docsUrl: 'https://platform.openai.com/docs/api-reference',
  version: '1.0.0',
  triggers: [],
  actions: [
    {
      id: 'chat_completion',
      name: 'Chat Completion',
      description: 'Sends a message to an OpenAI model and returns the response. Supports GPT-4o, GPT-4, GPT-3.5, and O-series models.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/chat/completions',
      inputs: [
        { key: 'model', label: 'Model', type: 'select', required: true, hasDynamicChoices: true, choicesFieldId: 'model', options: [{ label: 'GPT-4o', value: 'gpt-4o' }, { label: 'GPT-4o Mini', value: 'gpt-4o-mini' }, { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' }, { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }] },
        { key: 'systemPrompt', label: 'System Prompt', type: 'string', required: false, description: 'Optional system-level instructions for the model.' },
        { key: 'userMessage', label: 'User Message', type: 'string', required: true },
        { key: 'temperature', label: 'Temperature (0-2, default 1)', type: 'number', required: false },
        { key: 'maxTokens', label: 'Max Output Tokens', type: 'number', required: false },
        { key: 'responseFormat', label: 'Response Format', type: 'select', required: false, options: [{ label: 'Text', value: 'text' }, { label: 'JSON Object', value: 'json_object' }] },
      ],
      outputs: [
        { key: 'content', label: 'Response Text', type: 'string', required: true },
        { key: 'finishReason', label: 'Finish Reason', type: 'string', required: true },
        { key: 'promptTokens', label: 'Prompt Tokens Used', type: 'number', required: true },
        { key: 'completionTokens', label: 'Completion Tokens Used', type: 'number', required: true },
        { key: 'totalTokens', label: 'Total Tokens Used', type: 'number', required: true },
        { key: 'model', label: 'Model Used', type: 'string', required: true },
      ],
      rateLimitInfo: { notes: 'Rate limits depend on your OpenAI tier. See platform.openai.com/settings/limits.' },
    },
    {
      id: 'chat_completion_history',
      name: 'Multi-turn Chat Completion',
      description: 'Sends a conversation history (array of messages) to the model for context-aware responses.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/chat/completions',
      inputs: [
        { key: 'model', label: 'Model', type: 'select', required: true, hasDynamicChoices: true, choicesFieldId: 'model', options: [{ label: 'GPT-4o', value: 'gpt-4o' }, { label: 'GPT-4o Mini', value: 'gpt-4o-mini' }] },
        { key: 'messages', label: 'Messages Array (JSON)', type: 'json', required: true, description: '[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi!"},...]' },
        { key: 'systemPrompt', label: 'System Prompt', type: 'string', required: false },
        { key: 'maxTokens', label: 'Max Output Tokens', type: 'number', required: false },
      ],
      outputs: [
        { key: 'content', label: 'Response Text', type: 'string', required: true },
        { key: 'totalTokens', label: 'Total Tokens Used', type: 'number', required: true },
        { key: 'finishReason', label: 'Finish Reason', type: 'string', required: true },
      ],
    },
    {
      id: 'generate_image',
      name: 'Generate Image (DALL-E)',
      description: 'Generates an image from a text prompt using DALL-E 3 or DALL-E 2.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/images/generations',
      inputs: [
        { key: 'prompt', label: 'Image Prompt', type: 'string', required: true, description: 'Describe the image you want to generate. Be detailed for best results.' },
        { key: 'model', label: 'Model', type: 'select', required: false, options: [{ label: 'DALL-E 3 (Best)', value: 'dall-e-3' }, { label: 'DALL-E 2', value: 'dall-e-2' }] },
        { key: 'size', label: 'Image Size', type: 'select', required: false, options: [{ label: '1024x1024 (Square)', value: '1024x1024' }, { label: '1792x1024 (Landscape)', value: '1792x1024' }, { label: '1024x1792 (Portrait)', value: '1024x1792' }] },
        { key: 'quality', label: 'Quality', type: 'select', required: false, options: [{ label: 'Standard', value: 'standard' }, { label: 'HD (DALL-E 3 only)', value: 'hd' }] },
        { key: 'style', label: 'Style', type: 'select', required: false, options: [{ label: 'Natural', value: 'natural' }, { label: 'Vivid', value: 'vivid' }] },
        { key: 'n', label: 'Number of Images (DALL-E 2 only, max 10)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'imageUrl', label: 'Generated Image URL', type: 'string', required: true },
        { key: 'revisedPrompt', label: 'Revised Prompt (DALL-E 3)', type: 'string', required: false },
        { key: 'allUrls', label: 'All Generated URLs', type: 'array', required: true },
      ],
    },
    {
      id: 'transcribe_audio',
      name: 'Transcribe Audio (Whisper)',
      description: 'Transcribes audio to text using OpenAI Whisper. Accepts base64-encoded audio.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/audio/transcriptions',
      inputs: [
        { key: 'audioBase64', label: 'Audio File (Base64 encoded)', type: 'string', required: true, description: 'Base64 encoded audio. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm.' },
        { key: 'audioFileName', label: 'Audio File Name (with extension)', type: 'string', required: true, description: 'e.g. recording.mp3 — needed for format detection.' },
        { key: 'language', label: 'Language (ISO 639-1 code, e.g. en)', type: 'string', required: false, description: 'Optional. Specifying language improves speed and accuracy.' },
        { key: 'prompt', label: 'Context Prompt (optional)', type: 'string', required: false, description: 'Provide context to improve transcription quality (e.g. "This is a medical consultation about diabetes").' },
        { key: 'responseFormat', label: 'Response Format', type: 'select', required: false, options: [{ label: 'JSON', value: 'json' }, { label: 'Verbose JSON', value: 'verbose_json' }, { label: 'Text', value: 'text' }, { label: 'SRT', value: 'srt' }, { label: 'VTT', value: 'vtt' }] },
      ],
      outputs: [
        { key: 'text', label: 'Transcribed Text', type: 'string', required: true },
        { key: 'language', label: 'Detected Language', type: 'string', required: false },
        { key: 'duration', label: 'Audio Duration (seconds)', type: 'number', required: false },
        { key: 'segments', label: 'Segments (verbose_json only)', type: 'array', required: false },
      ],
    },
    {
      id: 'generate_embeddings',
      name: 'Generate Embeddings',
      description: 'Generates a vector embedding for text using OpenAI embedding models. Useful for semantic search and similarity.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/embeddings',
      inputs: [
        { key: 'text', label: 'Text to Embed', type: 'string', required: true, description: 'The text to generate embeddings for. Can be a sentence, paragraph, or document.' },
        { key: 'model', label: 'Embedding Model', type: 'select', required: false, options: [{ label: 'text-embedding-3-small (Best Value)', value: 'text-embedding-3-small' }, { label: 'text-embedding-3-large (Most Capable)', value: 'text-embedding-3-large' }, { label: 'text-embedding-ada-002 (Legacy)', value: 'text-embedding-ada-002' }] },
        { key: 'dimensions', label: 'Output Dimensions (optional, text-embedding-3 only)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'embedding', label: 'Embedding Vector (array of floats)', type: 'array', required: true },
        { key: 'tokenCount', label: 'Tokens Used', type: 'number', required: true },
        { key: 'model', label: 'Model Used', type: 'string', required: true },
        { key: 'dimensions', label: 'Vector Dimensions', type: 'number', required: true },
      ],
    },
    {
      id: 'moderate_content',
      name: 'Moderate Content',
      description: 'Checks text for harmful content (hate, harassment, violence, self-harm, sexual content) using OpenAI Moderation API.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/moderations',
      inputs: [
        { key: 'text', label: 'Text to Moderate', type: 'string', required: true },
        { key: 'model', label: 'Model', type: 'select', required: false, options: [{ label: 'omni-moderation-latest (Recommended)', value: 'omni-moderation-latest' }, { label: 'text-moderation-latest', value: 'text-moderation-latest' }] },
      ],
      outputs: [
        { key: 'flagged', label: 'Is Flagged', type: 'boolean', required: true },
        { key: 'categories', label: 'Flagged Categories', type: 'json', required: true },
        { key: 'scores', label: 'Category Scores', type: 'json', required: true },
        { key: 'highestScore', label: 'Highest Category Score', type: 'number', required: true },
        { key: 'highestCategory', label: 'Highest Scoring Category', type: 'string', required: true },
      ],
    },
    {
      id: 'list_models',
      name: 'List Available Models',
      description: 'Returns a list of all OpenAI models available for your API key.',
      type: 'action',
      httpMethod: 'GET',
      endpoint: '/models',
      inputs: [],
      outputs: [
        { key: 'models', label: 'Models Array', type: 'array', required: true },
        { key: 'count', label: 'Total Count', type: 'number', required: true },
      ],
    },
    {
      id: 'count_tokens',
      name: 'Count Tokens (Estimate)',
      description: 'Estimates the number of tokens in a text string for a given model. Uses js-tiktoken for accurate counting.',
      type: 'action',
      inputs: [
        { key: 'text', label: 'Text', type: 'string', required: true },
        { key: 'model', label: 'Model', type: 'select', required: false, options: [{ label: 'GPT-4o', value: 'gpt-4o' }, { label: 'GPT-4', value: 'gpt-4' }, { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }] },
      ],
      outputs: [
        { key: 'estimatedTokens', label: 'Estimated Token Count', type: 'number', required: true },
        { key: 'estimatedCostUSD', label: 'Estimated Cost (USD, approximate)', type: 'number', required: false },
      ],
    },
    {
      id: 'create_assistant',
      name: 'Create Assistant',
      description: 'Creates a new OpenAI Assistant with custom instructions, tools, and model.',
      type: 'action',
      httpMethod: 'POST',
      endpoint: '/assistants',
      inputs: [
        { key: 'name', label: 'Assistant Name', type: 'string', required: true },
        { key: 'instructions', label: 'System Instructions', type: 'string', required: true, description: 'Define the assistant behavior and persona.' },
        { key: 'model', label: 'Model', type: 'select', required: true, options: [{ label: 'GPT-4o', value: 'gpt-4o' }, { label: 'GPT-4o Mini', value: 'gpt-4o-mini' }, { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' }] },
        { key: 'enableCodeInterpreter', label: 'Enable Code Interpreter', type: 'boolean', required: false },
        { key: 'enableFileSearch', label: 'Enable File Search', type: 'boolean', required: false },
        { key: 'description', label: 'Description (optional)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'assistantId', label: 'Assistant ID', type: 'string', required: true },
        { key: 'name', label: 'Name', type: 'string', required: true },
        { key: 'model', label: 'Model', type: 'string', required: true },
        { key: 'createdAt', label: 'Created At', type: 'number', required: true },
      ],
    },
    {
      id: 'run_assistant_thread',
      name: 'Run Assistant Thread',
      description: 'Sends a message to an Assistant and waits for the response. Creates a new thread if threadId is not provided.',
      type: 'action',
      inputs: [
        { key: 'assistantId', label: 'Assistant ID', type: 'string', required: true, description: 'From the Create Assistant action output or from platform.openai.com' },
        { key: 'userMessage', label: 'User Message', type: 'string', required: true },
        { key: 'threadId', label: 'Thread ID (optional — provide for multi-turn conversation)', type: 'string', required: false },
        { key: 'maxWaitSeconds', label: 'Max Wait Seconds (default 60)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'response', label: 'Assistant Response Text', type: 'string', required: true },
        { key: 'threadId', label: 'Thread ID (reuse for next message)', type: 'string', required: true },
        { key: 'runId', label: 'Run ID', type: 'string', required: true },
        { key: 'status', label: 'Run Status', type: 'string', required: true },
        { key: 'totalTokens', label: 'Total Tokens Used', type: 'number', required: false },
      ],
    },
  ],
};

// ─── Connector Class ──────────────────────────────────────────────────────────

export class OpenAIConnector extends BaseConnector {
  manifest = openaiManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const apiKey = credentials?.apiKey as string;

    if (!apiKey) {
      return { success: false, data: {}, error: 'OpenAI API Key is required.' };
    }

    const client = openaiClient(apiKey);

    try {
      switch (actionId) {
        case 'chat_completion': {
          const messages: any[] = [];
          if (inputs.systemPrompt) messages.push({ role: 'system', content: inputs.systemPrompt });
          messages.push({ role: 'user', content: inputs.userMessage });

          const { data } = await client.post('/chat/completions', {
            model: inputs.model || 'gpt-4o-mini',
            messages,
            temperature: inputs.temperature !== undefined ? Number(inputs.temperature) : undefined,
            max_tokens: inputs.maxTokens ? Number(inputs.maxTokens) : undefined,
            response_format: inputs.responseFormat === 'json_object'
              ? { type: 'json_object' }
              : { type: 'text' },
          });

          return {
            success: true,
            data: {
              content: data.choices[0].message.content,
              finishReason: data.choices[0].finish_reason,
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
              model: data.model,
            },
          };
        }

        case 'chat_completion_history': {
          const messages = typeof inputs.messages === 'string'
            ? JSON.parse(inputs.messages)
            : inputs.messages;
          if (inputs.systemPrompt) messages.unshift({ role: 'system', content: inputs.systemPrompt });

          const { data } = await client.post('/chat/completions', {
            model: inputs.model || 'gpt-4o-mini',
            messages,
            max_tokens: inputs.maxTokens ? Number(inputs.maxTokens) : undefined,
          });

          return {
            success: true,
            data: {
              content: data.choices[0].message.content,
              totalTokens: data.usage.total_tokens,
              finishReason: data.choices[0].finish_reason,
            },
          };
        }

        case 'generate_image': {
          const { data } = await client.post('/images/generations', {
            prompt: inputs.prompt,
            model: inputs.model || 'dall-e-3',
            n: inputs.n || 1,
            size: inputs.size || '1024x1024',
            quality: inputs.quality || 'standard',
            style: inputs.style || 'natural',
            response_format: 'url',
          });

          return {
            success: true,
            data: {
              imageUrl: data.data[0].url,
              revisedPrompt: data.data[0].revised_prompt || null,
              allUrls: data.data.map((d: any) => d.url),
            },
          };
        }

        case 'transcribe_audio': {
          const FormData = (await import('form-data')).default;
          const form = new FormData();
          const audioBuffer = Buffer.from(inputs.audioBase64, 'base64');
          form.append('file', audioBuffer, { filename: inputs.audioFileName });
          form.append('model', 'whisper-1');
          if (inputs.language) form.append('language', inputs.language);
          if (inputs.prompt) form.append('prompt', inputs.prompt);
          if (inputs.responseFormat) form.append('response_format', inputs.responseFormat);
          else form.append('response_format', 'verbose_json');

          const { data } = await axios.post(`${OPENAI_BASE}/audio/transcriptions`, form, {
            headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` },
          });

          return {
            success: true,
            data: {
              text: data.text,
              language: data.language || null,
              duration: data.duration || null,
              segments: data.segments || [],
            },
          };
        }

        case 'generate_embeddings': {
          const { data } = await client.post('/embeddings', {
            input: inputs.text,
            model: inputs.model || 'text-embedding-3-small',
            dimensions: inputs.dimensions ? Number(inputs.dimensions) : undefined,
          });

          return {
            success: true,
            data: {
              embedding: data.data[0].embedding,
              tokenCount: data.usage.total_tokens,
              model: data.model,
              dimensions: data.data[0].embedding.length,
            },
          };
        }

        case 'moderate_content': {
          const { data } = await client.post('/moderations', {
            input: inputs.text,
            model: inputs.model || 'omni-moderation-latest',
          });
          const result = data.results[0];
          const scores = result.category_scores || {};
          const highestCategory = Object.entries(scores).reduce(
            (max: any, [cat, score]: any) => (score > max.score ? { cat, score } : max),
            { cat: '', score: 0 }
          );

          return {
            success: true,
            data: {
              flagged: result.flagged,
              categories: result.categories,
              scores: result.category_scores,
              highestScore: highestCategory.score,
              highestCategory: highestCategory.cat,
            },
          };
        }

        case 'list_models': {
          const { data } = await client.get('/models');
          return {
            success: true,
            data: {
              models: data.data.map((m: any) => ({ id: m.id, created: m.created })),
              count: data.data.length,
            },
          };
        }

        case 'count_tokens': {
          try {
            // Use js-tiktoken for accurate token counting
            const { encodingForModel } = await import('js-tiktoken');
            const model = (inputs.model || 'gpt-4o') as any;
            const enc = encodingForModel(model);
            const tokens = enc.encode(inputs.text);
            return { success: true, data: { estimatedTokens: tokens.length } };
          } catch {
            // Fallback if model not in tiktoken
            const rough = Math.ceil((inputs.text as string).length / 4);
            return { success: true, data: { estimatedTokens: rough } };
          }
        }

        case 'create_assistant': {
          const tools: any[] = [];
          if (inputs.enableCodeInterpreter) tools.push({ type: 'code_interpreter' });
          if (inputs.enableFileSearch) tools.push({ type: 'file_search' });

          const { data } = await client.post('/assistants', {
            name: inputs.name,
            instructions: inputs.instructions,
            model: inputs.model || 'gpt-4o',
            tools,
            description: inputs.description || undefined,
          }, { headers: { 'OpenAI-Beta': 'assistants=v2' } });

          return {
            success: true,
            data: {
              assistantId: data.id,
              name: data.name,
              model: data.model,
              createdAt: data.created_at,
            },
          };
        }

        case 'run_assistant_thread': {
          const headers = { 'OpenAI-Beta': 'assistants=v2' };
          const maxWait = (inputs.maxWaitSeconds || 60) * 1000;

          // Create or reuse thread
          let threadId = inputs.threadId as string | undefined;
          if (!threadId) {
            const { data: threadData } = await client.post('/threads', {}, { headers });
            threadId = threadData.id;
          }

          // Add user message to thread
          await client.post(`/threads/${threadId}/messages`, {
            role: 'user',
            content: inputs.userMessage,
          }, { headers });

          // Create run
          const { data: runData } = await client.post(`/threads/${threadId}/runs`, {
            assistant_id: inputs.assistantId,
          }, { headers });

          // Poll until complete
          const startTime = Date.now();
          let run = runData;
          while (!['completed', 'failed', 'cancelled', 'expired'].includes(run.status)) {
            if (Date.now() - startTime > maxWait) {
              return { success: false, data: {}, error: `Assistant run timed out after ${inputs.maxWaitSeconds || 60}s. Run ID: ${run.id}` };
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: pollData } = await client.get(`/threads/${threadId}/runs/${run.id}`, { headers });
            run = pollData;
          }

          if (run.status !== 'completed') {
            return { success: false, data: {}, error: `Assistant run ended with status: ${run.status}` };
          }

          // Get messages
          const { data: messagesData } = await client.get(`/threads/${threadId}/messages`, {
            headers,
            params: { limit: 1, order: 'desc' },
          });

          const lastMessage = messagesData.data[0];
          const responseText = lastMessage?.content?.[0]?.text?.value || '';

          return {
            success: true,
            data: {
              response: responseText,
              threadId,
              runId: run.id,
              status: run.status,
              totalTokens: run.usage?.total_tokens || null,
            },
          };
        }

        default:
          return { success: false, data: {}, error: `Unknown OpenAI action: ${actionId}` };
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error?.message || err?.message || 'OpenAI API error';

      if (status === 401) return { success: false, data: {}, error: `OpenAI authentication failed. Check your API key. (${message})` };
      if (status === 429) return { success: false, data: {}, error: `OpenAI rate limit or quota exceeded. (${message})` };
      if (status === 400) return { success: false, data: {}, error: `OpenAI bad request: ${message}` };
      if (status === 503) return { success: false, data: {}, error: `OpenAI service temporarily unavailable. Try again in a moment.` };

      return { success: false, data: {}, error: `OpenAI error (${status || 'unknown'}): ${message}` };
    }
  }
}

// ─── Self-Registration ────────────────────────────────────────────────────────
export const openaiConnector = new OpenAIConnector();
manifestRegistry.register(openaiManifest);

