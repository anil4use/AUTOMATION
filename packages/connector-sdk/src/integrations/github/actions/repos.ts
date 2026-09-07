import { githubClient, parseRepo } from '../utils';

export async function executeRepoAction(
  actionId: string,
  inputs: Record<string, any>,
  credentials: { personalAccessToken: string; username: string }
) {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = inputs.repoName
    ? parseRepo(inputs.repoName, credentials.username)
    : { owner: credentials.username, repo: '' };

  switch (actionId) {
    case 'create_repo': {
      const endpoint = inputs.org
        ? `/orgs/${inputs.org}/repos`
        : '/user/repos';
      const { data } = await client.post(endpoint, {
        name: inputs.name,
        description: inputs.description || '',
        private: inputs.private ?? false,
        auto_init: inputs.autoInit ?? false,
        gitignore_template: inputs.gitignoreTemplate || undefined,
      });
      return {
        repoId: data.id,
        fullName: data.full_name,
        htmlUrl: data.html_url,
        cloneUrl: data.clone_url,
        defaultBranch: data.default_branch,
        private: data.private,
      };
    }

    case 'update_repo': {
      const { data } = await client.patch(`/repos/${owner}/${repo}`, {
        name: inputs.newName || undefined,
        description: inputs.description || undefined,
        private: inputs.private ?? undefined,
        default_branch: inputs.defaultBranch || undefined,
        has_issues: inputs.hasIssues ?? undefined,
        has_wiki: inputs.hasWiki ?? undefined,
      });
      return {
        fullName: data.full_name,
        htmlUrl: data.html_url,
        updatedAt: data.updated_at,
      };
    }

    case 'delete_repo': {
      await client.delete(`/repos/${owner}/${repo}`);
      return { deleted: true };
    }

    case 'list_repos': {
      const endpoint = inputs.org
        ? `/orgs/${inputs.org}/repos`
        : '/user/repos';
      const { data } = await client.get(endpoint, {
        params: {
          type: inputs.type || 'all',
          sort: inputs.sort || 'updated',
          per_page: inputs.perPage || 30,
        },
      });
      return {
        repos: data.map((r: any) => ({
          id: r.id,
          fullName: r.full_name,
          htmlUrl: r.html_url,
          private: r.private,
          description: r.description,
          language: r.language,
          stargazersCount: r.stargazers_count,
          updatedAt: r.updated_at,
        })),
        count: data.length,
      };
    }

    case 'get_repo': {
      const { data } = await client.get(`/repos/${owner}/${repo}`);
      return {
        repoId: data.id,
        fullName: data.full_name,
        description: data.description,
        private: data.private,
        htmlUrl: data.html_url,
        stargazersCount: data.stargazers_count,
        forksCount: data.forks_count,
        openIssuesCount: data.open_issues_count,
        defaultBranch: data.default_branch,
        language: data.language,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    default:
      throw new Error(`Unknown repo action: ${actionId}`);
  }
}
