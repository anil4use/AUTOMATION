import axios from 'axios';

export async function getCalendlyChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.accessToken || credentials.apiKey || credentials.token;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}` };

  try {
    if (fieldId === 'userUri') {
      const res = await axios.get('https://api.calendly.com/users/me', { headers });
      const user = res.data?.resource;
      return user ? [{ label: `${user.name} (${user.email})`, value: user.uri }] : [];
    }
  } catch (err) {
    return [];
  }

  return [];
}
