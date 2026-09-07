import { githubClient, parseRepo, encodeFileContent, decodeFileContent } from '../utils';

export async function executeBranchAction(
  actionId: string,
  inputs: Record<string, any>,
  credentials: { personalAccessToken: string; username: string }
) {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(inputs.repoName, credentials.username);

  switch (actionId) {
    case 'create_branch': {
      // Resolve the base SHA — if fromBranch looks like a SHA (40 hex chars), use it directly
      let sha = inputs.fromBranch;
      if (!/^[0-9a-f]{40}$/i.test(sha)) {
        const { data: branchData } = await client.get(
          `/repos/${owner}/${repo}/branches/${encodeURIComponent(inputs.fromBranch)}`
        );
        sha = branchData.commit.sha;
      }
      const { data } = await client.post(`/repos/${owner}/${repo}/git/refs`, {
        ref: `refs/heads/${inputs.branchName}`,
        sha,
      });
      return {
        branchName: inputs.branchName,
        sha: data.object.sha,
        ref: data.ref,
      };
    }

    case 'delete_branch': {
      await client.delete(
        `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(inputs.branchName)}`
      );
      return { deleted: true };
    }

    case 'list_branches': {
      const { data } = await client.get(`/repos/${owner}/${repo}/branches`, {
        params: { per_page: inputs.perPage || 100 },
      });
      return {
        branches: data.map((b: any) => ({
          name: b.name,
          sha: b.commit.sha,
          protected: b.protected,
        })),
        count: data.length,
      };
    }

    case 'get_branch': {
      const { data } = await client.get(
        `/repos/${owner}/${repo}/branches/${encodeURIComponent(inputs.branchName)}`
      );
      return {
        name: data.name,
        sha: data.commit.sha,
        commitMessage: data.commit.commit.message,
        protected: data.protected,
      };
    }

    default:
      throw new Error(`Unknown branch action: ${actionId}`);
  }
}

export async function executeFileAction(
  actionId: string,
  inputs: Record<string, any>,
  credentials: { personalAccessToken: string; username: string }
) {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(inputs.repoName, credentials.username);
  const path = encodeURIComponent(inputs.filePath || inputs.dirPath || '').replace(/%2F/g, '/');

  switch (actionId) {
    case 'create_file': {
      const { data } = await client.put(`/repos/${owner}/${repo}/contents/${path}`, {
        message: inputs.commitMessage,
        content: encodeFileContent(inputs.content),
        branch: inputs.branch || undefined,
      });
      return {
        sha: data.content.sha,
        htmlUrl: data.content.html_url,
        commitSha: data.commit.sha,
      };
    }

    case 'update_file': {
      const { data } = await client.put(`/repos/${owner}/${repo}/contents/${path}`, {
        message: inputs.commitMessage,
        content: encodeFileContent(inputs.content),
        sha: inputs.sha,
        branch: inputs.branch || undefined,
      });
      return {
        sha: data.content.sha,
        commitSha: data.commit.sha,
        htmlUrl: data.content.html_url,
      };
    }

    case 'delete_file': {
      const { data } = await client.delete(`/repos/${owner}/${repo}/contents/${path}`, {
        data: {
          message: inputs.commitMessage,
          sha: inputs.sha,
          branch: inputs.branch || undefined,
        },
      });
      return { commitSha: data.commit.sha };
    }

    case 'get_file_content': {
      const { data } = await client.get(`/repos/${owner}/${repo}/contents/${path}`, {
        params: { ref: inputs.branch || undefined },
      });
      return {
        content: decodeFileContent(data.content),
        sha: data.sha,
        size: data.size,
        htmlUrl: data.html_url,
        downloadUrl: data.download_url,
      };
    }

    case 'list_files': {
      const dirPath = (inputs.dirPath || '').replace(/^\//, '');
      const { data } = await client.get(`/repos/${owner}/${repo}/contents/${dirPath}`, {
        params: { ref: inputs.branch || undefined },
      });
      const files = Array.isArray(data) ? data : [data];
      return {
        files: files.map((f: any) => ({
          name: f.name,
          path: f.path,
          type: f.type,
          size: f.size,
          sha: f.sha,
          htmlUrl: f.html_url,
        })),
        count: files.length,
      };
    }

    default:
      throw new Error(`Unknown file action: ${actionId}`);
  }
}

export async function executeCommitAction(
  actionId: string,
  inputs: Record<string, any>,
  credentials: { personalAccessToken: string; username: string }
) {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(inputs.repoName, credentials.username);

  switch (actionId) {
    case 'get_commit': {
      const { data } = await client.get(
        `/repos/${owner}/${repo}/commits/${inputs.commitSha}`
      );
      return {
        sha: data.sha,
        message: data.commit.message,
        authorName: data.commit.author.name,
        authorEmail: data.commit.author.email,
        htmlUrl: data.html_url,
        filesChanged: data.files?.map((f: any) => f.filename) || [],
        additions: data.stats?.additions || 0,
        deletions: data.stats?.deletions || 0,
      };
    }

    case 'list_commits': {
      const { data } = await client.get(`/repos/${owner}/${repo}/commits`, {
        params: {
          sha: inputs.branch || undefined,
          author: inputs.author || undefined,
          path: inputs.path || undefined,
          per_page: inputs.perPage || 30,
        },
      });
      return {
        commits: data.map((c: any) => ({
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author.name,
          date: c.commit.author.date,
          htmlUrl: c.html_url,
        })),
        count: data.length,
      };
    }

    default:
      throw new Error(`Unknown commit action: ${actionId}`);
  }
}
