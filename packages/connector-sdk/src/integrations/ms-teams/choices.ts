import axios from 'axios';

export async function getMsTeamsChoices(
  fieldId: string,
  credentials: Record<string, any>,
  dependsOnValues?: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.accessToken || credentials.apiKey || credentials.token;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}` };

  try {
    if (fieldId === 'teamId') {
      const res = await axios.get('https://graph.microsoft.com/v1.0/me/joinedTeams', { headers });
      const teams = res.data?.value || [];
      return teams.map((t: any) => ({ label: t.displayName || t.id, value: t.id }));
    }

    if (fieldId === 'channelId') {
      const teamId = dependsOnValues?.teamId;
      if (!teamId) return [];
      const res = await axios.get(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels`, { headers });
      const channels = res.data?.value || [];
      return channels.map((c: any) => ({ label: c.displayName || c.id, value: c.id }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
