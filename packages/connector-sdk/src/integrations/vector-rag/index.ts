import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

export const vectorRagManifest: ConnectorManifest = {
  id: 'vector-rag',
  name: 'Vector Database & RAG Search',
  description: 'Pinecone, Supabase Vector & Qdrant semantic search retrieval and document embeddings.',
  category: 'Artificial Intelligence',
  icon: '/icons/vector-rag.svg',
  authType: 'api_key',
  triggers: [],
  actions: [
    {
      id: 'store_embeddings',
      name: 'Store Document Embeddings',
      description: 'Generates text embeddings and upserts into Vector Index.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['provider', 'indexName', 'documentText'],
        properties: {
          provider              : { type: 'string', title: 'Vector DB Provider (pinecone, supabase, qdrant)' },
          indexName             : { type: 'string', title: 'Index / Collection Name' },
          documentText          : { type: 'string', title: 'Document Raw Content' },
          metadata              : { type: 'string', title: 'Metadata JSON Object' },
        },
      },
      inputs: [
        { key: 'provider', label: 'Vector DB Provider (pinecone, supabase, qdrant)', type: 'string', required: true },
        { key: 'indexName', label: 'Index / Collection Name', type: 'string', required: true },
        { key: 'documentText', label: 'Document Raw Content', type: 'string', required: true },
        { key: 'metadata', label: 'Metadata JSON Object', type: 'string', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          vectorId              : { type: 'string', title: 'Upserted Vector ID' },
          chunkCount            : { type: 'number', title: 'Chunks Created' },
        },
      },
      outputs: [
        { key: 'vectorId', label: 'Upserted Vector ID', type: 'string', required: true },
        { key: 'chunkCount', label: 'Chunks Created', type: 'number', required: true },
      ],
    },
    {
      id: 'semantic_search',
      name: 'Semantic RAG Search',
      description: 'Queries vector database for top-K contextually relevant document snippets.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['provider', 'indexName', 'query'],
        properties: {
          provider              : { type: 'string', title: 'Vector DB Provider (pinecone, supabase, qdrant)' },
          indexName             : { type: 'string', title: 'Index / Collection Name' },
          query                 : { type: 'string', title: 'Search Query / User Question' },
          topK                  : { type: 'number', title: 'Top K Matches (Default: 5)' },
        },
      },
      inputs: [
        { key: 'provider', label: 'Vector DB Provider (pinecone, supabase, qdrant)', type: 'string', required: true },
        { key: 'indexName', label: 'Index / Collection Name', type: 'string', required: true },
        { key: 'query', label: 'Search Query / User Question', type: 'string', required: true },
        { key: 'topK', label: 'Top K Matches (Default: 5)', type: 'number', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          matches               : { type: 'object', title: 'Matched Documents Array' },
          contextText           : { type: 'string', title: 'Merged RAG Context String' },
        },
      },
      outputs: [
        { key: 'matches', label: 'Matched Documents Array', type: 'json', required: true },
        { key: 'contextText', label: 'Merged RAG Context String', type: 'string', required: true },
      ],
    },
  ],
};

export class VectorRagConnector extends BaseConnector {
  manifest = vectorRagManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const creds = context.connectionCredentials || {};
    const apiKey = (creds.apiKey || creds.api_key) as string;

    if (!apiKey) {
      return { success: false, data: {}, error: 'Vector database API Key or credentials required.' };
    }

    if (actionId === 'store_embeddings') {
      return {
        success: false,
        data: {},
        error: 'Vector DB live embedding storage requires configured vector store client.',
      };
    }

    if (actionId === 'semantic_search') {
      return {
        success: false,
        data: {},
        error: 'Vector DB semantic search requires active vector store provider connection.',
      };
    }

    return { success: false, data: {}, error: `Unsupported Vector RAG action: ${actionId}` };
  }
}
manifestRegistry.register(vectorRagManifest);
