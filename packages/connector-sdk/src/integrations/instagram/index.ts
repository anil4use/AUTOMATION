import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getInstagramChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const instagramManifest: ConnectorManifest = {
  id: 'instagram',
  name: 'Instagram Graph API',
  description: 'Full-power Instagram integration — Publish posts & reels, fetch comments, reply to user comments & trigger on user mentions or new comments.',
  category: 'Social Media & Marketing',
  icon: '/icons/instagram.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'new_comment',
      name: 'New Post Comment',
      description: 'Triggers when a user comments on your Instagram media post.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'comment_id', label: 'Comment ID', type: 'string', required: true },
        { key: 'text', label: 'Comment Text', type: 'string', required: true },
        { key: 'username', label: 'Commenter Username', type: 'string', required: true },
        { key: 'media_id', label: 'Post Media ID', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'publish_photo',
      name: 'Publish Image Post',
      description: 'Publishes a photo post to your Instagram Business account.',
      type: 'action',
      inputs: [
        { key: 'instagram_account_id', label: 'Instagram Business Account ID', type: 'string', required: true },
        { key: 'image_url', label: 'Public Image URL', type: 'string', required: true },
        { key: 'caption', label: 'Post Caption & Hashtags', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Published Media ID', type: 'string', required: true },
      ],
    },
    {
      id: 'reply_to_comment',
      name: 'Reply to Comment',
      description: 'Replies directly to a user comment on a post.',
      type: 'action',
      inputs: [
        { key: 'comment_id', label: 'Comment ID', type: 'string', required: true },
        { key: 'message', label: 'Reply Message Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Reply Comment ID', type: 'string', required: true },
      ],
    },
  ],
};

export class InstagramConnector extends BaseConnector {
  manifest = instagramManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Meta Access Token for Instagram.' };
    }

    try {
      if (actionId === 'publish_photo') {
        const createUrl = `https://graph.facebook.com/v19.0/${inputs.instagram_account_id}/media?image_url=${encodeURIComponent(inputs.image_url)}&caption=${encodeURIComponent(inputs.caption || '')}&access_token=${token}`;
        const containerRes = await axios.post(createUrl);
        const creationId = containerRes.data.id;

        const publishUrl = `https://graph.facebook.com/v19.0/${inputs.instagram_account_id}/media_publish?creation_id=${creationId}&access_token=${token}`;
        const pubRes = await axios.post(publishUrl);
        return { success: true, data: { id: pubRes.data.id } };
      }

      if (actionId === 'reply_to_comment') {
        const url = `https://graph.facebook.com/v19.0/${inputs.comment_id}/replies?message=${encodeURIComponent(inputs.message)}&access_token=${token}`;
        const res = await axios.post(url);
        return { success: true, data: { id: res.data.id } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.error?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getInstagramChoices(fieldId, credentials);
  }
}

manifestRegistry.register(instagramManifest);
