import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getNotionChoices } from './choices';
import axios from 'axios';

const notionManifest: ConnectorManifest = {
  id: 'notion',
  name: 'Notion',
  description: 'Full-power Notion integration — Create pages, query databases, append blocks, search workspace & trigger automations on Notion page updates.',
  category: 'Productivity',
  icon: '/icons/notion.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'page_added_to_database',
      name: 'New Page Added to Database',
      description: 'Triggers when a page is added to a specific Notion database.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'created_time',
      rateLimitInfo: { minPollIntervalSeconds: 300 },
      inputs: [
        { key: 'databaseId', label: 'Database', type: 'string', required: true, dynamicChoice: { endpoint: 'databaseId' } },
      ],
      outputs: [
        { key: 'pageId', label: 'Page ID', type: 'string', required: true },
        { key: 'url', label: 'Page URL', type: 'string', required: true },
        { key: 'title', label: 'Page Title', type: 'string', required: true },
        { key: 'createdTime', label: 'Created Time', type: 'string', required: true },
      ],
    },
    {
      id: 'page_updated_in_database',
      name: 'Page Updated in Database',
      description: 'Triggers when a page in a database is modified.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'last_edited_time',
      rateLimitInfo: { minPollIntervalSeconds: 300 },
      inputs: [
        { key: 'databaseId', label: 'Database', type: 'string', required: true, dynamicChoice: { endpoint: 'databaseId' } },
      ],
      outputs: [
        { key: 'pageId', label: 'Page ID', type: 'string', required: true },
        { key: 'lastEditedTime', label: 'Last Edited Time', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_page',
      name: 'Create Database Page',
      description: 'Creates a new page inside a Notion database.',
      type: 'action',
      inputs: [
        { key: 'databaseId', label: 'Database', type: 'string', required: true, dynamicChoice: { endpoint: 'databaseId' } },
        { key: 'title', label: 'Page Title', type: 'string', required: true },
        { key: 'content', label: 'Initial Page Text / Content', type: 'string', required: false },
        { key: 'propertiesJson', label: 'Additional Properties (JSON string)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'pageId', label: 'Page ID', type: 'string', required: true },
        { key: 'url', label: 'Page URL', type: 'string', required: true },
      ],
    },
    {
      id: 'query_database',
      name: 'Query Database',
      description: 'Queries pages from a Notion database with optional filter.',
      type: 'action',
      inputs: [
        { key: 'databaseId', label: 'Database', type: 'string', required: true, dynamicChoice: { endpoint: 'databaseId' } },
        { key: 'filterJson', label: 'Notion Filter Object (JSON string)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'count', label: 'Pages Count', type: 'number', required: true },
        { key: 'pages', label: 'Pages Array', type: 'array', required: true },
      ],
    },
    {
      id: 'get_page',
      name: 'Get Page Details',
      description: 'Retrieves metadata and properties of a specific Notion page.',
      type: 'action',
      inputs: [
        { key: 'pageId', label: 'Page ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Page ID', type: 'string', required: true },
        { key: 'url', label: 'URL', type: 'string', required: true },
        { key: 'properties', label: 'Properties Object', type: 'object', required: true },
      ],
    },
    {
      id: 'archive_page',
      name: 'Archive / Delete Page',
      description: 'Archives a page in Notion.',
      type: 'action',
      inputs: [
        { key: 'pageId', label: 'Page ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'append_block_children',
      name: 'Append Content Block to Page',
      description: 'Appends paragraph or heading blocks to a page.',
      type: 'action',
      inputs: [
        { key: 'pageId', label: 'Page or Block ID', type: 'string', required: true },
        { key: 'text', label: 'Paragraph Text to Append', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'search',
      name: 'Search Workspace',
      description: 'Searches pages and databases across the Notion workspace.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
      ],
      outputs: [
        { key: 'count', label: 'Results Count', type: 'number', required: true },
        { key: 'results', label: 'Results Array', type: 'array', required: true },
      ],
    },
  ],
};

export class NotionConnector extends BaseConnector {
  manifest = notionManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const token = credentials?.apiKey || credentials?.accessToken;

    if (!token) {
      return { success: false, data: {}, error: 'Notion API Integration Token is required.' };
    }

    const api = axios.create({
      baseURL: 'https://api.notion.com/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    });

    try {
      switch (actionId) {
        case 'create_page': {
          let properties: any = {
            title: {
              title: [{ text: { content: inputs.title } }],
            },
          };
          if (inputs.propertiesJson) {
            properties = { ...properties, ...JSON.parse(inputs.propertiesJson) };
          }

          const children: any[] = [];
          if (inputs.content) {
            children.push({
              object: 'block',
              type: 'paragraph',
              paragraph: { rich_text: [{ type: 'text', text: { content: inputs.content } }] },
            });
          }

          const { data } = await api.post('/pages', {
            parent: { database_id: inputs.databaseId },
            properties,
            children: children.length > 0 ? children : undefined,
          });

          return { success: true, data: { pageId: data.id, url: data.url } };
        }

        case 'query_database': {
          const filter = inputs.filterJson ? JSON.parse(inputs.filterJson) : undefined;
          const { data } = await api.post(`/databases/${inputs.databaseId}/query`, { filter });
          return { success: true, data: { count: data.results?.length || 0, pages: data.results || [] } };
        }

        case 'get_page': {
          const { data } = await api.get(`/pages/${inputs.pageId}`);
          return { success: true, data: { id: data.id, url: data.url, properties: data.properties } };
        }

        case 'archive_page': {
          await api.patch(`/pages/${inputs.pageId}`, { archived: true });
          return { success: true, data: { success: true } };
        }

        case 'append_block_children': {
          await api.patch(`/blocks/${inputs.pageId}/children`, {
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: { rich_text: [{ type: 'text', text: { content: inputs.text } }] },
              },
            ],
          });
          return { success: true, data: { success: true } };
        }

        case 'search': {
          const { data } = await api.post('/search', { query: inputs.query });
          return { success: true, data: { count: data.results?.length || 0, results: data.results || [] } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported Notion action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Notion API error';
      return { success: false, data: {}, error: `Notion error: ${msg}` };
    }
  }
}

export const notionConnector = new NotionConnector();
manifestRegistry.register(notionManifest);
export { getNotionChoices };
