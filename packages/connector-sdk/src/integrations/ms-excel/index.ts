import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getMsExcelChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const msExcelManifest: ConnectorManifest = {
  id: 'ms-excel',
  name: 'Microsoft Excel',
  description: 'Full-power Microsoft Excel Online integration — Read/write rows, append data, update ranges, manage worksheets & trigger on new spreadsheet rows via Microsoft Graph API.',
  category: 'Productivity',
  icon: '/icons/excel.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'new_row',
      name: 'New Table Row Added',
      description: 'Triggers when a new row is appended to a table in an Excel workbook.',
      type: 'trigger',
      deliveryMethod: 'polling',
      inputs: [
        { key: 'driveItemId', label: 'Workbook File', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'driveItemId' } },
        { key: 'worksheetName', label: 'Worksheet', type: 'string', required: true, hasDynamicChoices: true, dependsOn: 'driveItemId', dynamicChoice: { endpoint: 'worksheetName' } },
        { key: 'tableName', label: 'Table Name (Default: Table1)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'rowIndex', label: 'Row Index', type: 'number', required: true },
        { key: 'values', label: 'Row Values Array', type: 'json', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'append_row',
      name: 'Append Row to Worksheet Table',
      description: 'Appends a new row of values to the bottom of an Excel table.',
      type: 'action',
      inputs: [
        { key: 'driveItemId', label: 'Workbook File', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'driveItemId' } },
        { key: 'worksheetName', label: 'Worksheet', type: 'string', required: true, hasDynamicChoices: true, dependsOn: 'driveItemId', dynamicChoice: { endpoint: 'worksheetName' } },
        { key: 'tableName', label: 'Table Name (Default: Table1)', type: 'string', required: false },
        { key: 'values', label: 'Row Values (JSON Array or Comma Separated)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'index', label: 'Appended Row Index', type: 'number', required: true },
        { key: 'address', label: 'Cell Address (e.g. Sheet1!A10:D10)', type: 'string', required: true },
      ],
    },
    {
      id: 'read_range',
      name: 'Read Cell Range',
      description: 'Reads data values from a specified range (e.g. A1:D10).',
      type: 'action',
      inputs: [
        { key: 'driveItemId', label: 'Workbook File', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'driveItemId' } },
        { key: 'worksheetName', label: 'Worksheet', type: 'string', required: true, hasDynamicChoices: true, dependsOn: 'driveItemId', dynamicChoice: { endpoint: 'worksheetName' } },
        { key: 'range', label: 'Cell Range Address (e.g. A1:C50)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'values', label: 'Values 2D Array', type: 'json', required: true },
        { key: 'rowCount', label: 'Row Count', type: 'number', required: true },
      ],
    },
  ],
};

export class MsExcelConnector extends BaseConnector {
  manifest = msExcelManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey || credentials.token;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Microsoft Excel access token.' };
    }

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      if (actionId === 'append_row') {
        const table = inputs.tableName || 'Table1';
        const url = `https://graph.microsoft.com/v1.0/me/drive/items/${inputs.driveItemId}/workbook/worksheets/${inputs.worksheetName}/tables/${table}/rows/add`;
        const valArr = typeof inputs.values === 'string' ? (inputs.values.startsWith('[') ? JSON.parse(inputs.values) : inputs.values.split(',')) : inputs.values;
        const body = { values: [valArr] };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { index: res.data.index, address: res.data.address } };
      }

      if (actionId === 'read_range') {
        const url = `https://graph.microsoft.com/v1.0/me/drive/items/${inputs.driveItemId}/workbook/worksheets/${inputs.worksheetName}/range(address='${inputs.range}')`;
        const res = await axios.get(url, { headers });
        const values = res.data?.values || [];
        return { success: true, data: { values, rowCount: values.length } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.error?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>, dependsOnValues?: Record<string, any>) {
    return getMsExcelChoices(fieldId, credentials, dependsOnValues);
  }
}

manifestRegistry.register(msExcelManifest);
