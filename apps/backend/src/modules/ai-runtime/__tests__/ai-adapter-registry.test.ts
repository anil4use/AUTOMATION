import assert from 'assert';
import { AIAdapterRegistry } from '../adapters/adapter-registry';
import { BaseAIAdapter } from '../adapters/base.adapter';
import { GeminiAdapter } from '../adapters/gemini.adapter';
import { GroqAdapter } from '../adapters/groq.adapter';
import { OpenAIAdapter } from '../adapters/openai.adapter';
import { AnthropicAdapter } from '../adapters/anthropic.adapter';
import { OllamaAdapter } from '../adapters/ollama.adapter';
import { OpenAICompatibleAdapter } from '../adapters/openai-compatible.adapter';

export function runAdapterRegistryTests() {
  const geminiDoc = { providerId: 'gemini', baseUrl: '', credentials: { apiKey: 'test' } };
  const groqDoc = { providerId: 'groq', baseUrl: '', credentials: { apiKey: 'test' } };
  const openaiDoc = { providerId: 'openai', baseUrl: '', credentials: { apiKey: 'test' } };
  const anthropicDoc = { providerId: 'anthropic', baseUrl: '', credentials: { apiKey: 'test' } };
  const ollamaDoc = { providerId: 'ollama', baseUrl: '', credentials: {} };

  assert(AIAdapterRegistry.getAdapter(geminiDoc) instanceof GeminiAdapter, 'GeminiAdapter match failed');
  assert(AIAdapterRegistry.getAdapter(groqDoc) instanceof GroqAdapter, 'GroqAdapter match failed');
  assert(AIAdapterRegistry.getAdapter(openaiDoc) instanceof OpenAIAdapter, 'OpenAIAdapter match failed');
  assert(AIAdapterRegistry.getAdapter(anthropicDoc) instanceof AnthropicAdapter, 'AnthropicAdapter match failed');
  assert(AIAdapterRegistry.getAdapter(ollamaDoc) instanceof OllamaAdapter, 'OllamaAdapter match failed');

  const customDoc = { providerId: 'deepseek-custom', baseUrl: 'https://api.deepseek.com/v1', credentials: { apiKey: 'sk-123' } };
  assert(AIAdapterRegistry.getAdapter(customDoc) instanceof OpenAICompatibleAdapter, 'OpenAICompatibleAdapter fallback failed');

  class CustomDummyAdapter extends BaseAIAdapter {
    async execute() {
      return { content: 'dummy' };
    }
  }

  AIAdapterRegistry.register('custom-provider', (p, b, c) => new CustomDummyAdapter(p, b, c));
  const doc = { providerId: 'custom-provider', baseUrl: 'http://custom', credentials: {} };
  assert(AIAdapterRegistry.getAdapter(doc) instanceof CustomDummyAdapter, 'Custom adapter registration failed');

  console.log('✅ AIAdapterRegistry unit tests passed successfully!');
}

runAdapterRegistryTests();
