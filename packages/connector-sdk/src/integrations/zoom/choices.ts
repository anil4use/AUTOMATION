import axios from 'axios';

export async function getZoomChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.accessToken || credentials.apiKey || credentials.token;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}` };

  try {
    if (fieldId === 'userId') {
      const res = await axios.get('https://api.zoom.us/v2/users', { headers });
      const users = res.data?.users || [];
      return users.map((u: any) => ({ label: `${u.first_name} ${u.last_name} (${u.email})`, value: u.id }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
