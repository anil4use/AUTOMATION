import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getJiraChoices } from './choices';
import { registerJiraWebhook, refreshJiraWebhook } from './webhook';
import axios from 'axios';

const jiraManifest: ConnectorManifest = {
  id: 'jira',
  name: 'Jira Software',
  description: 'Full-power Jira Software integration — Create, update, transition issues, add comments, manage sprints, search JQL & trigger automations on real-time Jira webhooks.',
  category: 'Project Management',
  icon: '/icons/jira.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'issue_created',
      name: 'Issue Created',
      description: 'Triggers when a new Jira issue is created.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'projectKey', label: 'Project', type: 'string', required: false, dynamicChoice: { endpoint: 'projectKey' } },
      ],
      outputs: [
        { key: 'issueKey', label: 'Issue Key (e.g. PROJ-123)', type: 'string', required: true },
        { key: 'summary', label: 'Summary', type: 'string', required: true },
        { key: 'issueType', label: 'Issue Type', type: 'string', required: true },
        { key: 'reporter', label: 'Reporter Name', type: 'string', required: true },
      ],
    },
    {
      id: 'issue_updated',
      name: 'Issue Updated',
      description: 'Triggers when a Jira issue status or field is updated.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'projectKey', label: 'Project', type: 'string', required: false, dynamicChoice: { endpoint: 'projectKey' } },
      ],
      outputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
        { key: 'status', label: 'Status Name', type: 'string', required: true },
        { key: 'updatedBy', label: 'Updated By', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_issue',
      name: 'Create Issue',
      description: 'Creates a new issue in a Jira project.',
      type: 'action',
      inputs: [
        { key: 'projectKey', label: 'Project', type: 'string', required: true, dynamicChoice: { endpoint: 'projectKey' } },
        { key: 'summary', label: 'Summary', type: 'string', required: true },
        { key: 'issueType', label: 'Issue Type', type: 'string', required: true, dynamicChoice: { endpoint: 'issueType' } },
        { key: 'description', label: 'Description Text', type: 'string', required: false },
        { key: 'assigneeAccountId', label: 'Assignee Account ID', type: 'string', required: false },
      ],
      outputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
        { key: 'issueId', label: 'Issue ID', type: 'string', required: true },
      ],
    },
    {
      id: 'get_issue',
      name: 'Get Issue Details',
      description: 'Fetches details of a specific Jira issue.',
      type: 'action',
      inputs: [
        { key: 'issueKey', label: 'Issue Key (e.g. PROJ-123)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
        { key: 'summary', label: 'Summary', type: 'string', required: true },
        { key: 'status', label: 'Status', type: 'string', required: true },
        { key: 'description', label: 'Description', type: 'string', required: false },
      ],
    },
    {
      id: 'add_comment',
      name: 'Add Comment to Issue',
      description: 'Posts a comment on a Jira issue.',
      type: 'action',
      inputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
        { key: 'comment', label: 'Comment Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'commentId', label: 'Comment ID', type: 'string', required: true },
      ],
    },
    {
      id: 'search_issues_jql',
      name: 'Search Issues (JQL)',
      description: 'Searches issues using Jira Query Language (JQL).',
      type: 'action',
      inputs: [
        { key: 'jql', label: 'JQL Query (e.g. project = MYPROJ AND status = "In Progress")', type: 'string', required: true },
        { key: 'maxResults', label: 'Max Results (Default: 20)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'count', label: 'Count', type: 'number', required: true },
        { key: 'issues', label: 'Issues Array', type: 'array', required: true },
      ],
    },
    {
      id: 'transition_issue',
      name: 'Transition Issue Status',
      description: 'Moves an issue to a new status workflow state.',
      type: 'action',
      inputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
        { key: 'transitionId', label: 'Transition ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
  ],
};

export class JiraConnector extends BaseConnector {
  manifest = jiraManifest;

  async registerWebhook(
    credentials: { apiToken: string; email: string; domain: string },
    webhookUrl: string,
    events?: string[],
    projectKey?: string
  ) {
    return registerJiraWebhook(credentials, webhookUrl, events, projectKey);
  }

  async refreshWebhook(
    credentials: { apiToken: string; email: string; domain: string },
    webhookId: string
  ) {
    return refreshJiraWebhook(credentials, webhookId);
  }

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const { apiToken, email, domain } = credentials || {};

    if (!apiToken || !email || !domain) {
      return { success: false, data: {}, error: 'Jira API Token, email, and domain are required.' };
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const api = axios.create({
      baseURL: `https://${domain}.atlassian.net/rest/api/3`,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    });

    try {
      switch (actionId) {
        case 'create_issue': {
          const body = {
            fields: {
              project: { key: inputs.projectKey },
              summary: inputs.summary,
              issuetype: { name: inputs.issueType },
              description: inputs.description
                ? {
                    type: 'doc',
                    version: 1,
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: inputs.description }] }],
                  }
                : undefined,
              assignee: inputs.assigneeAccountId ? { accountId: inputs.assigneeAccountId } : undefined,
            },
          };

          const { data } = await api.post('/issue', body);
          return { success: true, data: { issueKey: data.key, issueId: data.id } };
        }

        case 'get_issue': {
          const { data } = await api.get(`/issue/${inputs.issueKey}`);
          return {
            success: true,
            data: {
              issueKey: data.key,
              summary: data.fields?.summary,
              status: data.fields?.status?.name,
              description: data.fields?.description?.content?.[0]?.content?.[0]?.text || '',
            },
          };
        }

        case 'add_comment': {
          const body = {
            body: {
              type: 'doc',
              version: 1,
              content: [{ type: 'paragraph', content: [{ type: 'text', text: inputs.comment }] }],
            },
          };
          const { data } = await api.post(`/issue/${inputs.issueKey}/comment`, body);
          return { success: true, data: { commentId: data.id } };
        }

        case 'search_issues_jql': {
          const { data } = await api.get('/search', {
            params: { jql: inputs.jql, maxResults: inputs.maxResults || 20 },
          });
          return { success: true, data: { count: data.issues?.length || 0, issues: data.issues || [] } };
        }

        case 'transition_issue': {
          await api.post(`/issue/${inputs.issueKey}/transitions`, {
            transition: { id: inputs.transitionId },
          });
          return { success: true, data: { success: true } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported Jira action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessages?.join(', ') || err?.message || 'Jira API error';
      return { success: false, data: {}, error: `Jira error: ${msg}` };
    }
  }
}

export const jiraConnector = new JiraConnector();
manifestRegistry.register(jiraManifest);
export { getJiraChoices };
