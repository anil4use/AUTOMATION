import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getVercelChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const vercelManifest: ConnectorManifest = {
  id: 'vercel',
  name: 'Vercel',
  description: 'Full-power Vercel integration — Trigger deployments, manage project domains, inspect build status & trigger automations on deployment webhooks.',
  category: 'Developer Tools',
  icon: '/icons/vercel.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'deployment_ready',
      name: 'Deployment Ready / Succeeded',
      description: 'Triggers when a Vercel project deployment succeeds.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'projectId', label: 'Project', type: 'string', required: false, hasDynamicChoices: true, dynamicChoice: { endpoint: 'projectId' } },
      ],
      outputs: [
        { key: 'deploymentId', label: 'Deployment ID', type: 'string', required: true },
        { key: 'url', label: 'Deployment Preview URL', type: 'string', required: true },
        { key: 'name', label: 'Project Name', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_deployment',
      name: 'Create Deployment',
      description: 'Triggers a new production deployment build for a project.',
      type: 'action',
      inputs: [
        { key: 'projectId', label: 'Project Name or ID', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'projectId' } },
        { key: 'target', label: 'Target Environment (production or preview)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Deployment ID', type: 'string', required: true },
        { key: 'url', label: 'Deployment Preview URL', type: 'string', required: true },
        { key: 'state', label: 'Deployment State', type: 'string', required: true },
      ],
    },
  ],
};

export class VercelConnector extends BaseConnector {
  manifest = vercelManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.bearerToken || credentials.token || credentials.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Vercel Access Token.' };
    }

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      if (actionId === 'create_deployment') {
        const url = 'https://api.vercel.com/v13/deployments';
        const body = { name: inputs.projectId, target: inputs.target || 'production' };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { id: res.data.id, url: `https://${res.data.url}`, state: res.data.readyState || 'BUILDING' } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.error?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getVercelChoices(fieldId, credentials);
  }
}

manifestRegistry.register(vercelManifest);
