import { githubClient, parseRepo } from './utils';

interface GitHubCredentials {
  personalAccessToken: string;
  username: string;
}

interface RegisterWebhookResult {
  hookId: string;
}

interface DriveWatchResult {
  channelId: string | null;
  resourceId: string | null;
  expiration: number | null;
  fallbackToPolling?: boolean;
}

/**
 * Registers a webhook on a GitHub repository.
 * Called by WorkflowService.publish() when a workflow has a GitHub trigger.
 * Stores the returned hookId in WorkflowModel.triggerState.providerHookId (as string).
 */
export async function registerGitHubWebhook(
  credentials: GitHubCredentials,
  repoFullName: string,
  webhookUrl: string,
  events: string[],
  secret: string
): Promise<RegisterWebhookResult> {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(repoFullName, credentials.username);

  const { data } = await client.post(`/repos/${owner}/${repo}/hooks`, {
    name: 'web',
    active: true,
    events,
    config: {
      url: webhookUrl,
      content_type: 'json',
      secret,
      insecure_ssl: '0',
    },
  });

  return { hookId: String(data.id) };
}

/**
 * Deregisters a webhook from a GitHub repository.
 * Called by WorkflowService.delete() / WorkflowService.disable().
 */
export async function deregisterGitHubWebhook(
  credentials: GitHubCredentials,
  repoFullName: string,
  hookId: string
): Promise<void> {
  const client = githubClient(credentials.personalAccessToken);
  const { owner, repo } = parseRepo(repoFullName, credentials.username);

  try {
    await client.delete(`/repos/${owner}/${repo}/hooks/${hookId}`);
  } catch (err: any) {
    // If the hook is already gone (404), that's fine — goal achieved
    if (err?.response?.status !== 404) throw err;
  }
}

/**
 * Maps AutoFlow trigger IDs to GitHub webhook event names.
 * Used when registering the webhook to set the correct event subscriptions.
 */
export function triggerIdToGitHubEvents(triggerId: string): string[] {
  const map: Record<string, string[]> = {
    new_repo_created:          ['repository'],
    new_commit_pushed:         ['push'],
    new_branch_created:        ['create'],
    new_pr_opened:             ['pull_request'],
    pr_merged:                 ['pull_request'],
    pr_closed:                 ['pull_request'],
    new_issue_created:         ['issues'],
    issue_updated:             ['issues'],
    issue_closed:              ['issues'],
    new_issue_comment:         ['issue_comment'],
    new_pr_comment:            ['pull_request_review_comment'],
    new_release_published:     ['release'],
    workflow_run_completed:    ['workflow_run'],
    new_collaborator_added:    ['member'],
    new_star:                  ['star'],
    new_fork:                  ['fork'],
    deployment_status_changed: ['deployment_status'],
    new_push:                  ['push'],
  };
  return map[triggerId] || ['push'];
}

/**
 * Filters GitHub webhook payload to match the specific trigger type.
 * Called by the universal webhook router to route payloads to the right trigger.
 */
export function matchesGitHubTrigger(
  triggerId: string,
  payload: any,
  githubEvent: string // x-github-event header
): boolean {
  switch (triggerId) {
    case 'new_repo_created':
      return githubEvent === 'repository' && payload.action === 'created';
    case 'new_commit_pushed':
    case 'new_push':
      return githubEvent === 'push';
    case 'new_branch_created':
      return githubEvent === 'create' && payload.ref_type === 'branch';
    case 'new_pr_opened':
      return githubEvent === 'pull_request' && payload.action === 'opened';
    case 'pr_merged':
      return githubEvent === 'pull_request' && payload.action === 'closed' && payload.pull_request?.merged;
    case 'pr_closed':
      return githubEvent === 'pull_request' && payload.action === 'closed' && !payload.pull_request?.merged;
    case 'new_issue_created':
      return githubEvent === 'issues' && payload.action === 'opened';
    case 'issue_updated':
      return githubEvent === 'issues' && ['edited', 'labeled', 'assigned', 'milestoned'].includes(payload.action);
    case 'issue_closed':
      return githubEvent === 'issues' && payload.action === 'closed';
    case 'new_issue_comment':
      return githubEvent === 'issue_comment' && payload.action === 'created' && !payload.issue?.pull_request;
    case 'new_pr_comment':
      return githubEvent === 'pull_request_review_comment' && payload.action === 'created';
    case 'new_release_published':
      return githubEvent === 'release' && payload.action === 'published';
    case 'workflow_run_completed':
      return githubEvent === 'workflow_run' && payload.action === 'completed';
    case 'new_collaborator_added':
      return githubEvent === 'member' && payload.action === 'added';
    case 'new_star':
      return githubEvent === 'star' && payload.action === 'created';
    case 'new_fork':
      return githubEvent === 'fork';
    case 'deployment_status_changed':
      return githubEvent === 'deployment_status';
    default:
      return false;
  }
}
