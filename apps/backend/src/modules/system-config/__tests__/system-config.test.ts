import assert from 'assert';

export function runSystemConfigTests() {
  const dummyConfig = {
    'system.execution_timeout_ms': 30000,
    'system.max_tokens_limit': 8000,
    'ui.theme_default': 'dark',
  };

  const getConfig = (key: string, fallback: any) => {
    return dummyConfig[key as keyof typeof dummyConfig] ?? fallback;
  };

  assert.strictEqual(getConfig('system.execution_timeout_ms', 10000), 30000, 'Config lookup failed');
  assert.strictEqual(getConfig('non_existent_key', 5000), 5000, 'Fallback lookup failed');

  console.log('✅ SystemConfig unit tests passed successfully!');
}

runSystemConfigTests();
