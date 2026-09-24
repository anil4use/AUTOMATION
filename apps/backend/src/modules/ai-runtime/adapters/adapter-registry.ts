import { BaseAIAdapter } from './base.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { GroqAdapter } from './groq.adapter';
import { OpenAIAdapter } from './openai.adapter';
import { AnthropicAdapter } from './anthropic.adapter';
import { OllamaAdapter } from './ollama.adapter';
import { OpenAICompatibleAdapter } from './openai-compatible.adapter';

export type AIAdapterFactory = (
  providerId: string,
  baseUrl: string,
  credentials: Record<string, any>,
  providerDoc?: any
) => BaseAIAdapter;

export class AIAdapterRegistry {
  private static factories = new Map<string, AIAdapterFactory>();

  /**
   * Register a custom or built-in provider adapter factory.
   */
  static register(providerId: string, factory: AIAdapterFactory): void {
    this.factories.set(providerId.toLowerCase(), factory);
  }

  /**
   * Resolve an adapter for a given provider document.
   */
  static getAdapter(providerDoc: any): BaseAIAdapter {
    if (!providerDoc || !providerDoc.providerId) {
      throw new Error('AI Adapter Registry: Invalid provider document provided.');
    }

    const key = providerDoc.providerId.toLowerCase();
    const factory = this.factories.get(key);

    if (factory) {
      return factory(
        providerDoc.providerId,
        providerDoc.baseUrl,
        providerDoc.credentials || {},
        providerDoc
      );
    }

    // Dynamic fallback: If provider doc flags openAICompatible or has a custom baseUrl, use OpenAICompatibleAdapter
    if (providerDoc.isOpenAICompatible || providerDoc.baseUrl) {
      return new OpenAICompatibleAdapter(
        providerDoc.providerId,
        providerDoc.baseUrl,
        providerDoc.credentials || {}
      );
    }

    throw new Error(
      `AI Control Plane: No adapter factory registered for provider '${providerDoc.providerId}'.`
    );
  }

  /**
   * List all registered provider IDs.
   */
  static getRegisteredProviders(): string[] {
    return Array.from(this.factories.keys());
  }
}

// ─── Register Built-In Providers ──────────────────────────────────────────────
AIAdapterRegistry.register('gemini', (p, b, c) => new GeminiAdapter(p, b, c));
AIAdapterRegistry.register('groq', (p, b, c) => new GroqAdapter(p, b, c));
AIAdapterRegistry.register('openai', (p, b, c) => new OpenAIAdapter(p, b, c));
AIAdapterRegistry.register('anthropic', (p, b, c) => new AnthropicAdapter(p, b, c));
AIAdapterRegistry.register('claude', (p, b, c) => new AnthropicAdapter(p, b, c));
AIAdapterRegistry.register('ollama', (p, b, c) => new OllamaAdapter(p, b, c));
AIAdapterRegistry.register('openai-compatible', (p, b, c) => new OpenAICompatibleAdapter(p, b, c));
