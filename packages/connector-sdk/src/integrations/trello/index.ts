import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getTrelloChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const trelloManifest: ConnectorManifest = {
  id: 'trello',
  name: 'Trello',
  description: 'Full-power Trello integration — Create cards, move cards between lists, add comments, manage members & trigger on board/card events.',
  category: 'Project Management',
  icon: '/icons/trello.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'new_card',
      name: 'New Card Created',
      description: 'Triggers when a new card is added to a list.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'boardId', label: 'Board', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'boardId' } },
        { key: 'listId', label: 'List', type: 'string', required: false, hasDynamicChoices: true, dependsOn: 'boardId', dynamicChoice: { endpoint: 'listId' } },
      ],
      outputs: [
        { key: 'id', label: 'Card ID', type: 'string', required: true },
        { key: 'name', label: 'Card Name', type: 'string', required: true },
        { key: 'desc', label: 'Card Description', type: 'string', required: true },
        { key: 'url', label: 'Card Short URL', type: 'string', required: true },
      ],
    },
    {
      id: 'card_moved',
      name: 'Card Moved to List',
      description: 'Triggers when a card is moved to a target list.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'boardId', label: 'Board', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'boardId' } },
        { key: 'listId', label: 'Target List', type: 'string', required: true, hasDynamicChoices: true, dependsOn: 'boardId', dynamicChoice: { endpoint: 'listId' } },
      ],
      outputs: [
        { key: 'id', label: 'Card ID', type: 'string', required: true },
        { key: 'name', label: 'Card Name', type: 'string', required: true },
        { key: 'listName', label: 'Target List Name', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_card',
      name: 'Create Trello Card',
      description: 'Creates a new card in a specified Trello list.',
      type: 'action',
      inputs: [
        { key: 'boardId', label: 'Board', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'boardId' } },
        { key: 'listId', label: 'List', type: 'string', required: true, hasDynamicChoices: true, dependsOn: 'boardId', dynamicChoice: { endpoint: 'listId' } },
        { key: 'name', label: 'Card Name / Title', type: 'string', required: true },
        { key: 'desc', label: 'Description Content (Markdown)', type: 'string', required: false },
        { key: 'due', label: 'Due Date (ISO string)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Created Card ID', type: 'string', required: true },
        { key: 'url', label: 'Card Short URL', type: 'string', required: true },
      ],
    },
    {
      id: 'move_card',
      name: 'Move Card to List',
      description: 'Moves an existing card to a different list.',
      type: 'action',
      inputs: [
        { key: 'cardId', label: 'Card ID', type: 'string', required: true },
        { key: 'listId', label: 'Destination List ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Card ID', type: 'string', required: true },
        { key: 'idList', label: 'New List ID', type: 'string', required: true },
      ],
    },
    {
      id: 'add_comment',
      name: 'Add Comment to Card',
      description: 'Posts a comment on a card.',
      type: 'action',
      inputs: [
        { key: 'cardId', label: 'Card ID', type: 'string', required: true },
        { key: 'text', label: 'Comment Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Comment Action ID', type: 'string', required: true },
      ],
    },
  ],
};

export class TrelloConnector extends BaseConnector {
  manifest = trelloManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const key = credentials.apiKey || credentials.key;
    const token = credentials.token || credentials.accessToken;

    if (!key || !token) {
      return { success: false, data: {}, error: 'Missing Trello API key or user Token.' };
    }

    const auth = `key=${key}&token=${token}`;

    try {
      if (actionId === 'create_card') {
        const url = `https://api.trello.com/1/cards?idList=${inputs.listId}&name=${encodeURIComponent(inputs.name)}&desc=${encodeURIComponent(inputs.desc || '')}&${auth}`;
        const res = await axios.post(url);
        return { success: true, data: { id: res.data.id, url: res.data.shortUrl || res.data.url } };
      }

      if (actionId === 'move_card') {
        const url = `https://api.trello.com/1/cards/${inputs.cardId}?idList=${inputs.listId}&${auth}`;
        const res = await axios.put(url);
        return { success: true, data: { id: res.data.id, idList: res.data.idList } };
      }

      if (actionId === 'add_comment') {
        const url = `https://api.trello.com/1/cards/${inputs.cardId}/actions/comments?text=${encodeURIComponent(inputs.text)}&${auth}`;
        const res = await axios.post(url);
        return { success: true, data: { id: res.data.id } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>, dependsOnValues?: Record<string, any>) {
    return getTrelloChoices(fieldId, credentials, dependsOnValues);
  }
}

manifestRegistry.register(trelloManifest);
