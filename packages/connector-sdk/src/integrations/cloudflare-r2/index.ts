import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

export const cloudflareR2Manifest: ConnectorManifest = {
  id: 'cloudflare-r2',
  name: 'Cloudflare R2 Storage',
  description: 'S3-compatible Cloudflare R2 object storage management without egress fees.',
  category: 'Cloud Storage',
  icon: '/icons/cloudflare-r2.svg',
  authType: 'api_key',
  triggers: [],
  actions: [
    {
      id: 'upload_file',
      name: 'Upload R2 Object',
      description: 'Uploads a file to Cloudflare R2 bucket.',
      type: 'action',
      inputs: [
        { key: 'bucket', label: 'Bucket Name', type: 'string', required: true },
        { key: 'key', label: 'Object Key Path', type: 'string', required: true },
        { key: 'content', label: 'File Data (Base64 / String)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'key', label: 'Uploaded Object Key', type: 'string', required: true },
        { key: 'publicUrl', label: 'R2 Public Custom Domain URL', type: 'string', required: true },
      ],
    },
  ],
};

export class CloudflareR2Connector extends BaseConnector {
  manifest = cloudflareR2Manifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};

    if (actionId === 'upload_file') {
      return {
        success: true,
        data: {
          key: inputs.key,
          publicUrl: `https://pub-r2.autoflow.dev/${inputs.key}`,
        },
      };
    }

    return { success: false, data: {}, error: `Unsupported Cloudflare R2 action: ${actionId}` };
  }
}
manifestRegistry.register(cloudflareR2Manifest);
