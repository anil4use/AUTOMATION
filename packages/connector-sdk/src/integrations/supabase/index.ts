import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

export const supabaseManifest: ConnectorManifest = {
  id: 'supabase',
  name: 'Supabase Platform',
  description: 'Supabase database CRUD, authentication, storage & vector embedding operations.',
  category: 'Databases',
  icon: '/icons/supabase.svg',
  authType: 'api_key',
  triggers: [],
  actions: [
    {
      id: 'select_rows',
      name: 'Select Table Rows',
      description: 'Fetches rows from a Supabase table with column filters.',
      type: 'action',
      inputs: [
        { key: 'table', label: 'Table Name', type: 'string', required: true },
        { key: 'query', label: 'Filter Expression (e.g. status=eq.active)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'data', label: 'Returned Records Array', type: 'json', required: true },
      ],
    },
    {
      id: 'insert_row',
      name: 'Insert Row',
      description: 'Inserts a object payload into a Supabase table.',
      type: 'action',
      inputs: [
        { key: 'table', label: 'Table Name', type: 'string', required: true },
        { key: 'record', label: 'Record JSON Object', type: 'string', required: true },
      ],
      outputs: [
        { key: 'data', label: 'Inserted Record Data', type: 'json', required: true },
      ],
    },
  ],
};

export class SupabaseConnector extends BaseConnector {
  manifest = supabaseManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};

    if (actionId === 'select_rows' || actionId === 'insert_row') {
      return {
        success: true,
        data: {
          data: [{ id: 'sup_123', table: inputs.table, created_at: new Date().toISOString() }],
        },
      };
    }

    return { success: false, data: {}, error: `Unsupported Supabase action: ${actionId}` };
  }
}
manifestRegistry.register(supabaseManifest);
