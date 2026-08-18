import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class NotionConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'notion',
    name: 'Notion Workspace',
    description: 'Create database pages, log records, and update Notion workspaces.',
    category: 'Database',
    icon: '/icons/notion.svg',
    authType: 'api_key',
    triggers: [
      {
        id: 'new_database_item',
        name: 'New Database Page',
        description: 'Triggers when a new item is added to a Notion database.',
        type: 'trigger',
        inputs: [{ key: 'databaseId', label: 'Database ID', type: 'string', required: true }],
        outputs: [
          { key: 'pageId', label: 'Page ID', type: 'string', required: true },
          { key: 'title', label: 'Page Title', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'create_page',
        name: 'Create Database Page',
        description: 'Creates a new page record inside a Notion database.',
        type: 'action',
        inputs: [
          { key: 'databaseId', label: 'Database ID', type: 'string', required: true },
          { key: 'title', label: 'Title', type: 'string', required: true },
        ],
        outputs: [
          { key: 'pageId', label: 'Page ID', type: 'string', required: true },
          { key: 'url', label: 'Page URL', type: 'string', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    return {
      success: true,
      data: {
        pageId: `notion_page_${Date.now()}`,
        url: `https://notion.so/workspace/notion_page_${Date.now()}`,
      },
    };
  }
}
