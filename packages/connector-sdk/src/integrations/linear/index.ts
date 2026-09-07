import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getLinearChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const linearManifest: ConnectorManifest = {
  id: 'linear',
  name: 'Linear',
  description: 'Full-power Linear integration — Create issues, update issue status, assign members, attach PR links & trigger on issue state webhooks.',
  category: 'Developer Tools',
  icon: '/icons/linear.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'issue_created',
      name: 'Issue Created',
      description: 'Triggers when a new issue is logged in Linear.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'teamId', label: 'Team', type: 'string', required: false, hasDynamicChoices: true, dynamicChoice: { endpoint: 'teamId' } },
      ],
      outputs: [
        { key: 'id', label: 'Issue ID', type: 'string', required: true },
        { key: 'identifier', label: 'Issue Key (e.g. ENG-123)', type: 'string', required: true },
        { key: 'title', label: 'Issue Title', type: 'string', required: true },
        { key: 'url', label: 'Issue Web URL', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_issue',
      name: 'Create Issue',
      description: 'Creates a new issue for a Linear team.',
      type: 'action',
      inputs: [
        { key: 'teamId', label: 'Team', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'teamId' } },
        { key: 'title', label: 'Issue Title', type: 'string', required: true },
        { key: 'description', label: 'Issue Description (Markdown)', type: 'string', required: false },
        { key: 'priority', label: 'Priority (0: No priority, 1: Urgent, 2: High, 3: Medium, 4: Low)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Issue ID', type: 'string', required: true },
        { key: 'identifier', label: 'Issue Key', type: 'string', required: true },
        { key: 'url', label: 'Issue Web URL', type: 'string', required: true },
      ],
    },
  ],
};

export class LinearConnector extends BaseConnector {
  manifest = linearManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.apiKey || credentials.accessToken;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Linear API key.' };
    }

    const headers = { Authorization: token, 'Content-Type': 'application/json' };

    try {
      if (actionId === 'create_issue') {
        const query = `
          mutation CreateIssue($teamId: String!, $title: String!, $description: String, $priority: Int) {
            issueCreate(input: { teamId: $teamId, title: $title, description: $description, priority: $priority }) {
              success
              issue { id identifier title url }
            }
          }
        `;
        const variables = {
          teamId: inputs.teamId,
          title: inputs.title,
          description: inputs.description || '',
          priority: inputs.priority ? Number(inputs.priority) : 0,
        };
        const res = await axios.post('https://api.linear.app/graphql', { query, variables }, { headers });
        const issue = res.data?.data?.issueCreate?.issue || {};
        return { success: true, data: { id: issue.id, identifier: issue.identifier, url: issue.url } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.errors?.[0]?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getLinearChoices(fieldId, credentials);
  }
}

manifestRegistry.register(linearManifest);
