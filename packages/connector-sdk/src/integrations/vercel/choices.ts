import axios from 'axios';

export async function getVercelChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.bearerToken || credentials.token || credentials.apiKey;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}` };

  try {
    if (fieldId === 'projectId') {
      const res = await axios.get('https://api.vercel.com/v9/projects', { headers });
      const projects = res.data?.projects || [];
      return projects.map((p: any) => ({ label: p.name || p.id, value: p.id }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
