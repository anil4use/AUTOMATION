import { githubClient, parseRepo } from '../utils';

export async function executePRAction(
  actionId: string,
  inputs: Record<string, any>,
  credentials: { personalAccessToken: string; username: string }
) {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(inputs.repoName, credentials.username);

  switch (actionId) {
    case 'create_pr': {
      const { data } = await client.post(`/repos/${owner}/${repo}/pulls`, {
        title: inputs.title,
        body: inputs.body || '',
        head: inputs.headBranch,
        base: inputs.baseBranch,
        draft: inputs.draft ?? false,
      });
      return {
        prNumber: data.number,
        htmlUrl: data.html_url,
        state: data.state,
      };
    }

    case 'update_pr': {
      const { data } = await client.patch(
        `/repos/${owner}/${repo}/pulls/${inputs.prNumber}`,
        {
          title: inputs.title || undefined,
          body: inputs.body || undefined,
          state: inputs.state || undefined,
        }
      );
      return {
        prNumber: data.number,
        state: data.state,
        updatedAt: data.updated_at,
      };
    }

    case 'merge_pr': {
      const { data } = await client.put(
        `/repos/${owner}/${repo}/pulls/${inputs.prNumber}/merge`,
        {
          merge_method: inputs.mergeMethod || 'merge',
          commit_title: inputs.commitTitle || undefined,
          commit_message: inputs.commitMessage || undefined,
        }
      );
      return {
        merged: data.merged,
        sha: data.sha,
        message: data.message,
      };
    }

    case 'close_pr': {
      const { data } = await client.patch(
        `/repos/${owner}/${repo}/pulls/${inputs.prNumber}`,
        { state: 'closed' }
      );
      return { state: data.state };
    }

    case 'list_prs': {
      const { data } = await client.get(`/repos/${owner}/${repo}/pulls`, {
        params: {
          state: inputs.state || 'open',
          base: inputs.base || undefined,
          per_page: inputs.perPage || 30,
        },
      });
      return {
        prs: data.map((pr: any) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          author: pr.user.login,
          headBranch: pr.head.ref,
          baseBranch: pr.base.ref,
          htmlUrl: pr.html_url,
          draft: pr.draft,
          createdAt: pr.created_at,
        })),
        count: data.length,
      };
    }

    case 'get_pr': {
      const { data } = await client.get(
        `/repos/${owner}/${repo}/pulls/${inputs.prNumber}`
      );
      return {
        prNumber: data.number,
        title: data.title,
        state: data.state,
        merged: data.merged,
        authorLogin: data.user.login,
        reviewers: data.requested_reviewers?.map((r: any) => r.login) || [],
        commitsCount: data.commits,
        additions: data.additions,
        deletions: data.deletions,
        htmlUrl: data.html_url,
      };
    }

    default:
      throw new Error(`Unknown PR action: ${actionId}`);
  }
}

export async function executeIssueAction(
  actionId: string,
  inputs: Record<string, any>,
  credentials: { personalAccessToken: string; username: string }
) {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(inputs.repoName, credentials.username);

  switch (actionId) {
    case 'create_issue': {
      const { data } = await client.post(`/repos/${owner}/${repo}/issues`, {
        title: inputs.title,
        body: inputs.body || '',
        labels: inputs.labels ? inputs.labels.split(',').map((s: string) => s.trim()) : [],
        assignees: inputs.assignees ? inputs.assignees.split(',').map((s: string) => s.trim()) : [],
        milestone: inputs.milestone || undefined,
      });
      return {
        issueNumber: data.number,
        htmlUrl: data.html_url,
        state: data.state,
        nodeId: data.node_id,
      };
    }

    case 'update_issue': {
      const { data } = await client.patch(
        `/repos/${owner}/${repo}/issues/${inputs.issueNumber}`,
        {
          title: inputs.title || undefined,
          body: inputs.body || undefined,
          state: inputs.state || undefined,
          labels: inputs.labels ? inputs.labels.split(',').map((s: string) => s.trim()) : undefined,
          assignees: inputs.assignees ? inputs.assignees.split(',').map((s: string) => s.trim()) : undefined,
        }
      );
      return {
        issueNumber: data.number,
        state: data.state,
        updatedAt: data.updated_at,
        htmlUrl: data.html_url,
      };
    }

    case 'close_issue': {
      const { data } = await client.patch(
        `/repos/${owner}/${repo}/issues/${inputs.issueNumber}`,
        {
          state: 'closed',
          state_reason: inputs.stateReason || 'completed',
        }
      );
      return {
        issueNumber: data.number,
        state: data.state,
        closedAt: data.closed_at,
      };
    }

    case 'list_issues': {
      const { data } = await client.get(`/repos/${owner}/${repo}/issues`, {
        params: {
          state: inputs.state || 'open',
          labels: inputs.labels || undefined,
          assignee: inputs.assignee || undefined,
          since: inputs.since || undefined,
          per_page: inputs.perPage || 30,
        },
      });
      // GitHub issues endpoint returns PRs too — filter them out
      const issuesOnly = data.filter((i: any) => !i.pull_request);
      return {
        issues: issuesOnly.map((i: any) => ({
          number: i.number,
          title: i.title,
          state: i.state,
          author: i.user.login,
          labels: i.labels?.map((l: any) => l.name) || [],
          htmlUrl: i.html_url,
          createdAt: i.created_at,
        })),
        count: issuesOnly.length,
      };
    }

    case 'get_issue': {
      const { data } = await client.get(
        `/repos/${owner}/${repo}/issues/${inputs.issueNumber}`
      );
      return {
        issueNumber: data.number,
        title: data.title,
        body: data.body || '',
        state: data.state,
        authorLogin: data.user.login,
        labels: data.labels?.map((l: any) => l.name) || [],
        assignees: data.assignees?.map((a: any) => a.login) || [],
        htmlUrl: data.html_url,
        commentsCount: data.comments,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    case 'create_issue_comment': {
      const { data } = await client.post(
        `/repos/${owner}/${repo}/issues/${inputs.issueNumber}/comments`,
        { body: inputs.body }
      );
      return {
        commentId: data.id,
        htmlUrl: data.html_url,
        createdAt: data.created_at,
      };
    }

    case 'list_issue_comments': {
      const { data } = await client.get(
        `/repos/${owner}/${repo}/issues/${inputs.issueNumber}/comments`,
        { params: { per_page: inputs.perPage || 30 } }
      );
      return {
        comments: data.map((c: any) => ({
          id: c.id,
          body: c.body,
          author: c.user.login,
          htmlUrl: c.html_url,
          createdAt: c.created_at,
        })),
        count: data.length,
      };
    }

    default:
      throw new Error(`Unknown issue action: ${actionId}`);
  }
}
