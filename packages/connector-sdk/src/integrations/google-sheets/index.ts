import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class GoogleSheetsConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Real Google Sheets integration — Read, write, create, append rows, and update spreadsheet data.',
    category: 'Productivity',
    icon: '/icons/google-sheets.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_row',
        name: 'New Row Added',
        description: 'Triggers when a new row is appended to a Google Sheet.',
        type: 'trigger',
        inputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID or Google Sheet Link', type: 'string', required: true },
          { key: 'worksheet', label: 'Sheet Name (e.g. Sheet1)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'rowValues', label: 'Row Values Array', type: 'array', required: true },
          { key: 'rowIndex', label: 'Row Index', type: 'number', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'append_row',
        name: 'Append Row',
        description: 'Appends a new row of values to the end of a Google Sheet.',
        type: 'action',
        inputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID or Link', type: 'string', required: true },
          { key: 'worksheet', label: 'Sheet Name (e.g. Sheet1)', type: 'string', required: false },
          { key: 'values', label: 'Row Values (Comma-separated or JSON Array)', type: 'string', required: true },
        ],
        outputs: [
          { key: 'updatedRange', label: 'Updated Range', type: 'string', required: true },
          { key: 'updatedRows', label: 'Rows Added', type: 'number', required: true },
          { key: 'spreadsheetUrl', label: 'Google Sheet Link', type: 'string', required: true },
        ],
      },
      {
        id: 'read_rows',
        name: 'Read Sheet Rows / Range',
        description: 'Reads data values from a specified range in a Google Sheet.',
        type: 'action',
        inputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID or Link', type: 'string', required: true },
          { key: 'range', label: 'Range (e.g. Sheet1!A1:Z50 or Sheet1)', type: 'string', required: true },
        ],
        outputs: [
          { key: 'range', label: 'Range Read', type: 'string', required: true },
          { key: 'values', label: 'Cell Data Matrix', type: 'array', required: true },
          { key: 'rowCount', label: 'Row Count', type: 'number', required: true },
        ],
      },
      {
        id: 'update_range',
        name: 'Update Cell Range',
        description: 'Overwrites cell values in a specific range of a Google Sheet.',
        type: 'action',
        inputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID or Link', type: 'string', required: true },
          { key: 'range', label: 'Range (e.g. Sheet1!A2:B2)', type: 'string', required: true },
          { key: 'values', label: 'Cell Values (JSON Array or Comma-separated)', type: 'string', required: true },
        ],
        outputs: [
          { key: 'updatedRange', label: 'Updated Range', type: 'string', required: true },
          { key: 'updatedCells', label: 'Updated Cell Count', type: 'number', required: true },
        ],
      },
      {
        id: 'create_spreadsheet',
        name: 'Create New Spreadsheet',
        description: 'Creates a brand new Google Sheet in your Google Drive.',
        type: 'action',
        inputs: [
          { key: 'title', label: 'Spreadsheet Title', type: 'string', required: true },
        ],
        outputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
          { key: 'spreadsheetUrl', label: 'Google Sheet Link', type: 'string', required: true },
        ],
      },
      {
        id: 'clear_values',
        name: 'Clear Range Values',
        description: 'Clears cell content from a specified range in a Google Sheet.',
        type: 'action',
        inputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID or Link', type: 'string', required: true },
          { key: 'range', label: 'Range (e.g. Sheet1!A2:Z100)', type: 'string', required: true },
        ],
        outputs: [
          { key: 'clearedRange', label: 'Cleared Range', type: 'string', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const creds = context.connectionCredentials || {};
    const accessToken = creds.accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    const userEmail = creds.userEmail || creds.email || 'me';

    const token = this.requireAccessToken(accessToken, userEmail);

    // 1. Action: CREATE SPREADSHEET
    if (actionId === 'create_spreadsheet') {
      const title = context.stepInput.title || 'Untitled Automation Sheet';
      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties: { title } }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(`Google Sheets API Error (${res.status}): ${data.error?.message || res.statusText}`);

      return {
        success: true,
        data: {
          spreadsheetId: data.spreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
          title: data.properties?.title,
        },
      };
    }

    const spreadsheetId = this.extractSpreadsheetId(context.stepInput.spreadsheetId);
    if (!spreadsheetId) {
      throw new Error('Google Sheets Error: "spreadsheetId" or Google Sheet Link is required.');
    }

    // 2. Action: APPEND ROW
    if (actionId === 'append_row') {
      const sheetName = context.stepInput.worksheet || 'Sheet1';
      const rawValues = context.stepInput.values;

      let parsedRow: any[] = [];
      if (Array.isArray(rawValues)) {
        parsedRow = rawValues;
      } else if (typeof rawValues === 'string') {
        try {
          parsedRow = JSON.parse(rawValues);
          if (!Array.isArray(parsedRow)) parsedRow = [rawValues];
        } catch {
          parsedRow = rawValues.split(',').map((s) => s.trim());
        }
      }

      const range = `${sheetName}!A1`;
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [parsedRow] }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(`Google Sheets Append Error (${res.status}): ${data.error?.message || res.statusText}`);

      return {
        success: true,
        data: {
          updatedRange: data.updates?.updatedRange || `${sheetName}!A:A`,
          updatedRows: data.updates?.updatedRows || 1,
          updatedColumns: data.updates?.updatedColumns || parsedRow.length,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        },
      };
    }

    // 3. Action: READ ROWS / RANGE
    if (actionId === 'read_rows') {
      const range = context.stepInput.range || 'Sheet1!A1:Z100';
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(`Google Sheets Read Error (${res.status}): ${data.error?.message || res.statusText}`);

      const rows = data.values || [];
      return {
        success: true,
        data: {
          range: data.range || range,
          rowCount: rows.length,
          values: rows,
        },
      };
    }

    // 4. Action: UPDATE RANGE
    if (actionId === 'update_range') {
      const range = context.stepInput.range;
      if (!range) throw new Error('Google Sheets Update error: "range" parameter is required.');

      const rawValues = context.stepInput.values;
      let valuesMatrix: any[][] = [];
      if (Array.isArray(rawValues)) {
        valuesMatrix = Array.isArray(rawValues[0]) ? rawValues : [rawValues];
      } else if (typeof rawValues === 'string') {
        try {
          const parsed = JSON.parse(rawValues);
          valuesMatrix = Array.isArray(parsed) ? (Array.isArray(parsed[0]) ? parsed : [parsed]) : [[rawValues]];
        } catch {
          valuesMatrix = [rawValues.split(',').map((s) => s.trim())];
        }
      }

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: valuesMatrix }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(`Google Sheets Update Error (${res.status}): ${data.error?.message || res.statusText}`);

      return {
        success: true,
        data: {
          updatedRange: data.updatedRange || range,
          updatedCells: data.updatedCells || 1,
        },
      };
    }

    // 5. Action: CLEAR VALUES
    if (actionId === 'clear_values') {
      const range = context.stepInput.range;
      if (!range) throw new Error('Google Sheets Clear error: "range" parameter is required.');

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(`Google Sheets Clear Error (${res.status}): ${data.error?.message || res.statusText}`);

      return {
        success: true,
        data: {
          clearedRange: data.clearedRange || range,
          status: 'cleared',
        },
      };
    }

    throw new Error(`Unsupported Google Sheets action: ${actionId}`);
  }

  /** Ensures access token exists, otherwise throws a real descriptive error */
  private requireAccessToken(accessToken: string | undefined, userEmail: string): string {
    if (!accessToken || accessToken.startsWith('default_') || accessToken.startsWith('access_token_')) {
      throw new Error(
        `Google Sheets API Error: Account "${userEmail}" is not authenticated with real Google OAuth. Please go to Connectors page and click "Connect Google Sheets" to log in with your Google account.`
      );
    }
    return accessToken;
  }

  /** Extracts 44-character Google Spreadsheet ID from either raw ID or full Google Sheet URL */
  private extractSpreadsheetId(input: string): string {
    if (!input) return '';
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  }
}
