import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { manifestRegistry } from '../../core/manifest-registry';
import { githubManifest } from './manifest';
import { executeRepoAction } from './actions/repos';
import {
  executeBranchAction,
  executeFileAction,
  executeCommitAction,
} from './actions/branches-files-commits';
import {
  executePRAction,
  executeIssueAction,
} from './actions/prs-issues';
import {
  executeReleaseAction,
  executeWorkflowAction,
  executeCollaboratorAction,
  executeStatsAction,
} from './actions/releases-workflows-collabs-stats';

/** Routes action IDs to the correct sub-handler based on action prefix/group */
const REPO_ACTIONS = new Set([
  'create_repo', 'update_repo', 'delete_repo', 'list_repos', 'get_repo',
]);
const BRANCH_ACTIONS = new Set([
  'create_branch', 'delete_branch', 'list_branches', 'get_branch',
]);
const FILE_ACTIONS = new Set([
  'create_file', 'update_file', 'delete_file', 'get_file_content', 'list_files',
]);
const COMMIT_ACTIONS = new Set(['get_commit', 'list_commits']);
const PR_ACTIONS = new Set([
  'create_pr', 'update_pr', 'merge_pr', 'close_pr', 'list_prs', 'get_pr',
]);
const ISSUE_ACTIONS = new Set([
  'create_issue', 'update_issue', 'close_issue', 'list_issues', 'get_issue',
  'create_issue_comment', 'list_issue_comments',
]);
const RELEASE_ACTIONS = new Set(['create_release', 'list_releases']);
const WORKFLOW_ACTIONS = new Set(['trigger_workflow', 'get_workflow_run', 'list_workflow_runs']);
const COLLABORATOR_ACTIONS = new Set(['add_collaborator', 'remove_collaborator', 'list_collaborators']);
const STATS_ACTIONS = new Set(['get_traffic_stats']);

export class GitHubConnector extends BaseConnector {
  manifest = githubManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const creds = {
      personalAccessToken: credentials?.personalAccessToken as string,
      username: credentials?.username as string,
    };

    if (!creds.personalAccessToken) {
      return { success: false, data: {}, error: 'GitHub Personal Access Token is required.' };
    }

    const normalizedAction = actionId === 'list_repos' || actionId === 'get_repos' || actionId === 'list_repositories' || actionId === 'get_user_repos'
      ? 'get_repositories'
      : actionId === 'list_issues' || actionId === 'get_issues'
      ? 'list_issues'
      : actionId;

    try {
      let data: Record<string, any>;

      if (REPO_ACTIONS.has(normalizedAction)) {
        data = await executeRepoAction(normalizedAction, inputs, creds);
      } else if (BRANCH_ACTIONS.has(normalizedAction)) {
        data = await executeBranchAction(normalizedAction, inputs, creds);
      } else if (FILE_ACTIONS.has(normalizedAction)) {
        data = await executeFileAction(normalizedAction, inputs, creds);
      } else if (COMMIT_ACTIONS.has(normalizedAction)) {
        data = await executeCommitAction(normalizedAction, inputs, creds);
      } else if (PR_ACTIONS.has(normalizedAction)) {
        data = await executePRAction(normalizedAction, inputs, creds);
      } else if (ISSUE_ACTIONS.has(normalizedAction)) {
        data = await executeIssueAction(normalizedAction, inputs, creds);
      } else if (RELEASE_ACTIONS.has(actionId)) {
        data = await executeReleaseAction(actionId, inputs, creds);
      } else if (WORKFLOW_ACTIONS.has(actionId)) {
        data = await executeWorkflowAction(actionId, inputs, creds);
      } else if (COLLABORATOR_ACTIONS.has(actionId)) {
        data = await executeCollaboratorAction(actionId, inputs, creds);
      } else if (STATS_ACTIONS.has(actionId)) {
        data = await executeStatsAction(actionId, inputs, creds);
      } else {
        return { success: false, data: {}, error: `Unknown GitHub action: ${actionId}` };
      }

      return { success: true, data };
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'GitHub API error';

      if (status === 401) return { success: false, data: {}, error: `GitHub authentication failed. Check your Personal Access Token. (${message})` };
      if (status === 403) return { success: false, data: {}, error: `GitHub permission denied. Your token may lack required scopes. (${message})` };
      if (status === 404) return { success: false, data: {}, error: `GitHub resource not found. Check repository name and access. (${message})` };
      if (status === 422) return { success: false, data: {}, error: `GitHub validation error: ${message}` };
      if (status === 429) return { success: false, data: {}, error: 'GitHub API rate limit exceeded. Try again in a few minutes.' };

      return { success: false, data: {}, error: `GitHub error (${status || 'unknown'}): ${message}` };
    }
  }
}

// ─── Self-Registration ────────────────────────────────────────────────────────
export const githubConnector = new GitHubConnector();
manifestRegistry.register(githubManifest);

// ─── Re-export helpers ────────────────────────────────────────────────────────
export { getGitHubChoices } from './choices';
export { registerGitHubWebhook, deregisterGitHubWebhook, triggerIdToGitHubEvents, matchesGitHubTrigger } from './webhook';
export { githubManifest } from './manifest';

