import { githubClient, parseRepo } from '../utils';

export async function executeReleaseAction(
  actionId: string,
  inputs: Record<string, any>,
  credentials: { personalAccessToken: string; username: string }
) {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(inputs.repoName, credentials.username);

  switch (actionId) {
    case 'create_release': {
      const { data } = await client.post(`/repos/${owner}/${repo}/releases`, {
        tag_name: inputs.tagName,
        name: inputs.releaseName || inputs.tagName,
        body: inputs.body || '',
        draft: inputs.draft ?? false,
        prerelease: inputs.prerelease ?? false,
        target_commitish: inputs.targetCommitish || undefined,
        generate_release_notes: inputs.generateReleaseNotes ?? false,
      });
      return {
        releaseId: data.id,
        htmlUrl: data.html_url,
        tagName: data.tag_name,
        uploadUrl: data.upload_url,
        publishedAt: data.published_at,
      };
    }

    case 'list_releases': {
      const { data } = await client.get(`/repos/${owner}/${repo}/releases`, {
        params: { per_page: inputs.perPage || 30 },
      });
      return {
        releases: data.map((r: any) => ({
          id: r.id,
          tagName: r.tag_name,
          name: r.name,
          draft: r.draft,
          prerelease: r.prerelease,
          publishedAt: r.published_at,
          htmlUrl: r.html_url,
        })),
        count: data.length,
      };
    }

    default:
      throw new Error(`Unknown release action: ${actionId}`);
  }
}

export async function executeWorkflowAction(
  actionId: string,
  inputs: Record<string, any>,
  credentials: { personalAccessToken: string; username: string }
) {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(inputs.repoName, credentials.username);

  switch (actionId) {
    case 'trigger_workflow': {
      await client.post(
        `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(inputs.workflowId)}/dispatches`,
        {
          ref: inputs.ref,
          inputs: inputs.inputs ? (typeof inputs.inputs === 'string' ? JSON.parse(inputs.inputs) : inputs.inputs) : {},
        }
      );
      return { triggered: true, message: `Workflow ${inputs.workflowId} triggered on ${inputs.ref}` };
    }

    case 'get_workflow_run': {
      const { data } = await client.get(
        `/repos/${owner}/${repo}/actions/runs/${inputs.runId}`
      );
      return {
        runId: data.id,
        status: data.status,
        conclusion: data.conclusion,
        workflowName: data.name,
        htmlUrl: data.html_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    case 'list_workflow_runs': {
      const endpoint = inputs.workflowId
        ? `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(inputs.workflowId)}/runs`
        : `/repos/${owner}/${repo}/actions/runs`;
      const { data } = await client.get(endpoint, {
        params: {
          status: inputs.status || undefined,
          branch: inputs.branch || undefined,
          per_page: inputs.perPage || 30,
        },
      });
      return {
        runs: data.workflow_runs.map((r: any) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          conclusion: r.conclusion,
          branch: r.head_branch,
          htmlUrl: r.html_url,
          createdAt: r.created_at,
        })),
        totalCount: data.total_count,
      };
    }

    default:
      throw new Error(`Unknown workflow action: ${actionId}`);
  }
}

export async function executeCollaboratorAction(
  actionId: string,
  inputs: Record<string, any>,
  credentials: { personalAccessToken: string; username: string }
) {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(inputs.repoName, credentials.username);

  switch (actionId) {
    case 'add_collaborator': {
      const { data, status } = await client.put(
        `/repos/${owner}/${repo}/collaborators/${inputs.username}`,
        { permission: inputs.permission || 'push' }
      );
      return {
        invited: status === 201 || status === 204,
        invitationId: data?.id || null,
        permission: inputs.permission || 'push',
      };
    }

    case 'remove_collaborator': {
      await client.delete(`/repos/${owner}/${repo}/collaborators/${inputs.username}`);
      return { removed: true };
    }

    case 'list_collaborators': {
      const { data } = await client.get(`/repos/${owner}/${repo}/collaborators`, {
        params: { permission: inputs.permission || 'all', per_page: 100 },
      });
      return {
        collaborators: data.map((u: any) => ({
          login: u.login,
          avatarUrl: u.avatar_url,
          htmlUrl: u.html_url,
          permissions: u.permissions,
        })),
        count: data.length,
      };
    }

    default:
      throw new Error(`Unknown collaborator action: ${actionId}`);
  }
}

export async function executeStatsAction(
  actionId: string,
  inputs: Record<string, any>,
  credentials: { personalAccessToken: string; username: string }
) {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(inputs.repoName, credentials.username);

  switch (actionId) {
    case 'get_traffic_stats': {
      const [viewsRes, clonesRes] = await Promise.all([
        client.get(`/repos/${owner}/${repo}/traffic/views`, {
          params: { per: inputs.per || 'day' },
        }),
        client.get(`/repos/${owner}/${repo}/traffic/clones`, {
          params: { per: inputs.per || 'day' },
        }).catch(() => ({ data: { count: 0, uniques: 0 } })),
      ]);
      return {
        totalViews: viewsRes.data.count,
        uniqueViews: viewsRes.data.uniques,
        totalClones: clonesRes.data.count,
        uniqueClones: clonesRes.data.uniques,
        views: viewsRes.data.views || [],
      };
    }

    default:
      throw new Error(`Unknown stats action: ${actionId}`);
  }
}
