import axios from 'axios';

export async function getFacebookChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.accessToken || credentials.apiKey;
  if (!token) return [];

  try {
    if (fieldId === 'pageId') {
      const res = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`);
      const pages = res.data?.data || [];
      return pages.map((p: any) => ({ label: p.name || p.id, value: p.id }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
