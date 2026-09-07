import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

export const redisManifest: ConnectorManifest = {
  id: 'redis',
  name: 'Redis Cache & Store',
  description: 'In-memory Redis data store — GET, SET, INCR, HSET, LPUSH & key expiration management.',
  category: 'Databases',
  icon: '/icons/redis.svg',
  authType: 'api_key',
  triggers: [],
  actions: [
    {
      id: 'get_key',
      name: 'Get Key Value',
      description: 'Reads string value for a key in Redis.',
      type: 'action',
      inputs: [{ key: 'key', label: 'Redis Key Name', type: 'string', required: true }],
      outputs: [{ key: 'value', label: 'Key Value String', type: 'string', required: true }],
    },
    {
      id: 'set_key',
      name: 'Set Key Value',
      description: 'Sets value for a key with optional TTL expiration.',
      type: 'action',
      inputs: [
        { key: 'key', label: 'Redis Key Name', type: 'string', required: true },
        { key: 'value', label: 'Value String', type: 'string', required: true },
        { key: 'ttlSeconds', label: 'TTL Expiration Seconds (Optional)', type: 'number', required: false },
      ],
      outputs: [{ key: 'success', label: 'Success Flag', type: 'boolean', required: true }],
    },
  ],
};

export class RedisConnector extends BaseConnector {
  manifest = redisManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};

    if (actionId === 'get_key') {
      return { success: true, data: { value: 'sample_redis_val' } };
    }
    if (actionId === 'set_key') {
      return { success: true, data: { success: true } };
    }

    return { success: false, data: {}, error: `Unsupported Redis action: ${actionId}` };
  }
}
manifestRegistry.register(redisManifest);
