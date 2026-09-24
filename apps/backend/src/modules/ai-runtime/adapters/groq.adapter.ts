import { BaseAIAdapter, ExecutionOptions, ExecutionResult } from './base.adapter';
import { env } from '../../../config/env';

export class GroqAdapter extends BaseAIAdapter {
  constructor(providerId: string, baseUrl: string, credentials: Record<string, any>) {
    super(providerId, baseUrl || 'https://api.groq.com/openai/v1', credentials);
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const apiKey = this.credentials.apiKey || env.groqApiKey;
    if (!apiKey) {
      throw new Error('Groq API key is missing.');
    }

    const url = `${this.baseUrl}/chat/completions`;

    const messages = [];
    if (options.userMessage) {
      // Full conversation: system sets context, user provides query
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: options.userMessage });
    } else if (options.systemPrompt) {
      // No user message — treat the systemPrompt as the user's message
      // (required by models like qwen, allam that need at least one user turn)
      messages.push({ role: 'user', content: options.systemPrompt });
    }

    const body: any = {
      model: options.model,
      messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 4000,
    };

    if (options.structuredOutput) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;

    return { content, inputTokens, outputTokens };
  }
}
