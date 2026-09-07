import axios from 'axios';

export async function getMsOutlookChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.accessToken || credentials.apiKey || credentials.token;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}` };

  try {
    if (fieldId === 'folderId') {
      const res = await axios.get('https://graph.microsoft.com/v1.0/me/mailFolders', { headers });
      const folders = res.data?.value || [];
      return folders.map((f: any) => ({ label: f.displayName || f.id, value: f.id }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
