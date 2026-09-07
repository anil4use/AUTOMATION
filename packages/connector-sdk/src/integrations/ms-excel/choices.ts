import axios from 'axios';

export async function getMsExcelChoices(
  fieldId: string,
  credentials: Record<string, any>,
  dependsOnValues?: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.accessToken || credentials.apiKey || credentials.token;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}` };

  try {
    if (fieldId === 'driveItemId') {
      const res = await axios.get("https://graph.microsoft.com/v1.0/me/drive/root/search(q='.xlsx')?select=id,name", { headers });
      const items = res.data?.value || [];
      return items.map((i: any) => ({ label: i.name || i.id, value: i.id }));
    }

    if (fieldId === 'worksheetName') {
      const driveItemId = dependsOnValues?.driveItemId;
      if (!driveItemId) return [];
      const res = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${driveItemId}/workbook/worksheets`, { headers });
      const sheets = res.data?.value || [];
      return sheets.map((s: any) => ({ label: s.name || s.id, value: s.name }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
