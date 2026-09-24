import { BaseAIAdapter, ExecutionOptions, ExecutionResult } from './base.adapter';
import { env } from '../../../config/env';

export class OpenAIAdapter extends BaseAIAdapter {
  constructor(providerId: string, baseUrl: string, credentials: Record<string, any>) {
    super(providerId, baseUrl || 'https://api.openai.com/v1', credentials);
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const apiKey = this.credentials.apiKey || process.env.OPENAI_API_KEY || (env as any).openaiApiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is missing.');
    }

    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    if (options.userMessage) {
      messages.push({ role: 'user', content: options.userMessage });
    } else if (!options.systemPrompt) {
      throw new Error('OpenAI execution requires either systemPrompt or userMessage.');
    }

    const body: any = {
      model: options.model || 'gpt-4o',
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
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;

    return { content, inputTokens, outputTokens };
  }
}
