import { BaseAIAdapter, ExecutionOptions, ExecutionResult } from './base.adapter';

export class OpenAICompatibleAdapter extends BaseAIAdapter {
  constructor(providerId: string, baseUrl: string, credentials: Record<string, any>) {
    super(providerId, baseUrl, credentials);
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const apiKey = this.credentials.apiKey || this.credentials.token || '';
    
    // Ensure base URL has completions path or normalize
    let endpoint = this.baseUrl ? this.baseUrl.replace(/\/+$/, '') : 'http://localhost:8000/v1';
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = `${endpoint}/chat/completions`;
    }

    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    if (options.userMessage) {
      messages.push({ role: 'user', content: options.userMessage });
    } else if (!options.systemPrompt) {
      messages.push({ role: 'user', content: 'Hello' });
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI-Compatible API Error (${this.providerId}): ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;

    return { content, inputTokens, outputTokens };
  }
}
