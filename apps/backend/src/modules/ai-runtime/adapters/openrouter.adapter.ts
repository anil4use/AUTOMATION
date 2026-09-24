import { BaseAIAdapter, ExecutionOptions, ExecutionResult } from './base.adapter';

/**
 * OpenRouterAdapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects to OpenRouter's OpenAI-compatible API (https://openrouter.ai/api/v1).
 * Supports all 500+ models including free tiers (model ID ending with `:free`).
 *
 * All configuration is read from the provider document stored in MongoDB
 * (AIProviderModel), which is seeded from environment variables on first boot.
 * Nothing is hardcoded here — API key, site URL, and site name all come from
 * the provider's `credentials` object.
 *
 * Credential keys:
 *   apiKey     — OPENROUTER_API_KEY (sk-or-v1-...)
 *   siteUrl    — OPENROUTER_SITE_URL  (for attribution header)
 *   siteName   — OPENROUTER_SITE_NAME (for attribution header)
 */
export class OpenRouterAdapter extends BaseAIAdapter {
  private static readonly ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(providerId: string, _baseUrl: string, credentials: Record<string, any>) {
    super(providerId, 'https://openrouter.ai/api/v1', credentials);
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const apiKey = this.credentials.apiKey || this.credentials.token || '';
    if (!apiKey) {
      throw new Error(
        `OpenRouter (${this.providerId}): No API key found. ` +
        `Set OPENROUTER_API_KEY in your .env or update the provider credentials in AI Control Plane.`
      );
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    if (options.userMessage) {
      messages.push({ role: 'user', content: options.userMessage });
    } else if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Hello' });
    }

    const body: Record<string, any> = {
      model: options.model,
      messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.structuredOutput) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(OpenRouterAdapter.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // OpenRouter attribution headers — values come from credentials/env, not hardcoded
        'HTTP-Referer': this.credentials.siteUrl || 'https://autoflow.app',
        'X-Title': this.credentials.siteName || 'AutoFlow',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = errorText;
      try {
        const parsed = JSON.parse(errorText);
        errorDetail = parsed?.error?.message || errorText;
      } catch {}
      throw new Error(`OpenRouter API Error (${response.status}) for model ${options.model}: ${errorDetail}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;

    return { content, inputTokens, outputTokens };
  }
}
