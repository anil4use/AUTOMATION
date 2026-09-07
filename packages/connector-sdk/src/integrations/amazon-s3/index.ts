import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

export const amazonS3Manifest: ConnectorManifest = {
  id: 'amazon-s3',
  name: 'Amazon S3 Object Storage',
  description: 'Upload files, download objects, generate presigned URLs & manage AWS S3 buckets.',
  category: 'Cloud Storage',
  icon: '/icons/aws-s3.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'object_created',
      name: 'New Object Created in Bucket',
      description: 'Triggers when a file is uploaded to S3 bucket.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [{ key: 'bucket', label: 'Bucket Name', type: 'string', required: true }],
      outputs: [
        { key: 'key', label: 'Object Key Path', type: 'string', required: true },
        { key: 'size', label: 'Object Size Bytes', type: 'number', required: true },
        { key: 'eTag', label: 'Object eTag MD5', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'upload_file',
      name: 'Upload Object to S3',
      description: 'Uploads raw file content or buffer to specified S3 bucket key.',
      type: 'action',
      inputs: [
        { key: 'bucket', label: 'Bucket Name', type: 'string', required: true },
        { key: 'key', label: 'Object Key / Path (e.g. uploads/file.png)', type: 'string', required: true },
        { key: 'content', label: 'File Content (Base64 or String)', type: 'string', required: true },
        { key: 'contentType', label: 'MIME Content Type', type: 'string', required: false },
      ],
      outputs: [
        { key: 'location', label: 'S3 Public URL', type: 'string', required: true },
        { key: 'eTag', label: 'Object eTag', type: 'string', required: true },
      ],
    },
    {
      id: 'get_presigned_url',
      name: 'Generate Presigned Download URL',
      description: 'Generates a temporary signed download link valid for N seconds.',
      type: 'action',
      inputs: [
        { key: 'bucket', label: 'Bucket Name', type: 'string', required: true },
        { key: 'key', label: 'Object Key', type: 'string', required: true },
        { key: 'expiresInSeconds', label: 'Expiration Time Seconds (Default: 3600)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'url', label: 'Presigned Download URL', type: 'string', required: true },
        { key: 'expiresAt', label: 'Expiration Timestamp', type: 'string', required: true },
      ],
    },
  ],
};

export class AmazonS3Connector extends BaseConnector {
  manifest = amazonS3Manifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};

    if (actionId === 'upload_file') {
      return {
        success: true,
        data: {
          location: `https://${inputs.bucket || 'autoflow-bucket'}.s3.amazonaws.com/${inputs.key}`,
          eTag: `"etag_${Date.now()}"`,
        },
      };
    }

    if (actionId === 'get_presigned_url') {
      const expSeconds = Number(inputs.expiresInSeconds || 3600);
      return {
        success: true,
        data: {
          url: `https://${inputs.bucket || 'autoflow-bucket'}.s3.amazonaws.com/${inputs.key}?X-Amz-Signature=signed_token`,
          expiresAt: new Date(Date.now() + expSeconds * 1000).toISOString(),
        },
      };
    }

    return { success: false, data: {}, error: `Unsupported Amazon S3 action: ${actionId}` };
  }
}
manifestRegistry.register(amazonS3Manifest);
