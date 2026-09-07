import axios from 'axios';

export async function getMondayChoices(
  fieldId: string,
  credentials: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const token = credentials.apiKey || credentials.accessToken || credentials.token;
  if (!token) return [];

  const headers = { Authorization: token, 'Content-Type': 'application/json' };

  try {
    if (fieldId === 'boardId') {
      const query = '{ boards (limit: 50) { id name } }';
      const res = await axios.post('https://api.monday.com/v2', { query }, { headers });
      const boards = res.data?.data?.boards || [];
      return boards.map((b: any) => ({ label: b.name || `${b.id}`, value: `${b.id}` }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
