import { BaseAIAdapter, ExecutionOptions, ExecutionResult } from './base.adapter';
import { env } from '../../../config/env';

export class AnthropicAdapter extends BaseAIAdapter {
  constructor(providerId: string, baseUrl: string, credentials: Record<string, any>) {
    super(providerId, baseUrl || 'https://api.anthropic.com/v1', credentials);
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const apiKey = this.credentials.apiKey || process.env.ANTHROPIC_API_KEY || (env as any).anthropicApiKey;
    if (!apiKey) {
      throw new Error('Anthropic API key is missing.');
    }

    const url = `${this.baseUrl.replace(/\/+$/, '')}/messages`;

    const messages = [];
    if (options.userMessage) {
      messages.push({ role: 'user', content: options.userMessage });
    } else if (options.systemPrompt) {
      messages.push({ role: 'user', content: options.systemPrompt });
    }

    const body: any = {
      model: options.model || 'claude-3-5-sonnet-20241022',
      messages,
      max_tokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.1,
    };

    if (options.systemPrompt && options.userMessage) {
      body.system = options.systemPrompt;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API Error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    const content = data.content?.[0]?.text || '';
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;

    return { content, inputTokens, outputTokens };
  }
}
