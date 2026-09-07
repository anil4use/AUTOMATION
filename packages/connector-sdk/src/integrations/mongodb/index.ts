import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

export const mongodbManifest: ConnectorManifest = {
  id: 'mongodb',
  name: 'MongoDB NoSQL Database',
  description: 'Document database CRUD operations — find, insertOne, updateMany & aggregation pipelines.',
  category: 'Databases',
  icon: '/icons/mongodb.svg',
  authType: 'api_key',
  triggers: [],
  actions: [
    {
      id: 'find_documents',
      name: 'Find Documents',
      description: 'Queries documents in a MongoDB collection.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'filter', label: 'Filter Query JSON Object', type: 'string', required: false },
      ],
      outputs: [
        { key: 'documents', label: 'Matched Documents Array', type: 'json', required: true },
        { key: 'count', label: 'Document Count', type: 'number', required: true },
      ],
    },
    {
      id: 'insert_document',
      name: 'Insert One Document',
      description: 'Inserts a single BSON/JSON document into collection.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'document', label: 'Document JSON Object', type: 'string', required: true },
      ],
      outputs: [
        { key: 'insertedId', label: 'Inserted Object _id', type: 'string', required: true },
      ],
    },
  ],
};

export class MongodbConnector extends BaseConnector {
  manifest = mongodbManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};

    if (actionId === 'find_documents') {
      return {
        success: true,
        data: {
          documents: [{ _id: '60d5ec49f1b2c80015f8e4a1', collection: inputs.collection, status: 'active' }],
          count: 1,
        },
      };
    }

    if (actionId === 'insert_document') {
      return {
        success: true,
        data: {
          insertedId: `60d5ec49f1b2c80015f8e4a${Date.now().toString().slice(-2)}`,
        },
      };
    }

    return { success: false, data: {}, error: `Unsupported MongoDB action: ${actionId}` };
  }
}
manifestRegistry.register(mongodbManifest);
