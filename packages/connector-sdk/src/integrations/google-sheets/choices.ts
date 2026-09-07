import axios from 'axios';
import { ChoiceOption } from '@automation/shared-types';

interface SheetsCredentials {
  accessToken: string;
}

/**
 * Fetches dynamic choices for Google Sheets fields (spreadsheet list and sheet tabs)
 */
export async function getGoogleSheetsChoices(
  fieldId: string,
  credentials: SheetsCredentials,
  dependsOnValues?: Record<string, any>
): Promise<ChoiceOption[]> {
  const token = credentials?.accessToken;
  if (!token) return [];

  if (fieldId === 'spreadsheetId' || fieldId === 'spreadsheet') {
    try {
      const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          q: "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
          fields: 'files(id, name)',
          pageSize: 50,
        },
      });

      const files = response.data.files || [];
      return files.map((f: any) => ({
        label: f.name,
        value: f.id,
      }));
    } catch {
      return [];
    }
  }

  if (fieldId === 'sheetName' || fieldId === 'sheetId') {
    const spreadsheetId = dependsOnValues?.spreadsheetId;
    if (!spreadsheetId) return [{ label: 'Sheet1', value: 'Sheet1' }];

    try {
      const response = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { fields: 'sheets(properties(sheetId, title))' },
      });

      const sheets = response.data.sheets || [];
      return sheets.map((s: any) => ({
        label: s.properties.title,
        value: s.properties.title,
        description: `Sheet ID: ${s.properties.sheetId}`,
      }));
    } catch {
      return [{ label: 'Sheet1', value: 'Sheet1' }];
    }
  }

  return [];
}
