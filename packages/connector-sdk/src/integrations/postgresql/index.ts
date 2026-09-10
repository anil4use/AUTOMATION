import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { parameterizeQuery, enforceLimitCap, checkAllowedStatements } from '../../core/query-sanitizer';
import { getOrCreatePool } from '../../core/database-driver.factory';

export const postgresqlManifest: ConnectorManifest = {
  id: 'postgresql',
  name: 'PostgreSQL Database',
  description: 'Enterprise PostgreSQL integration — Execute parameterized SQL queries, insert, update, delete rows & transactions.',
  category: 'Databases',
  icon: '/icons/postgres.svg',
  authType: 'api_key',
  triggers: [],
  actions: [
    {
      id: 'execute_query',
      name: 'Execute Parameterized SQL Query',
      description: 'Executes a custom SELECT/INSERT/UPDATE query with safe parameters.',
      type: 'action',
      inputs: [
        { key: 'sql', label: 'SQL Query String', type: 'string', required: true },
        { key: 'params', label: 'Query Parameters JSON Array', type: 'string', required: false },
      ],
      outputs: [
        { key: 'rows', label: 'Result Rows Array', type: 'json', required: true },
        { key: 'rowCount', label: 'Affected Row Count', type: 'number', required: true },
        { key: 'truncated', label: 'Truncated Flag', type: 'boolean', required: false },
      ],
    },
    {
      id: 'select_rows',
      name: 'Guided Select Rows',
      description: 'Queries rows from a table with conditions and column selection.',
      type: 'action',
      inputs: [
        { key: 'table', label: 'Table Name', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: '/api/v1/connectors/choices/tables' } },
        { key: 'columns', label: 'Columns (comma separated or *)', type: 'string', required: false },
        { key: 'limit', label: 'Row Limit', type: 'number', required: false },
      ],
      outputs: [
        { key: 'rows', label: 'Result Rows', type: 'json', required: true },
        { key: 'rowCount', label: 'Row Count', type: 'number', required: true },
        { key: 'truncated', label: 'Truncated Flag', type: 'boolean', required: false },
      ],
    },
    {
      id: 'insert_row',
      name: 'Insert One Row',
      description: 'Inserts a new record into a PostgreSQL table.',
      type: 'action',
      inputs: [
        { key: 'table', label: 'Table Name', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: '/api/v1/connectors/choices/tables' } },
        { key: 'data', label: 'Column Values JSON Object', type: 'string', required: true },
      ],
      outputs: [
        { key: 'insertedId', label: 'Inserted Row ID / Primary Key', type: 'string', required: true },
        { key: 'success', label: 'Success Flag', type: 'boolean', required: true },
      ],
    },
    {
      id: 'insert_many',
      name: 'Bulk Insert Rows',
      description: 'Inserts multiple records into a table.',
      type: 'action',
      inputs: [
        { key: 'table', label: 'Table Name', type: 'string', required: true },
        { key: 'rows', label: 'Array of JSON Objects', type: 'string', required: true },
      ],
      outputs: [
        { key: 'rowCount', label: 'Inserted Count', type: 'number', required: true },
      ],
    },
    {
      id: 'update_rows',
      name: 'Update Rows',
      description: 'Updates matching rows in a PostgreSQL table.',
      type: 'action',
      inputs: [
        { key: 'table', label: 'Table Name', type: 'string', required: true },
        { key: 'data', label: 'Update Values JSON Object', type: 'string', required: true },
        { key: 'whereSql', label: 'WHERE Clause SQL', type: 'string', required: true },
      ],
      outputs: [
        { key: 'rowCount', label: 'Updated Row Count', type: 'number', required: true },
      ],
    },
    {
      id: 'delete_rows',
      name: 'Delete Rows',
      description: 'Deletes matching rows from a table.',
      type: 'action',
      inputs: [
        { key: 'table', label: 'Table Name', type: 'string', required: true },
        { key: 'whereSql', label: 'WHERE Clause SQL', type: 'string', required: true },
      ],
      outputs: [
        { key: 'rowCount', label: 'Deleted Row Count', type: 'number', required: true },
      ],
    },
    {
      id: 'upsert_row',
      name: 'Upsert Row (ON CONFLICT)',
      description: 'Inserts or updates on primary key conflict.',
      type: 'action',
      inputs: [
        { key: 'table', label: 'Table Name', type: 'string', required: true },
        { key: 'data', label: 'Column Values JSON Object', type: 'string', required: true },
        { key: 'conflictColumn', label: 'Conflict Column Name', type: 'string', required: true },
      ],
      outputs: [
        { key: 'action', label: 'Action Result (inserted/updated)', type: 'string', required: true },
      ],
    },
    {
      id: 'execute_transaction',
      name: 'Execute Atomic Transaction',
      description: 'Executes multiple SQL statements inside BEGIN/COMMIT.',
      type: 'action',
      inputs: [
        { key: 'queries', label: 'Array of SQL strings or query objects', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Transaction Success', type: 'boolean', required: true },
      ],
    },
    {
      id: 'call_stored_procedure',
      name: 'Call Stored Procedure / Function',
      description: 'Invokes a PostgreSQL function or procedure.',
      type: 'action',
      inputs: [
        { key: 'procedure', label: 'Function/Procedure Name', type: 'string', required: true },
        { key: 'params', label: 'Arguments JSON Array', type: 'string', required: false },
      ],
      outputs: [
        { key: 'results', label: 'Returned Results', type: 'json', required: true },
      ],
    },
    {
      id: 'get_table_schema',
      name: 'Get Table Column Schema',
      description: 'Retrieves column metadata for a table.',
      type: 'action',
      inputs: [
        { key: 'table', label: 'Table Name', type: 'string', required: true },
      ],
      outputs: [
        { key: 'columns', label: 'Columns Definition Array', type: 'json', required: true },
      ],
    },
    {
      id: 'list_tables',
      name: 'List Tables',
      description: 'Lists all tables in the current database schema.',
      type: 'action',
      inputs: [],
      outputs: [
        { key: 'tables', label: 'Table Names Array', type: 'json', required: true },
      ],
    },
  ],
};

export class PostgresqlConnector extends BaseConnector {
  manifest = postgresqlManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const connectionConfig = context.connectionConfig || { dbType: 'postgresql' };

    try {
      if (actionId === 'execute_query' || actionId === 'select_rows' || actionId === 'insert_row') {
        const rawSql = inputs.sql || inputs.whereSql || (inputs.table ? `SELECT * FROM ${inputs.table}` : 'SELECT 1');
        checkAllowedStatements(rawSql, connectionConfig.allowedStatements);
      }

      // Execute live driver action if pool/connectionConfig is present
      if (connectionConfig && (connectionConfig.host || connectionConfig.connectionString)) {
        const pool = await getOrCreatePool(connectionConfig);

        if (actionId === 'execute_query') {
          const rawSql = inputs.sql || 'SELECT 1';
          checkAllowedStatements(rawSql, connectionConfig.allowedStatements);

          const { sql: parameterizedSql, params: extractedParams } = parameterizeQuery(rawSql, context.workflowVariables || {}, 'postgresql');
          const finalParams = inputs.params
            ? (typeof inputs.params === 'string' ? JSON.parse(inputs.params) : inputs.params)
            : extractedParams;

          const { sql: cappedSql, limitApplied } = enforceLimitCap(parameterizedSql);
          const res = await pool.query(cappedSql, finalParams);

          const truncated = (res.rows || []).length >= limitApplied;
          return {
            success: true,
            data: {
              rows: res.rows || [],
              rowCount: res.rowCount ?? (res.rows || []).length,
              truncated,
            },
          };
        }

        if (actionId === 'select_rows') {
          const table = inputs.table;
          const cols = inputs.columns || '*';
          const limit = inputs.limit ? parseInt(inputs.limit, 10) : 10000;
          const rawSql = `SELECT ${cols} FROM ${table} LIMIT ${limit}`;
          checkAllowedStatements(rawSql, connectionConfig.allowedStatements);

          const res = await pool.query(rawSql);
          return {
            success: true,
            data: {
              rows: res.rows || [],
              rowCount: res.rowCount || (res.rows || []).length,
              truncated: (res.rows || []).length >= limit,
            },
          };
        }

        if (actionId === 'insert_row') {
          const table = inputs.table;
          const dataObj = typeof inputs.data === 'string' ? JSON.parse(inputs.data) : inputs.data;
          const keys = Object.keys(dataObj);
          const vals = Object.values(dataObj);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

          const rawSql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
          checkAllowedStatements(rawSql, connectionConfig.allowedStatements);

          const res = await pool.query(rawSql, vals);
          return {
            success: true,
            data: {
              insertedId: res.rows?.[0]?.id || `pg_${Date.now()}`,
              success: true,
              row: res.rows?.[0],
            },
          };
        }

        if (actionId === 'list_tables') {
          const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
          const tables = (res.rows || []).map((r: any) => r.table_name);
          return { success: true, data: { tables } };
        }
      }

      return { success: false, data: {}, error: 'PostgreSQL host or connection string is required.' };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || String(err) };
    }
  }
}

manifestRegistry.register(postgresqlManifest);
