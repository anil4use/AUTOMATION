import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class GoogleSheetsConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Read, write, and append rows in Google Sheets spreadsheets.',
    category: 'Productivity',
    icon: '/icons/google-sheets.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_row',
        name: 'New Row Added',
        description: 'Triggers when a new row is added to a spreadsheet.',
        type: 'trigger',
        inputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
          { key: 'worksheet', label: 'Worksheet Name', type: 'string', required: true },
        ],
        outputs: [{ key: 'rowValues', label: 'Row Values JSON', type: 'json', required: true }],
      },
    ],
    actions: [
      {
        id: 'append_row',
        name: 'Append Row',
        description: 'Appends a new row to the end of a sheet.',
        type: 'action',
        inputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
          { key: 'worksheet', label: 'Worksheet Name', type: 'string', required: true },
          { key: 'values', label: 'Row Values (JSON Array)', type: 'json', required: true },
        ],
        outputs: [{ key: 'updatedRange', label: 'Updated Range', type: 'string', required: true }],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    if (actionId === 'append_row') {
      return {
        success: true,
        data: { updatedRange: `${context.stepInput.worksheet}!A10:Z10` },
      };
    }
    throw new Error(`Unsupported action: ${actionId}`);
  }
}
