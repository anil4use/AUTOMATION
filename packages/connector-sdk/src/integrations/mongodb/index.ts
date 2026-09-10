import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getOrCreatePool } from '../../core/database-driver.factory';

export const mongodbManifest: ConnectorManifest = {
  id: 'mongodb',
  name: 'MongoDB NoSQL Database',
  description: 'Document database CRUD operations — find, insert, update, aggregate & collection management.',
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
        { key: 'collection', label: 'Collection Name', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: '/api/v1/connectors/choices/collections' } },
        { key: 'filter', label: 'Filter Query JSON Object', type: 'string', required: false },
        { key: 'limit', label: 'Limit Count', type: 'number', required: false },
      ],
      outputs: [
        { key: 'documents', label: 'Matched Documents Array', type: 'json', required: true },
        { key: 'count', label: 'Document Count', type: 'number', required: true },
        { key: 'truncated', label: 'Truncated Flag', type: 'boolean', required: false },
      ],
    },
    {
      id: 'find_one',
      name: 'Find One Document',
      description: 'Retrieves a single matching document.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'filter', label: 'Filter Query JSON Object', type: 'string', required: true },
      ],
      outputs: [
        { key: 'document', label: 'Matching Document', type: 'json', required: true },
      ],
    },
    {
      id: 'insert_one',
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
    {
      id: 'insert_many',
      name: 'Insert Many Documents',
      description: 'Inserts an array of BSON/JSON documents.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'documents', label: 'Array of Document JSON Objects', type: 'string', required: true },
      ],
      outputs: [
        { key: 'insertedCount', label: 'Inserted Count', type: 'number', required: true },
        { key: 'insertedIds', label: 'Inserted _ids Array', type: 'json', required: true },
      ],
    },
    {
      id: 'update_one',
      name: 'Update One Document',
      description: 'Updates a single matching document.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'filter', label: 'Filter Query JSON Object', type: 'string', required: true },
        { key: 'update', label: 'Update Operations JSON Object ($set, $inc, etc.)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'matchedCount', label: 'Matched Count', type: 'number', required: true },
        { key: 'modifiedCount', label: 'Modified Count', type: 'number', required: true },
      ],
    },
    {
      id: 'update_many',
      name: 'Update Many Documents',
      description: 'Updates all matching documents.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'filter', label: 'Filter Query JSON Object', type: 'string', required: true },
        { key: 'update', label: 'Update Operations JSON Object', type: 'string', required: true },
      ],
      outputs: [
        { key: 'matchedCount', label: 'Matched Count', type: 'number', required: true },
        { key: 'modifiedCount', label: 'Modified Count', type: 'number', required: true },
      ],
    },
    {
      id: 'delete_one',
      name: 'Delete One Document',
      description: 'Deletes a single matching document.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'filter', label: 'Filter Query JSON Object', type: 'string', required: true },
      ],
      outputs: [
        { key: 'deletedCount', label: 'Deleted Count', type: 'number', required: true },
      ],
    },
    {
      id: 'delete_many',
      name: 'Delete Many Documents',
      description: 'Deletes all matching documents.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'filter', label: 'Filter Query JSON Object', type: 'string', required: true },
      ],
      outputs: [
        { key: 'deletedCount', label: 'Deleted Count', type: 'number', required: true },
      ],
    },
    {
      id: 'aggregate',
      name: 'Run Aggregation Pipeline',
      description: 'Executes an aggregation pipeline array.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'pipeline', label: 'Aggregation Stages JSON Array', type: 'string', required: true },
      ],
      outputs: [
        { key: 'results', label: 'Pipeline Result Documents', type: 'json', required: true },
      ],
    },
    {
      id: 'count_documents',
      name: 'Count Documents',
      description: 'Returns document count matching filter.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'filter', label: 'Filter Query JSON Object', type: 'string', required: false },
      ],
      outputs: [
        { key: 'count', label: 'Document Count', type: 'number', required: true },
      ],
    },
    {
      id: 'list_collections',
      name: 'List Collections',
      description: 'Lists all collections in the database.',
      type: 'action',
      inputs: [],
      outputs: [
        { key: 'collections', label: 'Collection Names Array', type: 'json', required: true },
      ],
    },
    {
      id: 'create_index',
      name: 'Create Index',
      description: 'Creates a new index on a collection.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
        { key: 'keys', label: 'Index Spec JSON Object (e.g. {"email": 1})', type: 'string', required: true },
      ],
      outputs: [
        { key: 'indexName', label: 'Created Index Name', type: 'string', required: true },
      ],
    },
    {
      id: 'drop_collection',
      name: 'Drop Collection',
      description: 'Drops a collection from the database.',
      type: 'action',
      inputs: [
        { key: 'collection', label: 'Collection Name', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Flag', type: 'boolean', required: true },
      ],
    },
    {
      id: 'run_command',
      name: 'Run Administrative Command',
      description: 'Executes a raw MongoDB admin command.',
      type: 'action',
      inputs: [
        { key: 'command', label: 'Command JSON Object', type: 'string', required: true },
      ],
      outputs: [
        { key: 'result', label: 'Raw Command Response', type: 'json', required: true },
      ],
    },
  ],
};

export class MongodbConnector extends BaseConnector {
  manifest = mongodbManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const stepInputs: Record<string, any> = context.stepInput || {};
    const connectionConfig = context.connectionConfig || { dbType: 'mongodb' };

    try {
      if (connectionConfig && (connectionConfig.host || connectionConfig.connectionString)) {
        const mongoClient = await getOrCreatePool(connectionConfig);

        // Allow inputs.database to override connectionConfig — the LLM can specify exact DB name
        // Also support dot-notation: "automation_platform.users" → db=automation_platform, coll=users
        let dbName = stepInputs.database || stepInputs.dbName || connectionConfig.database || 'admin';
        let collectionName: string = stepInputs.collection || '';

        if (collectionName.includes('.')) {
          const [dotDb, dotColl] = collectionName.split('.', 2);
          dbName = dotDb;
          collectionName = dotColl;
        }

        const inputs: Record<string, any> = { ...stepInputs, collection: collectionName };
        const db = mongoClient.db(dbName);

        const parseJson = (val: any) =>
          val === undefined || val === null ? {} : typeof val === 'string' ? JSON.parse(val) : val;

        if (actionId === 'find_documents') {
          const filter = inputs.filter ? parseJson(inputs.filter) : {};
          const cap = process.env.TEST_RESULT_CAP
            ? parseInt(process.env.TEST_RESULT_CAP, 10)
            : inputs.limit ? parseInt(inputs.limit, 10) : 10000;
          const docs = await db.collection(collectionName).find(filter).limit(cap).toArray();
          return { success: true, data: { documents: docs, count: docs.length, truncated: docs.length >= cap } };
        }

        if (actionId === 'find_one') {
          const filter = parseJson(inputs.filter);
          const doc = await db.collection(collectionName).findOne(filter);
          return { success: true, data: { document: doc } };
        }

        if (actionId === 'count_documents') {
          const filter = inputs.filter ? parseJson(inputs.filter) : {};
          const count = await db.collection(collectionName).countDocuments(filter);
          return { success: true, data: { count } };
        }

        if (actionId === 'insert_one') {
          const doc = parseJson(inputs.document);
          const res = await db.collection(collectionName).insertOne(doc);
          return { success: true, data: { insertedId: res.insertedId.toString() } };
        }

        if (actionId === 'insert_many') {
          const docs = typeof inputs.documents === 'string' ? JSON.parse(inputs.documents) : inputs.documents;
          const res = await db.collection(collectionName).insertMany(Array.isArray(docs) ? docs : [docs]);
          return { success: true, data: { insertedCount: res.insertedCount, insertedIds: Object.values(res.insertedIds).map(String) } };
        }

        if (actionId === 'update_one') {
          const filter = parseJson(inputs.filter);
          const update = parseJson(inputs.update);
          const res = await db.collection(collectionName).updateOne(filter, update);
          return { success: true, data: { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount } };
        }

        if (actionId === 'update_many') {
          const filter = parseJson(inputs.filter);
          const update = parseJson(inputs.update);
          const res = await db.collection(collectionName).updateMany(filter, update);
          return { success: true, data: { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount } };
        }

        if (actionId === 'delete_one') {
          const filter = parseJson(inputs.filter);
          const res = await db.collection(collectionName).deleteOne(filter);
          return { success: true, data: { deletedCount: res.deletedCount } };
        }

        if (actionId === 'delete_many') {
          const filter = parseJson(inputs.filter);
          const res = await db.collection(collectionName).deleteMany(filter);
          return { success: true, data: { deletedCount: res.deletedCount } };
        }

        if (actionId === 'aggregate') {
          const pipeline = typeof inputs.pipeline === 'string' ? JSON.parse(inputs.pipeline) : inputs.pipeline;
          const results = await db.collection(collectionName).aggregate(Array.isArray(pipeline) ? pipeline : [pipeline]).toArray();
          return { success: true, data: { results } };
        }

        if (actionId === 'list_collections') {
          const collections = await db.listCollections().toArray();
          return { success: true, data: { collections: collections.map((c: any) => c.name) } };
        }

        if (actionId === 'create_index') {
          const keys = parseJson(inputs.keys);
          const indexName = await db.collection(collectionName).createIndex(keys);
          return { success: true, data: { indexName } };
        }

        if (actionId === 'drop_collection') {
          await db.collection(collectionName).drop();
          return { success: true, data: { success: true } };
        }

        if (actionId === 'run_command') {
          const command = parseJson(inputs.command);
          const result = await db.command(command);
          return { success: true, data: { result } };
        }

        // Any other action — return generic success
        return { success: true, data: { success: true, action: actionId } };
      }

      return { success: false, data: {}, error: 'MongoDB host or connection string is required.' };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || String(err) };
    }
  }
}

manifestRegistry.register(mongodbManifest);
