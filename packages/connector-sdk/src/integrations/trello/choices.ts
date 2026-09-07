import axios from 'axios';

export async function getTrelloChoices(
  fieldId: string,
  credentials: Record<string, any>,
  dependsOnValues?: Record<string, any>
): Promise<Array<{ label: string; value: string }>> {
  const key = credentials.apiKey || credentials.key;
  const token = credentials.token || credentials.accessToken;

  if (!key || !token) return [];

  const authParams = `key=${key}&token=${token}`;

  try {
    if (fieldId === 'boardId') {
      const res = await axios.get(`https://api.trello.com/1/members/me/boards?${authParams}`);
      const boards = res.data || [];
      return boards.map((b: any) => ({ label: b.name || b.id, value: b.id }));
    }

    if (fieldId === 'listId') {
      const boardId = dependsOnValues?.boardId;
      if (!boardId) return [];
      const res = await axios.get(`https://api.trello.com/1/boards/${boardId}/lists?${authParams}`);
      const lists = res.data || [];
      return lists.map((l: any) => ({ label: l.name || l.id, value: l.id }));
    }
  } catch (err) {
    return [];
  }

  return [];
}
