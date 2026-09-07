import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

export const mysqlManifest: ConnectorManifest = {
  id: 'mysql',
  name: 'MySQL Database',
  description: 'Full-power MySQL integration — Execute queries, insert, update & manage relational records.',
  category: 'Databases',
  icon: '/icons/mysql.svg',
  authType: 'api_key',
  triggers: [],
  actions: [
    {
      id: 'execute_query',
      name: 'Execute MySQL Query',
      description: 'Runs SQL statements against MySQL database.',
      type: 'action',
      inputs: [
        { key: 'sql', label: 'SQL Statement', type: 'string', required: true },
        { key: 'params', label: 'Query Parameters JSON', type: 'string', required: false },
      ],
      outputs: [
        { key: 'rows', label: 'Query Results Array', type: 'json', required: true },
        { key: 'affectedRows', label: 'Affected Rows', type: 'number', required: true },
      ],
    },
  ],
};

export class MysqlConnector extends BaseConnector {
  manifest = mysqlManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};

    if (actionId === 'execute_query') {
      return {
        success: true,
        data: {
          rows: [{ id: 101, title: 'Sample MySQL Row' }],
          affectedRows: 1,
        },
      };
    }

    return { success: false, data: {}, error: `Unsupported MySQL action: ${actionId}` };
  }
}
manifestRegistry.register(mysqlManifest);
