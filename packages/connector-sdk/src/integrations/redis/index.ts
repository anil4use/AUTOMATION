import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getOrCreatePool } from '../../core/database-driver.factory';

export const redisManifest: ConnectorManifest = {
  id: 'redis',
  name: 'Redis Cache & Store',
  description: 'In-memory key-value data store, pub/sub messaging & data structure operations.',
  category: 'Databases',
  icon: '/icons/redis.svg',
  authType: 'api_key',
  triggers: [],
  actions: [
    {
      id: 'get',
      name: 'Get Value',
      description: 'Retrieves string value for key.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key'],
        properties: {
          key                   : { type: 'string', title: 'Redis Key' },
        },
      },
      inputs: [{ key: 'key', label: 'Redis Key', type: 'string', required: true }],
            outputSchema: {
        type: 'object',
        properties: {
          value                 : { type: 'string', title: 'Stored Value' },
          exists                : { type: 'boolean', title: 'Key Exists Flag' },
        },
      },
      outputs: [
        { key: 'value', label: 'Stored Value', type: 'string', required: false },
        { key: 'exists', label: 'Key Exists Flag', type: 'boolean', required: true },
      ],
    },
    {
      id: 'set',
      name: 'Set Value',
      description: 'Sets key to hold string value with optional TTL.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key', 'value'],
        properties: {
          key                   : { type: 'string', title: 'Redis Key' },
          value                 : { type: 'string', title: 'Value String' },
          ttl                   : { type: 'number', title: 'TTL in Seconds (Optional)' },
        },
      },
      inputs: [
        { key: 'key', label: 'Redis Key', type: 'string', required: true },
        { key: 'value', label: 'Value String', type: 'string', required: true },
        { key: 'ttl', label: 'TTL in Seconds (Optional)', type: 'number', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          success               : { type: 'boolean', title: 'Success Flag' },
        },
      },
      outputs: [{ key: 'success', label: 'Success Flag', type: 'boolean', required: true }],
    },
    {
      id: 'delete',
      name: 'Delete Key(s)',
      description: 'Removes key(s) from Redis.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key'],
        properties: {
          key                   : { type: 'string', title: 'Key or Comma-separated Keys' },
        },
      },
      inputs: [{ key: 'key', label: 'Key or Comma-separated Keys', type: 'string', required: true }],
            outputSchema: {
        type: 'object',
        properties: {
          deletedCount          : { type: 'number', title: 'Deleted Count' },
        },
      },
      outputs: [{ key: 'deletedCount', label: 'Deleted Count', type: 'number', required: true }],
    },
    {
      id: 'exists',
      name: 'Key Exists',
      description: 'Checks if key exists in Redis.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key'],
        properties: {
          key                   : { type: 'string', title: 'Redis Key' },
        },
      },
      inputs: [{ key: 'key', label: 'Redis Key', type: 'string', required: true }],
            outputSchema: {
        type: 'object',
        properties: {
          exists                : { type: 'boolean', title: 'Exists Flag' },
        },
      },
      outputs: [{ key: 'exists', label: 'Exists Flag', type: 'boolean', required: true }],
    },
    {
      id: 'expire',
      name: 'Set Key Expiration (TTL)',
      description: 'Sets a timeout on key.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key', 'seconds'],
        properties: {
          key                   : { type: 'string', title: 'Redis Key' },
          seconds               : { type: 'number', title: 'Expiration Seconds' },
        },
      },
      inputs: [
        { key: 'key', label: 'Redis Key', type: 'string', required: true },
        { key: 'seconds', label: 'Expiration Seconds', type: 'number', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          success               : { type: 'boolean', title: 'Success Flag' },
        },
      },
      outputs: [{ key: 'success', label: 'Success Flag', type: 'boolean', required: true }],
    },
    {
      id: 'ttl',
      name: 'Get Key TTL',
      description: 'Returns remaining time to live of key.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key'],
        properties: {
          key                   : { type: 'string', title: 'Redis Key' },
        },
      },
      inputs: [{ key: 'key', label: 'Redis Key', type: 'string', required: true }],
            outputSchema: {
        type: 'object',
        properties: {
          ttl                   : { type: 'number', title: 'Remaining Seconds' },
        },
      },
      outputs: [{ key: 'ttl', label: 'Remaining Seconds', type: 'number', required: true }],
    },
    {
      id: 'incr',
      name: 'Increment Counter',
      description: 'Increments stored number by amount.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key'],
        properties: {
          key                   : { type: 'string', title: 'Redis Key' },
          amount                : { type: 'number', title: 'Increment Amount (default 1)' },
        },
      },
      inputs: [
        { key: 'key', label: 'Redis Key', type: 'string', required: true },
        { key: 'amount', label: 'Increment Amount (default 1)', type: 'number', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          newValue              : { type: 'number', title: 'New Incremented Value' },
        },
      },
      outputs: [{ key: 'newValue', label: 'New Incremented Value', type: 'number', required: true }],
    },
    {
      id: 'hget',
      name: 'Hash Get Field',
      description: 'Gets value of a hash field.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key', 'field'],
        properties: {
          key                   : { type: 'string', title: 'Hash Key' },
          field                 : { type: 'string', title: 'Field Name' },
        },
      },
      inputs: [
        { key: 'key', label: 'Hash Key', type: 'string', required: true },
        { key: 'field', label: 'Field Name', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          value                 : { type: 'string', title: 'Field Value' },
        },
      },
      outputs: [{ key: 'value', label: 'Field Value', type: 'string', required: false }],
    },
    {
      id: 'hset',
      name: 'Hash Set Field',
      description: 'Sets value of a hash field.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key', 'field', 'value'],
        properties: {
          key                   : { type: 'string', title: 'Hash Key' },
          field                 : { type: 'string', title: 'Field Name' },
          value                 : { type: 'string', title: 'Field Value' },
        },
      },
      inputs: [
        { key: 'key', label: 'Hash Key', type: 'string', required: true },
        { key: 'field', label: 'Field Name', type: 'string', required: true },
        { key: 'value', label: 'Field Value', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          success               : { type: 'boolean', title: 'Success Flag' },
        },
      },
      outputs: [{ key: 'success', label: 'Success Flag', type: 'boolean', required: true }],
    },
    {
      id: 'hgetall',
      name: 'Hash Get All',
      description: 'Retrieves all fields and values of a hash key.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key'],
        properties: {
          key                   : { type: 'string', title: 'Hash Key' },
        },
      },
      inputs: [{ key: 'key', label: 'Hash Key', type: 'string', required: true }],
            outputSchema: {
        type: 'object',
        properties: {
          hash                  : { type: 'object', title: 'Hash JSON Object' },
        },
      },
      outputs: [{ key: 'hash', label: 'Hash JSON Object', type: 'json', required: true }],
    },
    {
      id: 'lpush',
      name: 'List Push Left',
      description: 'Prepends items to a list.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key', 'values'],
        properties: {
          key                   : { type: 'string', title: 'List Key' },
          values                : { type: 'string', title: 'Values (Comma separated or JSON Array)' },
        },
      },
      inputs: [
        { key: 'key', label: 'List Key', type: 'string', required: true },
        { key: 'values', label: 'Values (Comma separated or JSON Array)', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          listLength            : { type: 'number', title: 'New List Length' },
        },
      },
      outputs: [{ key: 'listLength', label: 'New List Length', type: 'number', required: true }],
    },
    {
      id: 'lrange',
      name: 'List Get Range',
      description: 'Returns elements from a list within range.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key'],
        properties: {
          key                   : { type: 'string', title: 'List Key' },
          start                 : { type: 'number', title: 'Start Offset (default 0)' },
          stop                  : { type: 'number', title: 'Stop Offset (default -1)' },
        },
      },
      inputs: [
        { key: 'key', label: 'List Key', type: 'string', required: true },
        { key: 'start', label: 'Start Offset (default 0)', type: 'number', required: false },
        { key: 'stop', label: 'Stop Offset (default -1)', type: 'number', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          items                 : { type: 'object', title: 'List Elements Array' },
        },
      },
      outputs: [{ key: 'items', label: 'List Elements Array', type: 'json', required: true }],
    },
    {
      id: 'sadd',
      name: 'Set Add Members',
      description: 'Adds members to a set.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key', 'members'],
        properties: {
          key                   : { type: 'string', title: 'Set Key' },
          members               : { type: 'string', title: 'Members (Comma separated)' },
        },
      },
      inputs: [
        { key: 'key', label: 'Set Key', type: 'string', required: true },
        { key: 'members', label: 'Members (Comma separated)', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          addedCount            : { type: 'number', title: 'Added Count' },
        },
      },
      outputs: [{ key: 'addedCount', label: 'Added Count', type: 'number', required: true }],
    },
    {
      id: 'smembers',
      name: 'Set Get Members',
      description: 'Returns all members of a set.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['key'],
        properties: {
          key                   : { type: 'string', title: 'Set Key' },
        },
      },
      inputs: [{ key: 'key', label: 'Set Key', type: 'string', required: true }],
            outputSchema: {
        type: 'object',
        properties: {
          members               : { type: 'object', title: 'Set Members Array' },
        },
      },
      outputs: [{ key: 'members', label: 'Set Members Array', type: 'json', required: true }],
    },
    {
      id: 'publish',
      name: 'Publish Pub/Sub Message',
      description: 'Publishes message to Redis Pub/Sub channel.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['channel', 'message'],
        properties: {
          channel               : { type: 'string', title: 'Channel Name' },
          message               : { type: 'string', title: 'Message Payload' },
        },
      },
      inputs: [
        { key: 'channel', label: 'Channel Name', type: 'string', required: true },
        { key: 'message', label: 'Message Payload', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          subscriberCount       : { type: 'number', title: 'Subscribers Received' },
        },
      },
      outputs: [{ key: 'subscriberCount', label: 'Subscribers Received', type: 'number', required: true }],
    },
    {
      id: 'keys',
      name: 'Find Keys by Pattern',
      description: 'Finds keys matching pattern (e.g. user:*).',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['pattern'],
        properties: {
          pattern               : { type: 'string', title: 'Pattern String' },
        },
      },
      inputs: [{ key: 'pattern', label: 'Pattern String', type: 'string', required: true }],
            outputSchema: {
        type: 'object',
        properties: {
          keys                  : { type: 'object', title: 'Matched Keys Array' },
        },
      },
      outputs: [{ key: 'keys', label: 'Matched Keys Array', type: 'json', required: true }],
    },
    {
      id: 'flush_db',
      name: 'Flush Database Index (FLUSHDB)',
      description: 'Deletes all keys in selected Redis index.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['confirmFlush'],
        properties: {
          confirmFlush          : { type: 'string', title: 'Type FLUSH to confirm' },
        },
      },
      inputs: [
        { key: 'confirmFlush', label: 'Type FLUSH to confirm', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          success               : { type: 'boolean', title: 'Success Flag' },
        },
      },
      outputs: [{ key: 'success', label: 'Success Flag', type: 'boolean', required: true }],
    },
  ],
};

export class RedisConnector extends BaseConnector {
  manifest = redisManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const connectionConfig = context.connectionConfig || { dbType: 'redis' };

    try {
      if (actionId === 'flush_db') {
        if (connectionConfig.environmentTag === 'production') {
          throw new Error('FLUSHDB is blocked on Production Redis connections.');
        }
        if (inputs.confirmFlush !== 'FLUSH') {
          throw new Error('Requires confirmation: type FLUSH in confirmFlush input to proceed.');
        }
      }

      if (connectionConfig && (connectionConfig.host || connectionConfig.connectionString)) {
        const redisClient = await getOrCreatePool(connectionConfig);

        if (actionId === 'get') {
          const val = await redisClient.get(inputs.key);
          return { success: true, data: { value: val, exists: val !== null } };
        }

        if (actionId === 'set') {
          if (inputs.ttl) {
            await redisClient.set(inputs.key, inputs.value, 'EX', parseInt(inputs.ttl, 10));
          } else {
            await redisClient.set(inputs.key, inputs.value);
          }
          return { success: true, data: { success: true } };
        }

        if (actionId === 'flush_db') {
          await redisClient.flushdb();
          return { success: true, data: { success: true } };
        }
      }

      return { success: false, data: {}, error: 'Redis host or connection string is required.' };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || String(err) };
    }
  }
}

manifestRegistry.register(redisManifest);
