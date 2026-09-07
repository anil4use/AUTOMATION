import axios from 'axios';

export async function getDropboxChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.accessToken || credentials.apiKey || credentials.token;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    if (fieldId === 'path') {
      const res = await axios.post('https://api.dropboxapi.com/2/files/list_folder', { path: '', recursive: false }, { headers });
      const entries = res.data?.entries || [];
      const folders = entries.filter((e: any) => e['.tag'] === 'folder');
      return folders.map((f: any) => ({ label: f.name || f.path_display, value: f.path_lower }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
