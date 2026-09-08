import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getGoogleSheetsChoices } from './choices';
import axios from 'axios';

const googleSheetsManifest: ConnectorManifest = {
  id: 'google-sheets',
  name: 'Google Sheets',
  description: 'Full-power Google Sheets integration — Append, update, search, read rows, create spreadsheets, add worksheets, batch update cells & trigger automations on row changes.',
  category: 'Productivity',
  icon: '/icons/google-sheets.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'new_row_added',
      name: 'New Row Added',
      description: 'Triggers when a new row is appended to a sheet.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'rowCount',
      rateLimitInfo: {
        minPollIntervalSeconds: 300,
        notes: 'Google Sheets has no native change webhook API. Events between poll intervals may be missed. For real-time detection, use Google Apps Script triggers linked to AutoFlow via HTTP.',
      },
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Tab Name', type: 'string', required: true, dynamicChoice: { endpoint: 'sheetName', dependsOn: ['spreadsheetId'] } },
      ],
      outputs: [
        { key: 'rowNumber', label: 'Row Number', type: 'number', required: true },
        { key: 'values', label: 'Row Values (Array)', type: 'array', required: true },
        { key: 'rowObject', label: 'Row Object (Key-Value by Header)', type: 'object', required: true },
      ],
    },
    {
      id: 'row_updated',
      name: 'Row Updated',
      description: 'Triggers when an existing row is modified.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'updatedAt',
      rateLimitInfo: {
        minPollIntervalSeconds: 300,
        notes: 'Google Sheets has no native change webhook API. Polling interval minimum is 5 minutes.',
      },
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Tab Name', type: 'string', required: true, dynamicChoice: { endpoint: 'sheetName', dependsOn: ['spreadsheetId'] } },
      ],
      outputs: [
        { key: 'rowNumber', label: 'Row Number', type: 'number', required: true },
        { key: 'values', label: 'Updated Values', type: 'array', required: true },
      ],
    },
    {
      id: 'cell_value_changed',
      name: 'Cell Value Changed',
      description: 'Triggers when a specific cell or range is updated.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'updatedAt',
      rateLimitInfo: { minPollIntervalSeconds: 300 },
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Tab Name', type: 'string', required: true, dynamicChoice: { endpoint: 'sheetName', dependsOn: ['spreadsheetId'] } },
        { key: 'cellRange', label: 'Cell / Range (e.g. A1, B2:D5)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'range', label: 'Range', type: 'string', required: true },
        { key: 'value', label: 'New Value', type: 'string', required: true },
      ],
    },
    {
      id: 'new_sheet_created',
      name: 'New Sheet Tab Created',
      description: 'Triggers when a new worksheet tab is added to a spreadsheet.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'sheetCount',
      rateLimitInfo: { minPollIntervalSeconds: 300 },
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
      ],
      outputs: [
        { key: 'sheetId', label: 'Sheet ID', type: 'number', required: true },
        { key: 'title', label: 'Sheet Title', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'append_row',
      name: 'Append Row',
      description: 'Appends a new row of values to the bottom of a sheet.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Tab Name', type: 'string', required: true, dynamicChoice: { endpoint: 'sheetName', dependsOn: ['spreadsheetId'] } },
        { key: 'values', label: 'Row Values (JSON array or comma-separated string)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'updatedRange', label: 'Updated Range', type: 'string', required: true },
        { key: 'updatedRows', label: 'Updated Rows Count', type: 'number', required: true },
      ],
    },
    {
      id: 'update_row',
      name: 'Update Row by Number',
      description: 'Overwrites values in a specific row number.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Tab Name', type: 'string', required: true, dynamicChoice: { endpoint: 'sheetName', dependsOn: ['spreadsheetId'] } },
        { key: 'rowNumber', label: 'Row Number (1-based)', type: 'number', required: true },
        { key: 'values', label: 'New Values (JSON array)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'updatedRange', label: 'Updated Range', type: 'string', required: true },
      ],
    },
    {
      id: 'get_row',
      name: 'Get Single Row',
      description: 'Retrieves values from a specific row number.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Tab Name', type: 'string', required: true, dynamicChoice: { endpoint: 'sheetName', dependsOn: ['spreadsheetId'] } },
        { key: 'rowNumber', label: 'Row Number (1-based)', type: 'number', required: true },
      ],
      outputs: [
        { key: 'rowNumber', label: 'Row Number', type: 'number', required: true },
        { key: 'values', label: 'Values Array', type: 'array', required: true },
      ],
    },
    {
      id: 'get_all_rows',
      name: 'Get All Rows',
      description: 'Retrieves all rows and header mappings from a worksheet.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Tab Name', type: 'string', required: true, dynamicChoice: { endpoint: 'sheetName', dependsOn: ['spreadsheetId'] } },
        { key: 'hasHeaders', label: 'First row is header?', type: 'boolean', required: false },
      ],
      outputs: [
        { key: 'count', label: 'Total Rows', type: 'number', required: true },
        { key: 'rows', label: 'Rows Array', type: 'array', required: true },
      ],
    },
    {
      id: 'search_rows',
      name: 'Search Rows',
      description: 'Searches rows where a column matches a target value.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Tab Name', type: 'string', required: true, dynamicChoice: { endpoint: 'sheetName', dependsOn: ['spreadsheetId'] } },
        { key: 'columnName', label: 'Column Header or Letter (e.g. Email, A)', type: 'string', required: true },
        { key: 'searchValue', label: 'Search Value', type: 'string', required: true },
      ],
      outputs: [
        { key: 'count', label: 'Matches Found', type: 'number', required: true },
        { key: 'matches', label: 'Matching Rows Array', type: 'array', required: true },
      ],
    },
    {
      id: 'clear_row',
      name: 'Clear Row Content',
      description: 'Clears cell contents of a row without shifting remaining rows.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Tab Name', type: 'string', required: true, dynamicChoice: { endpoint: 'sheetName', dependsOn: ['spreadsheetId'] } },
        { key: 'rowNumber', label: 'Row Number', type: 'number', required: true },
      ],
      outputs: [
        { key: 'clearedRange', label: 'Cleared Range', type: 'string', required: true },
      ],
    },
    {
      id: 'delete_row',
      name: 'Delete Row (Shift Up)',
      description: 'Deletes a row completely and shifts remaining rows up.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetId', label: 'Sheet Numeric ID', type: 'number', required: true },
        { key: 'rowNumber', label: 'Row Index (1-based)', type: 'number', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'update_cell',
      name: 'Update Single Cell',
      description: 'Updates value of a specific cell (e.g. B5).',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Tab Name', type: 'string', required: true, dynamicChoice: { endpoint: 'sheetName', dependsOn: ['spreadsheetId'] } },
        { key: 'cell', label: 'Cell Identifier (e.g. C12)', type: 'string', required: true },
        { key: 'value', label: 'Cell Value', type: 'string', required: true },
      ],
      outputs: [
        { key: 'updatedRange', label: 'Updated Cell Range', type: 'string', required: true },
      ],
    },
    {
      id: 'create_spreadsheet',
      name: 'Create Blank Spreadsheet',
      description: 'Creates a brand new Google Spreadsheet.',
      type: 'action',
      inputs: [
        { key: 'title', label: 'Spreadsheet Title', type: 'string', required: true },
      ],
      outputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
        { key: 'spreadsheetUrl', label: 'Spreadsheet URL', type: 'string', required: true },
      ],
    },
    {
      id: 'add_worksheet',
      name: 'Add Worksheet Tab',
      description: 'Adds a new sheet tab to an existing spreadsheet.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'title', label: 'New Sheet Title', type: 'string', required: true },
      ],
      outputs: [
        { key: 'sheetId', label: 'Sheet ID', type: 'number', required: true },
        { key: 'title', label: 'Sheet Title', type: 'string', required: true },
      ],
    },
    {
      id: 'find_row_by_value',
      name: 'Find Row by Value',
      description: 'Finds a row by matching a column value.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet', type: 'string', required: true, dynamicChoice: { endpoint: 'spreadsheetId' } },
        { key: 'sheetName', label: 'Sheet Name', type: 'string', required: true },
        { key: 'searchValue', label: 'Search Value', type: 'string', required: true },
      ],
      outputs: [
        { key: 'rowIndex', label: 'Row Index', type: 'number', required: true },
        { key: 'rowValues', label: 'Row Values', type: 'array', required: true },
      ],
    },
    {
      id: 'update_worksheet_title',
      name: 'Rename Worksheet',
      description: 'Renames an existing worksheet tab.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
        { key: 'sheetId', label: 'Sheet ID', type: 'number', required: true },
        { key: 'newTitle', label: 'New Title', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'delete_worksheet',
      name: 'Delete Worksheet Tab',
      description: 'Deletes a worksheet tab from a spreadsheet.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
        { key: 'sheetId', label: 'Sheet ID', type: 'number', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'batch_update_values',
      name: 'Batch Update Values',
      description: 'Updates multiple cell ranges in one request.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
        { key: 'valueData', label: 'Values JSON Array', type: 'string', required: true },
      ],
      outputs: [
        { key: 'updatedCells', label: 'Total Updated Cells', type: 'number', required: true },
      ],
    },
    {
      id: 'clear_cell_range',
      name: 'Clear Range',
      description: 'Clears cell contents in a range (e.g. A1:C10).',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
        { key: 'range', label: 'Cell Range', type: 'string', required: true },
      ],
      outputs: [
        { key: 'clearedRange', label: 'Cleared Range', type: 'string', required: true },
      ],
    },
    {
      id: 'add_conditional_formatting',
      name: 'Add Conditional Formatting',
      description: 'Adds a conditional formatting rule to range.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
        { key: 'range', label: 'Range (e.g. A1:B10)', type: 'string', required: true },
        { key: 'ruleType', label: 'Rule Type (e.g. CELL_NOT_EMPTY)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'sort_range',
      name: 'Sort Range',
      description: 'Sorts data in a specific range by column.',
      type: 'action',
      inputs: [
        { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
        { key: 'range', label: 'Range to Sort', type: 'string', required: true },
        { key: 'sortOrder', label: 'Order (ASCENDING/DESCENDING)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
  ],
};

export class GoogleSheetsConnector extends BaseConnector {
  manifest = googleSheetsManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const token = credentials?.accessToken;

    if (!token) {
      return { success: false, data: {}, error: 'Google Sheets access token is required.' };
    }

    const api = axios.create({
      baseURL: 'https://sheets.googleapis.com/v4/spreadsheets',
      headers: { Authorization: `Bearer ${token}` },
    });

    try {
      switch (actionId) {
        case 'add_row':
        case 'insert_row':
        case 'append_rows':
        case 'batch_update_rows':
        case 'append_row': {
          const sheetName = inputs.sheetName || 'Sheet1';
          let rawValues = inputs.values ?? inputs.rows ?? inputs.row ?? inputs.data ?? inputs.item;
          let parsed: any = rawValues;

          if (typeof rawValues === 'string') {
            try {
              if (rawValues.startsWith('[') || rawValues.startsWith('{')) {
                parsed = JSON.parse(rawValues);
              } else {
                parsed = rawValues.split(',').map(s => s.trim());
              }
            } catch {
              parsed = [rawValues];
            }
          }

          // Convert single object to array of property values
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            parsed = Object.values(parsed);
          }

          // Convert array of objects to array of property value arrays
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null && !Array.isArray(parsed[0])) {
            parsed = parsed.map((rowObj: any) => Object.values(rowObj));
          }

          // Construct clean 2D array for Google Sheets API
          let rowPayload: any[][];
          if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
            rowPayload = parsed;
          } else if (Array.isArray(parsed)) {
            rowPayload = [parsed];
          } else if (parsed !== undefined && parsed !== null) {
            rowPayload = [[parsed]];
          } else {
            rowPayload = [['No Data Provided', new Date().toISOString()]];
          }

          const { data } = await api.post(`/${inputs.spreadsheetId}/values/${encodeURIComponent(sheetName)}:append`, {
            values: rowPayload,
          }, { params: { valueInputOption: 'USER_ENTERED' } });

          return {
            success: true,
            data: {
              spreadsheetId: inputs.spreadsheetId,
              spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${inputs.spreadsheetId}/edit`,
              updatedRange: data.updates?.updatedRange,
              updatedRows: data.updates?.updatedRows || rowPayload.length,
              rowsAppended: rowPayload.length,
            },
          };
        }

        case 'update_row': {
          const sheetName = inputs.sheetName || 'Sheet1';
          const rowNum = inputs.rowNumber;
          const range = `${sheetName}!A${rowNum}`;
          const values = typeof inputs.values === 'string'
            ? (inputs.values.startsWith('[') ? JSON.parse(inputs.values) : inputs.values.split(','))
            : inputs.values;

          const { data } = await api.put(`/${inputs.spreadsheetId}/values/${encodeURIComponent(range)}`, {
            values: [values],
          }, { params: { valueInputOption: 'USER_ENTERED' } });

          return { success: true, data: { updatedRange: data.updatedRange } };
        }

        case 'get_row': {
          const sheetName = inputs.sheetName || 'Sheet1';
          const range = `${sheetName}!A${inputs.rowNumber}:${inputs.rowNumber}`;
          const { data } = await api.get(`/${inputs.spreadsheetId}/values/${encodeURIComponent(range)}`);
          const values = data.values?.[0] || [];
          return { success: true, data: { rowNumber: inputs.rowNumber, values } };
        }

        case 'read_rows':
        case 'read_sheet':
        case 'get_rows':
        case 'get_all_rows': {
          const sheetName = inputs.sheetName || 'Sheet1';
          const { data } = await api.get(`/${inputs.spreadsheetId}/values/${encodeURIComponent(sheetName)}`);
          const allValues = data.values || [];

          if (inputs.hasHeaders !== false && allValues.length > 1) {
            const headers = allValues[0];
            const rows = allValues.slice(1).map((row: any[], index: number) => {
              const obj: Record<string, any> = { _rowNumber: index + 2 };
              headers.forEach((h: string, i: number) => {
                obj[h] = row[i] ?? '';
              });
              return obj;
            });
            return { success: true, data: { count: rows.length, rows } };
          }

          return { success: true, data: { count: allValues.length, rows: allValues } };
        }

        case 'search_rows': {
          const sheetName = inputs.sheetName || 'Sheet1';
          const { data } = await api.get(`/${inputs.spreadsheetId}/values/${encodeURIComponent(sheetName)}`);
          const allValues = data.values || [];
          if (allValues.length === 0) return { success: true, data: { count: 0, matches: [] } };

          const headers = allValues[0];
          let colIndex = headers.findIndex((h: string) => h.toLowerCase() === inputs.columnName.toLowerCase());
          if (colIndex === -1 && inputs.columnName.length === 1) {
            colIndex = inputs.columnName.toUpperCase().charCodeAt(0) - 65;
          }

          const matches: any[] = [];
          allValues.forEach((row: any[], i: number) => {
            if (i === 0) return;
            if (row[colIndex]?.toString().toLowerCase() === inputs.searchValue.toLowerCase()) {
              matches.push({ rowNumber: i + 1, values: row });
            }
          });

          return { success: true, data: { count: matches.length, matches } };
        }

        case 'clear_row': {
          const sheetName = inputs.sheetName || 'Sheet1';
          const range = `${sheetName}!A${inputs.rowNumber}:Z${inputs.rowNumber}`;
          const { data } = await api.post(`/${inputs.spreadsheetId}/values/${encodeURIComponent(range)}:clear`);
          return { success: true, data: { clearedRange: data.clearedRange } };
        }

        case 'update_cell': {
          const sheetName = inputs.sheetName || 'Sheet1';
          const range = `${sheetName}!${inputs.cell}`;
          const { data } = await api.put(`/${inputs.spreadsheetId}/values/${encodeURIComponent(range)}`, {
            values: [[inputs.value]],
          }, { params: { valueInputOption: 'USER_ENTERED' } });
          return { success: true, data: { updatedRange: data.updatedRange } };
        }

        case 'create_spreadsheet': {
          const sheetTitle = inputs.title || inputs.name || inputs.spreadsheetTitle || 'AutoFlow Sheet';
          const { data } = await api.post('', {
            properties: { title: sheetTitle },
          });
          return {
            success: true,
            data: {
              spreadsheetId: data.spreadsheetId,
              spreadsheetUrl: data.spreadsheetUrl,
            },
          };
        }

        case 'add_worksheet': {
          const { data } = await api.post(`/${inputs.spreadsheetId}:batchUpdate`, {
            requests: [
              { addSheet: { properties: { title: inputs.title } } },
            ],
          });
          const reply = data.replies[0]?.addSheet?.properties;
          return { success: true, data: { sheetId: reply?.sheetId, title: reply?.title } };
        }

        case 'find_row_by_value': {
          const sheetName = inputs.sheetName || 'Sheet1';
          const { data } = await api.get(`/${inputs.spreadsheetId}/values/${encodeURIComponent(sheetName)}`);
          const rows = data.values || [];
          const matchedIdx = rows.findIndex((r: any[]) => r.some((cell: any) => String(cell).toLowerCase().includes(String(inputs.searchValue).toLowerCase())));
          return { success: true, data: { rowIndex: matchedIdx >= 0 ? matchedIdx + 1 : -1, rowValues: matchedIdx >= 0 ? rows[matchedIdx] : [] } };
        }

        case 'update_worksheet_title': {
          await api.post(`/${inputs.spreadsheetId}:batchUpdate`, {
            requests: [{ updateSheetProperties: { properties: { sheetId: inputs.sheetId, title: inputs.newTitle }, fields: 'title' } }],
          });
          return { success: true, data: { success: true } };
        }

        case 'delete_worksheet': {
          await api.post(`/${inputs.spreadsheetId}:batchUpdate`, {
            requests: [{ deleteSheet: { sheetId: inputs.sheetId } }],
          });
          return { success: true, data: { success: true } };
        }

        case 'batch_update_values': {
          const dataPayload = typeof inputs.valueData === 'string' ? JSON.parse(inputs.valueData) : inputs.valueData;
          const { data } = await api.post(`/${inputs.spreadsheetId}/values:batchUpdate`, {
            valueInputOption: 'USER_ENTERED',
            data: dataPayload,
          });
          return { success: true, data: { updatedCells: data.totalUpdatedCells || 0 } };
        }

        case 'clear_cell_range': {
          const { data } = await api.post(`/${inputs.spreadsheetId}/values/${encodeURIComponent(inputs.range)}:clear`);
          return { success: true, data: { clearedRange: data.clearedRange } };
        }

        case 'add_conditional_formatting': {
          await api.post(`/${inputs.spreadsheetId}:batchUpdate`, {
            requests: [{ addConditionalFormatRule: { rule: { ranges: [{ sheetId: 0 }], booleanRule: { condition: { type: inputs.ruleType } } }, index: 0 } }],
          });
          return { success: true, data: { success: true } };
        }

        case 'sort_range': {
          await api.post(`/${inputs.spreadsheetId}:batchUpdate`, {
            requests: [{ sortRange: { range: { sheetId: 0 }, sortSpecs: [{ dimensionIndex: 0, sortOrder: inputs.sortOrder || 'ASCENDING' }] } }],
          });
          return { success: true, data: { success: true } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported Google Sheets action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Google Sheets API error';
      return { success: false, data: {}, error: `Google Sheets error: ${msg}` };
    }
  }
}

export const googleSheetsConnector = new GoogleSheetsConnector();
manifestRegistry.register(googleSheetsManifest);
export { getGoogleSheetsChoices };
