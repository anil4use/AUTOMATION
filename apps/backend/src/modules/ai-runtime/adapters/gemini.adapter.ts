import { BaseAIAdapter, ExecutionOptions, ExecutionResult } from './base.adapter';
import { env } from '../../../config/env';

export class GeminiAdapter extends BaseAIAdapter {
  constructor(providerId: string, baseUrl: string, credentials: Record<string, any>) {
    super(providerId, baseUrl || 'https://generativelanguage.googleapis.com/v1beta', credentials);
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const apiKey = this.credentials.apiKey || env.geminiApiKey;
    if (!apiKey) {
      throw new Error('Gemini API key is missing.');
    }

    const url = `${this.baseUrl}/models/${options.model}:generateContent?key=${apiKey}`;

    const contents = [];
    if (options.userMessage) {
      contents.push({
        role: 'user',
        parts: [{ text: options.userMessage }],
      });
    } else {
      // If no user message is provided, put system prompt in user message for fallback
      contents.push({
        role: 'user',
        parts: [{ text: options.systemPrompt }],
      });
    }

    const body: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.1,
        maxOutputTokens: options.maxTokens ?? 4000,
      }
    };

    if (options.userMessage && options.systemPrompt) {
       body.systemInstruction = {
         parts: [{ text: options.systemPrompt }]
       };
    }

    if (options.structuredOutput) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

    return { content, inputTokens, outputTokens };
  }
}
