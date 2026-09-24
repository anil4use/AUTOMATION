import { useState, useEffect } from 'react';

export function useSystemConfig() {
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiBase}/api/v1/system/config`);
        if (res.ok) {
          const data = await res.json();
          setConfigs(data.configs || {});
        }
      } catch (err) {
        console.warn('Failed to load system config from API:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const getConfig = (key: string, defaultValue: any = null) => {
    return configs[key] !== undefined ? configs[key] : defaultValue;
  };

  return { configs, getConfig, loading };
}
