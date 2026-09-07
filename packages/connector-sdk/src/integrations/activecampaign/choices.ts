import axios from 'axios';

export async function getActiveCampaignChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const apiUrl = credentials.apiUrl;
  const apiKey = credentials.apiKey;
  if (!apiUrl || !apiKey) return [];

  const headers = { 'Api-Token': apiKey };

  try {
    if (fieldId === 'listId') {
      const res = await axios.get(`${apiUrl.replace(/\/$/, '')}/api/3/lists`, { headers });
      const lists = res.data?.lists || [];
      return lists.map((l: any) => ({ label: l.name || l.id, value: l.id }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
