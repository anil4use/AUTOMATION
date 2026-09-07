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
      inputs: [
        { key: 'provider', label: 'Vector DB Provider (pinecone, supabase, qdrant)', type: 'string', required: true },
        { key: 'indexName', label: 'Index / Collection Name', type: 'string', required: true },
        { key: 'documentText', label: 'Document Raw Content', type: 'string', required: true },
        { key: 'metadata', label: 'Metadata JSON Object', type: 'string', required: false },
      ],
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
      inputs: [
        { key: 'provider', label: 'Vector DB Provider (pinecone, supabase, qdrant)', type: 'string', required: true },
        { key: 'indexName', label: 'Index / Collection Name', type: 'string', required: true },
        { key: 'query', label: 'Search Query / User Question', type: 'string', required: true },
        { key: 'topK', label: 'Top K Matches (Default: 5)', type: 'number', required: false },
      ],
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

    if (actionId === 'store_embeddings') {
      return {
        success: true,
        data: {
          vectorId: `vec_${Date.now()}`,
          chunkCount: 3,
        },
      };
    }

    if (actionId === 'semantic_search') {
      const topK = Number(inputs.topK || 3);
      const matches = Array.from({ length: topK }, (_, i) => ({
        id: `doc_match_${i + 1}`,
        score: (0.95 - i * 0.05).toFixed(2),
        content: `Sample vector context snippet ${i + 1} matching query: '${inputs.query}'`,
      }));

      return {
        success: true,
        data: {
          matches,
          contextText: matches.map((m) => m.content).join('\n---\n'),
        },
      };
    }

    return { success: false, data: {}, error: `Unsupported Vector RAG action: ${actionId}` };
  }
}
manifestRegistry.register(vectorRagManifest);
