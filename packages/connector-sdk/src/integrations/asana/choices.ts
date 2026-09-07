import axios from 'axios';

export async function getAsanaChoices(
  fieldId: string,
  credentials: Record<string, any>,
  dependsOnValues?: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.accessToken || credentials.apiKey || credentials.token;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}` };

  try {
    if (fieldId === 'workspaceId') {
      const res = await axios.get('https://app.asana.com/api/1.0/workspaces', { headers });
      const items = res.data?.data || [];
      return items.map((w: any) => ({ label: w.name || w.gid, value: w.gid }));
    }

    if (fieldId === 'projectId') {
      const workspaceId = dependsOnValues?.workspaceId;
      const url = workspaceId
        ? `https://app.asana.com/api/1.0/workspaces/${workspaceId}/projects`
        : 'https://app.asana.com/api/1.0/projects';
      const res = await axios.get(url, { headers });
      const projects = res.data?.data || [];
      return projects.map((p: any) => ({ label: p.name || p.gid, value: p.gid }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
