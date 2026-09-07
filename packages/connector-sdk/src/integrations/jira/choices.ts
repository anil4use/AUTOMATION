import axios from 'axios';
import { ChoiceOption } from '@automation/shared-types';

interface JiraCredentials {
  apiToken: string;
  email: string;
  domain: string;
}

export async function getJiraChoices(
  fieldId: string,
  credentials: JiraCredentials
): Promise<ChoiceOption[]> {
  const { apiToken, email, domain } = credentials || {};
  if (!apiToken || !email || !domain) return [];

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const headers = { Authorization: `Basic ${auth}`, Accept: 'application/json' };
  const baseURL = `https://${domain}.atlassian.net/rest/api/3`;

  if (fieldId === 'projectKey' || fieldId === 'project') {
    try {
      const response = await axios.get(`${baseURL}/project`, { headers });
      const projects = response.data || [];
      return projects.map((p: any) => ({
        label: `${p.name} (${p.key})`,
        value: p.key,
        description: `ID: ${p.id}`,
      }));
    } catch {
      return [];
    }
  }

  if (fieldId === 'issueType') {
    try {
      const response = await axios.get(`${baseURL}/issuetype`, { headers });
      const types = response.data || [];
      return types.map((t: any) => ({
        label: t.name,
        value: t.name,
        description: t.description,
      }));
    } catch {
      return [
        { label: 'Task', value: 'Task' },
        { label: 'Bug', value: 'Bug' },
        { label: 'Story', value: 'Story' },
        { label: 'Epic', value: 'Epic' },
      ];
    }
  }

  return [];
}
