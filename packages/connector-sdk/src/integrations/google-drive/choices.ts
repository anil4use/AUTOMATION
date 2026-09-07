import axios from 'axios';
import { ChoiceOption } from '@automation/shared-types';

interface DriveCredentials {
  accessToken: string;
}

/**
 * Fetches dynamic choices for Google Drive fields (e.g. folders, files)
 */
export async function getGoogleDriveChoices(
  fieldId: string,
  credentials: DriveCredentials
): Promise<ChoiceOption[]> {
  const token = credentials?.accessToken;
  if (!token) {
    return [
      { label: 'My Drive (Root)', value: 'root' },
    ];
  }

  if (fieldId === 'folderId' || fieldId === 'parentFolderId') {
    try {
      const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
          fields: 'files(id, name)',
          pageSize: 50,
        },
      });

      const folders = response.data.files || [];
      const choices: ChoiceOption[] = [{ label: 'My Drive (Root)', value: 'root' }];
      folders.forEach((f: any) => choices.push({ label: f.name, value: f.id }));
      return choices;
    } catch {
      return [{ label: 'My Drive (Root)', value: 'root' }];
    }
  }

  return [];
}
