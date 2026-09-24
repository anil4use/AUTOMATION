import { BaseAIAdapter, ExecutionOptions, ExecutionResult } from './base.adapter';

export class OllamaAdapter extends BaseAIAdapter {
  constructor(providerId: string, baseUrl: string, credentials: Record<string, any>) {
    super(providerId, baseUrl || 'http://localhost:11434', credentials);
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/api/chat`;

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
      model: options.model || 'llama3',
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.1,
      },
    };

    if (options.structuredOutput) {
      body.format = 'json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API Error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    const content = data.message?.content || '';
    const inputTokens = data.prompt_eval_count || 0;
    const outputTokens = data.eval_count || 0;

    return { content, inputTokens, outputTokens };
  }
}
