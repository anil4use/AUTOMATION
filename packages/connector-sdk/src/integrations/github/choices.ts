import { githubClient, parseRepo } from './utils';
import { ChoiceOption } from '@automation/shared-types';

interface GitHubCredentials {
  personalAccessToken: string;
  username: string;
}

/**
 * Fetches live choices for GitHub dynamic fields.
 * Called by the backend Choices API: GET /api/v1/connectors/github/choices/:fieldId?connectionId=xxx
 */
export async function getGitHubChoices(
  fieldId: string,
  credentials: GitHubCredentials,
  context?: { repoFullName?: string }
): Promise<ChoiceOption[]> {
  const client = githubClient(credentials.personalAccessToken);

  switch (fieldId) {
    case 'repoName': {
      // Fetch all repos for the authenticated user (up to 100)
      const { data } = await client.get('/user/repos', {
        params: { type: 'all', sort: 'updated', per_page: 100 },
      });
      return data.map((r: any): ChoiceOption => ({
        label: r.full_name,
        value: r.full_name,
        description: r.description || (r.private ? '🔒 Private' : '🌐 Public'),
        group: r.fork ? 'Forked' : r.private ? 'Private' : 'Public',
      }));
    }

    case 'branchName': {
      // Requires repoFullName in context
      if (!context?.repoFullName) {
        return [{ label: 'Select a repository first', value: '' }];
      }
      const { owner, repo } = parseRepo(context.repoFullName, credentials.username);
      const { data } = await client.get(`/repos/${owner}/${repo}/branches`, {
        params: { per_page: 100 },
      });
      return data.map((b: any): ChoiceOption => ({
        label: b.name,
        value: b.name,
        description: b.protected ? '🔒 Protected' : undefined,
      }));
    }

    default:
      return [];
  }
}
