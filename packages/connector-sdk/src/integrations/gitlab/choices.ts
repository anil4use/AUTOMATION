import axios from 'axios';

export async function getGitLabChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.personalAccessToken || credentials.accessToken || credentials.apiKey;
  if (!token) return [];

  const headers = { 'PRIVATE-TOKEN': token };

  try {
    if (fieldId === 'projectId') {
      const res = await axios.get('https://gitlab.com/api/v4/projects?membership=true&per_page=50', { headers });
      const projects = res.data || [];
      return projects.map((p: any) => ({ label: p.name_with_namespace || `${p.id}`, value: `${p.id}` }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
