import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getPipedriveChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const pipedriveManifest: ConnectorManifest = {
  id: 'pipedrive',
  name: 'Pipedrive CRM',
  description: 'Full-power Pipedrive integration — Manage persons, organizations, sales deals, activities & trigger automations on real-time Pipedrive webhooks.',
  category: 'CRM & Sales',
  icon: '/icons/pipedrive.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'new_deal',
      name: 'New Deal Created',
      description: 'Triggers when a new deal is added to a Pipedrive pipeline.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'pipelineId', label: 'Pipeline', type: 'string', required: false, hasDynamicChoices: true, dynamicChoice: { endpoint: 'pipelineId' } },
      ],
      outputs: [
        { key: 'id', label: 'Deal ID', type: 'number', required: true },
        { key: 'title', label: 'Deal Title', type: 'string', required: true },
        { key: 'value', label: 'Deal Revenue Value', type: 'number', required: true },
        { key: 'currency', label: 'Currency Code', type: 'string', required: true },
      ],
    },
    {
      id: 'deal_stage_changed',
      name: 'Deal Stage Changed',
      description: 'Triggers when a deal is moved to a new stage.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'stageId', label: 'Target Stage', type: 'string', required: false, hasDynamicChoices: true, dynamicChoice: { endpoint: 'stageId' } },
      ],
      outputs: [
        { key: 'id', label: 'Deal ID', type: 'number', required: true },
        { key: 'title', label: 'Deal Title', type: 'string', required: true },
        { key: 'stage_id', label: 'New Stage ID', type: 'number', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_person',
      name: 'Create Contact Person',
      description: 'Creates a new contact person record.',
      type: 'action',
      inputs: [
        { key: 'name', label: 'Person Full Name', type: 'string', required: true },
        { key: 'email', label: 'Email Address', type: 'string', required: false },
        { key: 'phone', label: 'Phone Number', type: 'string', required: false },
        { key: 'org_id', label: 'Organization ID', type: 'number', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Person ID', type: 'number', required: true },
        { key: 'name', label: 'Full Name', type: 'string', required: true },
      ],
    },
    {
      id: 'create_deal',
      name: 'Create Sales Deal',
      description: 'Creates a new sales deal in a pipeline.',
      type: 'action',
      inputs: [
        { key: 'title', label: 'Deal Title', type: 'string', required: true },
        { key: 'value', label: 'Deal Value Amount', type: 'string', required: true },
        { key: 'currency', label: 'Currency (e.g. USD, EUR)', type: 'string', required: false },
        { key: 'person_id', label: 'Contact Person ID', type: 'number', required: false },
        { key: 'stage_id', label: 'Pipeline Stage', type: 'string', required: false, hasDynamicChoices: true, dynamicChoice: { endpoint: 'stageId' } },
      ],
      outputs: [
        { key: 'id', label: 'Created Deal ID', type: 'number', required: true },
        { key: 'title', label: 'Deal Title', type: 'string', required: true },
      ],
    },
  ],
};

export class PipedriveConnector extends BaseConnector {
  manifest = pipedriveManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.apiToken || credentials.apiKey || credentials.accessToken;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Pipedrive API token.' };
    }

    try {
      if (actionId === 'create_person') {
        const url = `https://api.pipedrive.com/v1/persons?api_token=${token}`;
        const body = { name: inputs.name, email: inputs.email ? [inputs.email] : undefined, phone: inputs.phone ? [inputs.phone] : undefined, org_id: inputs.org_id };
        const res = await axios.post(url, body);
        return { success: true, data: { id: res.data.data.id, name: res.data.data.name } };
      }

      if (actionId === 'create_deal') {
        const url = `https://api.pipedrive.com/v1/deals?api_token=${token}`;
        const body = { title: inputs.title, value: inputs.value, currency: inputs.currency || 'USD', person_id: inputs.person_id, stage_id: inputs.stage_id };
        const res = await axios.post(url, body);
        return { success: true, data: { id: res.data.data.id, title: res.data.data.title } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.error || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>, dependsOnValues?: Record<string, any>) {
    return getPipedriveChoices(fieldId, credentials, dependsOnValues);
  }
}

manifestRegistry.register(pipedriveManifest);
