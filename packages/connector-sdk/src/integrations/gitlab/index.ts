import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getGitLabChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const gitlabManifest: ConnectorManifest = {
  id: 'gitlab',
  name: 'GitLab',
  description: 'Full-power GitLab integration — Create issues, merge requests, trigger CI/CD pipelines, list commits & trigger automations on push/MR webhooks.',
  category: 'Developer Tools',
  icon: '/icons/gitlab.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'push_event',
      name: 'Code Push Event',
      description: 'Triggers when new code commits are pushed to a repository branch.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'projectId', label: 'Project', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'projectId' } },
      ],
      outputs: [
        { key: 'ref', label: 'Branch Ref', type: 'string', required: true },
        { key: 'user_name', label: 'Pusher Name', type: 'string', required: true },
        { key: 'total_commits_count', label: 'Commit Count', type: 'number', required: true },
      ],
    },
    {
      id: 'merge_request',
      name: 'Merge Request Event',
      description: 'Triggers when a merge request is opened or updated.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'projectId', label: 'Project', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'projectId' } },
      ],
      outputs: [
        { key: 'iid', label: 'MR IID', type: 'number', required: true },
        { key: 'title', label: 'MR Title', type: 'string', required: true },
        { key: 'state', label: 'MR State', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_issue',
      name: 'Create Project Issue',
      description: 'Opens a new issue in a GitLab project.',
      type: 'action',
      inputSchema: {
        type: 'object',
        required: ['projectId', 'title'],
        properties: {
          projectId:   { type: 'string', title: 'Project',                   description: 'GitLab project ID or namespace/project path', dynamicOptions: { endpoint: 'projectId' } },
          title:       { type: 'string', title: 'Issue Title',               description: 'Short summary of the issue' },
          description: { type: 'string', title: 'Issue Description',         description: 'Full description or body of the issue' },
          labels:      { type: 'string', title: 'Labels (Comma separated)', description: 'Comma-separated label names to attach' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          iid:     { type: 'number', title: 'Issue IID' },
          web_url: { type: 'string', title: 'Issue Web URL' },
        },
      },
      inputs: [
        { key: 'projectId',   label: 'Project',                    type: 'string', required: true,  hasDynamicChoices: true, dynamicChoice: { endpoint: 'projectId' } },
        { key: 'title',       label: 'Issue Title',                type: 'string', required: true  },
        { key: 'description', label: 'Issue Description',          type: 'string', required: false },
        { key: 'labels',      label: 'Labels (Comma separated)',   type: 'string', required: false },
      ],
      outputs: [
        { key: 'iid',     label: 'Issue IID (#12)', type: 'number', required: true },
        { key: 'web_url', label: 'Issue Web URL',   type: 'string', required: true },
      ],
    },
    {
      id: 'trigger_pipeline',
      name: 'Trigger CI/CD Pipeline',
      description: 'Dispatches a new CI/CD pipeline run on a branch.',
      type: 'action',
      inputSchema: {
        type: 'object',
        required: ['projectId', 'ref'],
        properties: {
          projectId: { type: 'string', title: 'Project',                    description: 'GitLab project ID', dynamicOptions: { endpoint: 'projectId' } },
          ref:       { type: 'string', title: 'Branch Name (e.g. main)',    description: 'Git branch or tag to run the pipeline on' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          id:      { type: 'number', title: 'Pipeline ID' },
          status:  { type: 'string', title: 'Pipeline Status' },
          web_url: { type: 'string', title: 'Pipeline Web URL' },
        },
      },
      inputs: [
        { key: 'projectId', label: 'Project',                  type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'projectId' } },
        { key: 'ref',       label: 'Branch Name (e.g. main)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id',      label: 'Pipeline ID',      type: 'number', required: true },
        { key: 'status',  label: 'Status',           type: 'string', required: true },
        { key: 'web_url', label: 'Pipeline Web URL', type: 'string', required: true },
      ],
    },
  ],
};

export class GitLabConnector extends BaseConnector {
  manifest = gitlabManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.personalAccessToken || credentials.accessToken || credentials.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'Missing GitLab Personal Access Token.' };
    }

    const headers = { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json' };

    try {
      if (actionId === 'create_issue') {
        const url = `https://gitlab.com/api/v4/projects/${inputs.projectId}/issues`;
        const body = { title: inputs.title, description: inputs.description || '', labels: inputs.labels };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { iid: res.data.iid, web_url: res.data.web_url } };
      }

      if (actionId === 'trigger_pipeline') {
        const url = `https://gitlab.com/api/v4/projects/${inputs.projectId}/pipeline?ref=${inputs.ref}`;
        const res = await axios.post(url, {}, { headers });
        return { success: true, data: { id: res.data.id, status: res.data.status, web_url: res.data.web_url } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getGitLabChoices(fieldId, credentials);
  }
}

manifestRegistry.register(gitlabManifest);
