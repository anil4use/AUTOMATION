import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getAsanaChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const asanaManifest: ConnectorManifest = {
  id: 'asana',
  name: 'Asana',
  description: 'Full-power Asana integration — Create & assign tasks, update progress, add comments, manage projects & trigger on project task webhooks.',
  category: 'Project Management',
  icon: '/icons/asana.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'task_created',
      name: 'Task Created',
      description: 'Triggers when a new task is created in a project.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'projectId', label: 'Project', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'projectId' } },
      ],
      outputs: [
        { key: 'gid', label: 'Task GID', type: 'string', required: true },
        { key: 'name', label: 'Task Name', type: 'string', required: true },
        { key: 'created_at', label: 'Creation Time', type: 'string', required: true },
      ],
    },
    {
      id: 'task_completed',
      name: 'Task Completed',
      description: 'Triggers when a task status changes to completed.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'projectId', label: 'Project', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'projectId' } },
      ],
      outputs: [
        { key: 'gid', label: 'Task GID', type: 'string', required: true },
        { key: 'name', label: 'Task Name', type: 'string', required: true },
        { key: 'completed_at', label: 'Completion Time', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_task',
      name: 'Create Task',
      description: 'Creates a new task in an Asana project.',
      type: 'action',
      inputs: [
        { key: 'workspaceId', label: 'Workspace', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'workspaceId' } },
        { key: 'projectId', label: 'Project', type: 'string', required: false, hasDynamicChoices: true, dependsOn: 'workspaceId', dynamicChoice: { endpoint: 'projectId' } },
        { key: 'name', label: 'Task Name', type: 'string', required: true },
        { key: 'notes', label: 'Task Notes / Description', type: 'string', required: false },
        { key: 'due_on', label: 'Due Date (YYYY-MM-DD)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'gid', label: 'Task GID', type: 'string', required: true },
        { key: 'permalink_url', label: 'Task Web URL', type: 'string', required: true },
      ],
    },
    {
      id: 'complete_task',
      name: 'Complete Task',
      description: 'Marks an existing task as completed.',
      type: 'action',
      inputs: [
        { key: 'taskGid', label: 'Task GID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'gid', label: 'Task GID', type: 'string', required: true },
        { key: 'completed', label: 'Completed Boolean', type: 'boolean', required: true },
      ],
    },
  ],
};

export class AsanaConnector extends BaseConnector {
  manifest = asanaManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey || credentials.token;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Asana access token.' };
    }

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      if (actionId === 'create_task') {
        const url = 'https://app.asana.com/api/1.0/tasks';
        const projects = inputs.projectId ? [inputs.projectId] : undefined;
        const body = {
          data: {
            workspace: inputs.workspaceId,
            projects,
            name: inputs.name,
            notes: inputs.notes || '',
            due_on: inputs.due_on,
          },
        };
        const res = await axios.post(url, body, { headers });
        const data = res.data?.data || {};
        return { success: true, data: { gid: data.gid, permalink_url: data.permalink_url } };
      }

      if (actionId === 'complete_task') {
        const url = `https://app.asana.com/api/1.0/tasks/${inputs.taskGid}`;
        const body = { data: { completed: true } };
        const res = await axios.put(url, body, { headers });
        const data = res.data?.data || {};
        return { success: true, data: { gid: data.gid, completed: data.completed } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.errors?.[0]?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>, dependsOnValues?: Record<string, any>) {
    return getAsanaChoices(fieldId, credentials, dependsOnValues);
  }
}

manifestRegistry.register(asanaManifest);
