import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getMondayChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const mondayManifest: ConnectorManifest = {
  id: 'monday',
  name: 'Monday.com',
  description: 'Full-power Monday.com integration — Create board items, update column values, post updates/comments & trigger automations on real-time board webhooks.',
  category: 'Project Management',
  icon: '/icons/monday.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'item_created',
      name: 'Item Created on Board',
      description: 'Triggers when a new item is added to a Monday.com board.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'boardId', label: 'Board', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'boardId' } },
      ],
      outputs: [
        { key: 'itemId', label: 'Item ID', type: 'string', required: true },
        { key: 'itemName', label: 'Item Name', type: 'string', required: true },
        { key: 'boardId', label: 'Board ID', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_item',
      name: 'Create Board Item',
      description: 'Creates a new item row on a Monday.com board.',
      type: 'action',
      inputs: [
        { key: 'boardId', label: 'Board', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'boardId' } },
        { key: 'itemName', label: 'Item Name', type: 'string', required: true },
        { key: 'columnValuesJson', label: 'Column Values (JSON object string)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Created Item ID', type: 'string', required: true },
      ],
    },
    {
      id: 'add_update',
      name: 'Add Item Update / Comment',
      description: 'Posts an update/comment on an item.',
      type: 'action',
      inputs: [
        { key: 'itemId', label: 'Item ID', type: 'string', required: true },
        { key: 'body', label: 'Update Text Content', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Update ID', type: 'string', required: true },
      ],
    },
  ],
};

export class MondayConnector extends BaseConnector {
  manifest = mondayManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.apiKey || credentials.accessToken || credentials.token;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Monday.com API token.' };
    }

    const headers = { Authorization: token, 'Content-Type': 'application/json' };

    try {
      if (actionId === 'create_item') {
        const columnVals = inputs.columnValuesJson ? `, column_values: "${inputs.columnValuesJson.replace(/"/g, '\\"')}"` : '';
        const query = `mutation { create_item (board_id: ${inputs.boardId}, item_name: "${inputs.itemName.replace(/"/g, '\\"')}"${columnVals}) { id } }`;
        const res = await axios.post('https://api.monday.com/v2', { query }, { headers });
        const item = res.data?.data?.create_item;
        return { success: true, data: { id: item?.id } };
      }

      if (actionId === 'add_update') {
        const query = `mutation { create_update (item_id: ${inputs.itemId}, body: "${inputs.body.replace(/"/g, '\\"')}") { id } }`;
        const res = await axios.post('https://api.monday.com/v2', { query }, { headers });
        const update = res.data?.data?.create_update;
        return { success: true, data: { id: update?.id } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.errors?.[0]?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getMondayChoices(fieldId, credentials);
  }
}

manifestRegistry.register(mondayManifest);
