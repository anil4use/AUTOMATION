import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getFacebookChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const facebookManifest: ConnectorManifest = {
  id: 'facebook',
  name: 'Facebook Pages & Lead Ads',
  description: 'Full-power Facebook integration — Publish page posts, read lead ad submissions, manage page comments & trigger on new Lead Ad form submissions.',
  category: 'Social Media & Marketing',
  icon: '/icons/facebook.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'new_lead',
      name: 'New Lead Ad Form Submission',
      description: 'Triggers when a prospect submits a Facebook Lead Ad form.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'pageId', label: 'Facebook Page', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'pageId' } },
      ],
      outputs: [
        { key: 'leadgen_id', label: 'Leadgen ID', type: 'string', required: true },
        { key: 'form_id', label: 'Form ID', type: 'string', required: true },
        { key: 'created_time', label: 'Submitted Time', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_page_post',
      name: 'Publish Page Post',
      description: 'Posts a message or photo update to your Facebook Page timeline.',
      type: 'action',
      inputs: [
        { key: 'pageId', label: 'Facebook Page', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'pageId' } },
        { key: 'message', label: 'Post Message Content', type: 'string', required: true },
        { key: 'link', label: 'Attached Link URL', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Published Post ID', type: 'string', required: true },
      ],
    },
  ],
};

export class FacebookConnector extends BaseConnector {
  manifest = facebookManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Meta Access Token.' };
    }

    try {
      if (actionId === 'create_page_post') {
        const linkParam = inputs.link ? `&link=${encodeURIComponent(inputs.link)}` : '';
        const url = `https://graph.facebook.com/v19.0/${inputs.pageId}/feed?message=${encodeURIComponent(inputs.message)}${linkParam}&access_token=${token}`;
        const res = await axios.post(url);
        return { success: true, data: { id: res.data.id } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.error?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getFacebookChoices(fieldId, credentials);
  }
}

manifestRegistry.register(facebookManifest);
