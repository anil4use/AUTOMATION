import axios from 'axios';
import { ChoiceOption } from '@automation/shared-types';

interface GmailCredentials {
  accessToken: string;
}

/**
 * Fetches dynamic choices for Gmail fields (e.g. labels)
 */
export async function getGmailChoices(
  fieldId: string,
  credentials: GmailCredentials
): Promise<ChoiceOption[]> {
  if (fieldId === 'labelId' || fieldId === 'label') {
    try {
      const response = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      const labels = response.data.labels || [];
      return labels.map((l: any) => ({
        label: l.name,
        value: l.id,
        description: `Type: ${l.type}`,
      }));
    } catch {
      return [
        { label: 'INBOX', value: 'INBOX' },
        { label: 'SENT', value: 'SENT' },
        { label: 'SPAM', value: 'SPAM' },
        { label: 'TRASH', value: 'TRASH' },
        { label: 'UNREAD', value: 'UNREAD' },
        { label: 'STARRED', value: 'STARRED' },
        { label: 'IMPORTANT', value: 'IMPORTANT' },
      ];
    }
  }
  return [];
}
