import axios from 'axios';
import { ChoiceOption } from '@automation/shared-types';

interface SlackCredentials {
  accessToken: string;
}

/**
 * Fetches dynamic choices for Slack fields (e.g. channels, users)
 */
export async function getSlackChoices(
  fieldId: string,
  credentials: SlackCredentials
): Promise<ChoiceOption[]> {
  const token = credentials?.accessToken;
  if (!token) {
    return [
      { label: '#general', value: 'C01234567' },
      { label: '#random', value: 'C07654321' },
      { label: '#dev-alerts', value: 'C09999999' },
    ];
  }

  if (fieldId === 'channel' || fieldId === 'channelId') {
    try {
      const response = await axios.get('https://slack.com/api/conversations.list', {
        headers: { Authorization: `Bearer ${token}` },
        params: { types: 'public_channel,private_channel', limit: 100 },
      });

      if (!response.data.ok) {
        throw new Error(response.data.error || 'Slack API error');
      }

      const channels = response.data.channels || [];
      return channels.map((c: any) => ({
        label: `#${c.name}`,
        value: c.id,
        description: c.is_private ? 'Private Channel' : 'Public Channel',
      }));
    } catch {
      return [
        { label: '#general', value: 'C01234567' },
        { label: '#random', value: 'C07654321' },
        { label: '#dev-alerts', value: 'C09999999' },
      ];
    }
  }

  if (fieldId === 'user' || fieldId === 'userId') {
    try {
      const response = await axios.get('https://slack.com/api/users.list', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 },
      });

      if (!response.data.ok) {
        throw new Error(response.data.error || 'Slack API error');
      }

      const members = response.data.members || [];
      return members
        .filter((m: any) => !m.is_bot && !m.deleted)
        .map((m: any) => ({
          label: m.profile?.real_name || m.name,
          value: m.id,
          description: `@${m.name}`,
        }));
    } catch {
      return [];
    }
  }

  return [];
}
