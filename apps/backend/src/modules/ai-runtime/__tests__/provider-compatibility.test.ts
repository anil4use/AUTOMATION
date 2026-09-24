import assert from 'assert';
import { AIAdapterRegistry } from '../adapters/adapter-registry';

export function runProviderCompatibilityTests() {
  const providersToTest = [
    { providerId: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', credentials: { apiKey: 'mock_key' } },
    { providerId: 'groq', baseUrl: 'https://api.groq.com/openai/v1', credentials: { apiKey: 'mock_key' } },
    { providerId: 'openai', baseUrl: 'https://api.openai.com/v1', credentials: { apiKey: 'mock_key' } },
    { providerId: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', credentials: { apiKey: 'mock_key' } },
    { providerId: 'ollama', baseUrl: 'http://localhost:11434', credentials: {} },
  ];

  for (const provDoc of providersToTest) {
    const adapter = AIAdapterRegistry.getAdapter(provDoc);
    assert(adapter, `Failed to instantiate adapter for provider ${provDoc.providerId}`);
  }

  console.log('✅ ProviderCompatibility unit tests passed successfully!');
}

runProviderCompatibilityTests();
