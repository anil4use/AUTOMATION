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
    {
      id: 'issue_deleted',
      name: 'Issue Deleted',
      description: 'Triggers when a Jira issue is deleted.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'projectKey', label: 'Project', type: 'string', required: false },
      ],
      outputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
      ],
    },
    {
      id: 'comment_added',
      name: 'Comment Added',
      description: 'Triggers when a comment is posted on an issue.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: false },
      ],
      outputs: [
        { key: 'commentId', label: 'Comment ID', type: 'string', required: true },
        { key: 'body', label: 'Comment Body', type: 'string', required: true },
      ],
    },
    {
      id: 'project_created',
      name: 'Project Created',
      description: 'Triggers when a new project is created in Jira.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'projectKey', label: 'Project Key', type: 'string', required: true },
        { key: 'projectName', label: 'Project Name', type: 'string', required: true },
      ],
    },
    {
      id: 'issue_assigned',
      name: 'Issue Assigned',
      description: 'Triggers when an issue is assigned to a user.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
        { key: 'assigneeAccountId', label: 'Assignee Account ID', type: 'string', required: true },
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
    {
      id: 'delete_issue',
      name: 'Delete Issue',
      description: 'Deletes a Jira issue.',
      type: 'action',
      inputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'assign_issue',
      name: 'Assign Issue',
      description: 'Assigns an issue to a specific user account.',
      type: 'action',
      inputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
        { key: 'accountId', label: 'User Account ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'update_issue',
      name: 'Update Issue Summary',
      description: 'Updates summary or description of an issue.',
      type: 'action',
      inputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
        { key: 'summary', label: 'New Summary', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'link_issues',
      name: 'Link Issues',
      description: 'Creates a link between two Jira issues.',
      type: 'action',
      inputs: [
        { key: 'inwardIssueKey', label: 'Inward Issue Key', type: 'string', required: true },
        { key: 'outwardIssueKey', label: 'Outward Issue Key', type: 'string', required: true },
        { key: 'linkType', label: 'Link Type (e.g. Relates)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'get_project',
      name: 'Get Project Details',
      description: 'Fetches metadata of a Jira project.',
      type: 'action',
      inputs: [
        { key: 'projectKey', label: 'Project Key', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Project ID', type: 'string', required: true },
        { key: 'name', label: 'Project Name', type: 'string', required: true },
      ],
    },
    {
      id: 'list_projects',
      name: 'List Projects',
      description: 'Lists all accessible projects in Jira.',
      type: 'action',
      inputs: [],
      outputs: [
        { key: 'projects', label: 'Projects Array', type: 'array', required: true },
      ],
    },
    {
      id: 'create_component',
      name: 'Create Component',
      description: 'Creates a component in a project.',
      type: 'action',
      inputs: [
        { key: 'projectKey', label: 'Project Key', type: 'string', required: true },
        { key: 'name', label: 'Component Name', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Component ID', type: 'string', required: true },
      ],
    },
    {
      id: 'create_version',
      name: 'Create Version',
      description: 'Creates a version release in a project.',
      type: 'action',
      inputs: [
        { key: 'projectKey', label: 'Project Key', type: 'string', required: true },
        { key: 'name', label: 'Version Name', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Version ID', type: 'string', required: true },
      ],
    },
    {
      id: 'add_attachment',
      name: 'Add Attachment',
      description: 'Attaches text or file content to an issue.',
      type: 'action',
      inputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
        { key: 'filename', label: 'File Name', type: 'string', required: true },
        { key: 'content', label: 'File Content', type: 'string', required: true },
      ],
      outputs: [
        { key: 'attachmentId', label: 'Attachment ID', type: 'string', required: true },
      ],
    },
    {
      id: 'get_issue_comments',
      name: 'Get Issue Comments',
      description: 'Gets all comments on an issue.',
      type: 'action',
      inputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
      ],
      outputs: [
        { key: 'comments', label: 'Comments Array', type: 'array', required: true },
      ],
    },
    {
      id: 'worklog_add',
      name: 'Log Work Time',
      description: 'Logs time spent working on an issue.',
      type: 'action',
      inputs: [
        { key: 'issueKey', label: 'Issue Key', type: 'string', required: true },
        { key: 'timeSpent', label: 'Time Spent (e.g. 2h 30m)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'worklogId', label: 'Worklog ID', type: 'string', required: true },
      ],
    },
    {
      id: 'get_user_myself',
      name: 'Get Current User Profile',
      description: 'Gets profile of authenticated Jira user.',
      type: 'action',
      inputs: [],
      outputs: [
        { key: 'accountId', label: 'Account ID', type: 'string', required: true },
        { key: 'displayName', label: 'Display Name', type: 'string', required: true },
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

        case 'delete_issue': {
          await api.delete(`/issue/${inputs.issueKey}`);
          return { success: true, data: { success: true } };
        }

        case 'assign_issue': {
          await api.put(`/issue/${inputs.issueKey}/assignee`, { accountId: inputs.accountId });
          return { success: true, data: { success: true } };
        }

        case 'update_issue': {
          await api.put(`/issue/${inputs.issueKey}`, { fields: { summary: inputs.summary } });
          return { success: true, data: { success: true } };
        }

        case 'link_issues': {
          await api.post('/issueLink', {
            type: { name: inputs.linkType },
            inwardIssue: { key: inputs.inwardIssueKey },
            outwardIssue: { key: inputs.outwardIssueKey },
          });
          return { success: true, data: { success: true } };
        }

        case 'get_project': {
          const { data } = await api.get(`/project/${inputs.projectKey}`);
          return { success: true, data: { id: data.id, name: data.name } };
        }

        case 'list_projects': {
          const { data } = await api.get('/project');
          return { success: true, data: { projects: data || [] } };
        }

        case 'create_component': {
          const { data } = await api.post('/component', { project: inputs.projectKey, name: inputs.name });
          return { success: true, data: { id: data.id } };
        }

        case 'create_version': {
          const { data } = await api.post('/version', { project: inputs.projectKey, name: inputs.name });
          return { success: true, data: { id: data.id } };
        }

        case 'add_attachment': {
          const formData = new (require('form-data'))();
          formData.append('file', Buffer.from(inputs.content), inputs.filename);
          const { data } = await api.post(`/issue/${inputs.issueKey}/attachments`, formData, {
            headers: { ...formData.getHeaders(), 'X-Atlassian-Token': 'no-check' },
          });
          return { success: true, data: { attachmentId: data[0]?.id } };
        }

        case 'get_issue_comments': {
          const { data } = await api.get(`/issue/${inputs.issueKey}/comment`);
          return { success: true, data: { comments: data.comments || [] } };
        }

        case 'worklog_add': {
          const { data } = await api.post(`/issue/${inputs.issueKey}/worklog`, { timeSpent: inputs.timeSpent });
          return { success: true, data: { worklogId: data.id } };
        }

        case 'get_user_myself': {
          const { data } = await api.get('/myself');
          return { success: true, data: { accountId: data.accountId, displayName: data.displayName } };
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
