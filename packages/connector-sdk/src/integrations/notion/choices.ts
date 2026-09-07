import axios from 'axios';
import { ChoiceOption } from '@automation/shared-types';

interface NotionCredentials {
  apiKey?: string;
  accessToken?: string;
}

export async function getNotionChoices(
  fieldId: string,
  credentials: NotionCredentials
): Promise<ChoiceOption[]> {
  const token = credentials?.apiKey || credentials?.accessToken;
  if (!token) return [];

  if (fieldId === 'databaseId' || fieldId === 'database') {
    try {
      const response = await axios.post(
        'https://api.notion.com/v1/search',
        { filter: { value: 'database', property: 'object' } },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
        }
      );

      const databases = response.data.results || [];
      return databases.map((db: any) => ({
        label: db.title?.[0]?.plain_text || db.id,
        value: db.id,
      }));
    } catch {
      return [];
    }
  }

  return [];
}
