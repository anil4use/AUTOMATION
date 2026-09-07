import axios from 'axios';

export async function getLinearChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.apiKey || credentials.accessToken;
  if (!token) return [];

  const headers = { Authorization: token, 'Content-Type': 'application/json' };

  try {
    if (fieldId === 'teamId') {
      const query = '{ teams { nodes { id name key } } }';
      const res = await axios.post('https://api.linear.app/graphql', { query }, { headers });
      const teams = res.data?.data?.teams?.nodes || [];
      return teams.map((t: any) => ({ label: `${t.name} (${t.key})`, value: t.id }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
