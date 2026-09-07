import axios from 'axios';

export async function getMailchimpChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const apiKey = credentials.apiKey || credentials.accessToken;
  if (!apiKey) return [];

  const dc = apiKey.split('-')[1] || 'us1';
  const headers = { Authorization: `apikey ${apiKey}` };

  try {
    if (fieldId === 'listId') {
      const res = await axios.get(`https://${dc}.api.mailchimp.com/3.0/lists`, { headers });
      const lists = res.data?.lists || [];
      return lists.map((l: any) => ({ label: l.name || l.id, value: l.id }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
