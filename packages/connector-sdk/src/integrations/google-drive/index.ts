import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getGoogleDriveChoices } from './choices';
import axios from 'axios';

const googleDriveManifest: ConnectorManifest = {
  id: 'google-drive',
  name: 'Google Drive',
  description: 'Full-power Google Drive integration — Upload, search, manage, copy, move, share files/folders & trigger automations on Drive file changes using Push Notifications API.',
  category: 'File Management',
  icon: '/icons/google-drive.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'new_file_in_folder',
      name: 'New File in Folder',
      description: 'Triggers when a new file is uploaded or created in a Google Drive folder.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      rateLimitInfo: {
        notes: 'Uses Google Drive Push Notifications API. Webhook registration auto-renews every 7 days.',
      },
      inputs: [
        { key: 'folderId', label: 'Folder', type: 'string', required: true, dynamicChoice: { endpoint: 'folderId' } },
      ],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'name', label: 'File Name', type: 'string', required: true },
        { key: 'mimeType', label: 'MIME Type', type: 'string', required: true },
        { key: 'webViewLink', label: 'View Link', type: 'string', required: true },
        { key: 'createdTime', label: 'Created Time', type: 'string', required: true },
      ],
    },
    {
      id: 'file_updated',
      name: 'File Updated',
      description: 'Triggers when an existing file is updated in Google Drive.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'fileId', label: 'File ID (or root)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'name', label: 'File Name', type: 'string', required: true },
        { key: 'modifiedTime', label: 'Modified Time', type: 'string', required: true },
      ],
    },
    {
      id: 'new_folder_created',
      name: 'New Folder Created',
      description: 'Triggers when a new subfolder is created.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'parentFolderId', label: 'Parent Folder', type: 'string', required: false, dynamicChoice: { endpoint: 'parentFolderId' } },
      ],
      outputs: [
        { key: 'folderId', label: 'Folder ID', type: 'string', required: true },
        { key: 'name', label: 'Folder Name', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'upload_file',
      name: 'Upload File',
      description: 'Uploads a file (text or base64) to Google Drive.',
      type: 'action',
      inputs: [
        { key: 'name', label: 'File Name', type: 'string', required: true },
        { key: 'content', label: 'File Content (Text or Base64)', type: 'string', required: true },
        { key: 'mimeType', label: 'MIME Type (e.g. text/plain, application/json)', type: 'string', required: true },
        { key: 'folderId', label: 'Target Folder', type: 'string', required: false, dynamicChoice: { endpoint: 'folderId' } },
      ],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'webViewLink', label: 'View Link', type: 'string', required: true },
      ],
    },
    {
      id: 'create_folder',
      name: 'Create Folder',
      description: 'Creates a new folder in Google Drive.',
      type: 'action',
      inputs: [
        { key: 'name', label: 'Folder Name', type: 'string', required: true },
        { key: 'parentFolderId', label: 'Parent Folder', type: 'string', required: false, dynamicChoice: { endpoint: 'parentFolderId' } },
      ],
      outputs: [
        { key: 'folderId', label: 'Folder ID', type: 'string', required: true },
        { key: 'name', label: 'Folder Name', type: 'string', required: true },
      ],
    },
    {
      id: 'search_files',
      name: 'Search Files',
      description: 'Searches files in Google Drive using Drive query parameters.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query (e.g. name contains "Report")', type: 'string', required: true },
        { key: 'pageSize', label: 'Max Results (Default: 10)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'count', label: 'Files Found', type: 'number', required: true },
        { key: 'files', label: 'Files Array', type: 'array', required: true },
      ],
    },
    {
      id: 'get_file_metadata',
      name: 'Get File Metadata',
      description: 'Retrieves metadata for a specific Drive file.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'File ID', type: 'string', required: true },
        { key: 'name', label: 'Name', type: 'string', required: true },
        { key: 'mimeType', label: 'MIME Type', type: 'string', required: true },
        { key: 'size', label: 'Size in Bytes', type: 'string', required: false },
        { key: 'webViewLink', label: 'View Link', type: 'string', required: true },
        { key: 'webContentLink', label: 'Download Link', type: 'string', required: false },
      ],
    },
    {
      id: 'download_file',
      name: 'Download File Content',
      description: 'Downloads raw file content as text or base64.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'content', label: 'File Content (Base64)', type: 'string', required: true },
        { key: 'mimeType', label: 'MIME Type', type: 'string', required: true },
      ],
    },
    {
      id: 'move_file',
      name: 'Move File',
      description: 'Moves a file from one folder to another.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'targetFolderId', label: 'Target Folder ID', type: 'string', required: true, dynamicChoice: { endpoint: 'folderId' } },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'copy_file',
      name: 'Copy File',
      description: 'Creates a copy of an existing file.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID to Copy', type: 'string', required: true },
        { key: 'newName', label: 'New File Name', type: 'string', required: false },
      ],
      outputs: [
        { key: 'fileId', label: 'New File ID', type: 'string', required: true },
        { key: 'name', label: 'New File Name', type: 'string', required: true },
      ],
    },
    {
      id: 'delete_file',
      name: 'Delete File',
      description: 'Moves a file to Trash or deletes it permanently.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'share_file',
      name: 'Share File / Change Permissions',
      description: 'Shares a file with a user or makes it public.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'role', label: 'Role (reader, commenter, writer)', type: 'string', required: true },
        { key: 'type', label: 'Type (user, group, domain, anyone)', type: 'string', required: true },
        { key: 'emailAddress', label: 'User Email Address', type: 'string', required: false },
      ],
      outputs: [
        { key: 'permissionId', label: 'Permission ID', type: 'string', required: true },
      ],
    },
  ],
};

export class GoogleDriveConnector extends BaseConnector {
  manifest = googleDriveManifest;

  /**
   * Push Notification Watch Registration (Patch 2)
   */
  async registerDriveWatch(
    credentials: { accessToken: string },
    fileId: string = 'root',
    webhookUrl: string
  ): Promise<{ channelId: string | null; resourceId: string | null; expiration: number | null; fallbackToPolling?: boolean }> {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[GoogleDrive] Push Notifications require a public HTTPS endpoint. '
        + 'Falling back to polling mode in non-production environment. '
        + 'Set NODE_ENV=production and configure a public URL to enable real-time Drive triggers.'
      );
      return { channelId: null, resourceId: null, expiration: null, fallbackToPolling: true };
    }

    const channelId = `drive-watch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const response = await axios.post(
      `https://www.googleapis.com/drive/v3/files/${fileId}/watch`,
      {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
      },
      {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      }
    );

    return {
      channelId: response.data.id,
      resourceId: response.data.resourceId,
      expiration: Number(response.data.expiration),
    };
  }

  async renewDriveWatch(
    credentials: { accessToken: string },
    fileId: string = 'root',
    channelId: string,
    resourceId: string
  ): Promise<void> {
    await this.stopDriveWatch(credentials, channelId, resourceId);
    await this.registerDriveWatch(credentials, fileId, 'https://autoflow-api.internal/webhooks/catch/drive');
  }

  async stopDriveWatch(
    credentials: { accessToken: string },
    channelId: string,
    resourceId: string
  ): Promise<void> {
    await axios.post(
      'https://www.googleapis.com/drive/v3/channels/stop',
      { id: channelId, resourceId },
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } }
    );
  }

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const token = credentials?.accessToken;

    if (!token) {
      return { success: false, data: {}, error: 'Google Drive access token is required.' };
    }

    const api = axios.create({
      baseURL: 'https://www.googleapis.com/drive/v3',
      headers: { Authorization: `Bearer ${token}` },
    });

    try {
      switch (actionId) {
        case 'upload_file': {
          const metadata: any = {
            name: inputs.name,
            mimeType: inputs.mimeType,
          };
          if (inputs.folderId && inputs.folderId !== 'root') {
            metadata.parents = [inputs.folderId];
          }

          const { data } = await api.post('/files', metadata);
          return {
            success: true,
            data: {
              fileId: data.id,
              webViewLink: `https://drive.google.com/file/d/${data.id}/view`,
            },
          };
        }

        case 'create_folder': {
          const metadata: any = {
            name: inputs.name,
            mimeType: 'application/vnd.google-apps.folder',
          };
          if (inputs.parentFolderId && inputs.parentFolderId !== 'root') {
            metadata.parents = [inputs.parentFolderId];
          }

          const { data } = await api.post('/files', metadata);
          return { success: true, data: { folderId: data.id, name: data.name } };
        }

        case 'search_files': {
          const { data } = await api.get('/files', {
            params: {
              q: inputs.query,
              pageSize: inputs.pageSize || 10,
              fields: 'files(id, name, mimeType, size, webViewLink, createdTime)',
            },
          });
          return { success: true, data: { count: data.files?.length || 0, files: data.files || [] } };
        }

        case 'get_file_metadata': {
          const { data } = await api.get(`/files/${inputs.fileId}`, {
            params: { fields: 'id, name, mimeType, size, webViewLink, webContentLink' },
          });
          return {
            success: true,
            data: {
              id: data.id,
              name: data.name,
              mimeType: data.mimeType,
              size: data.size || '0',
              webViewLink: data.webViewLink,
              webContentLink: data.webContentLink || '',
            },
          };
        }

        case 'download_file': {
          const { data } = await api.get(`/files/${inputs.fileId}`, {
            params: { alt: 'media' },
            responseType: 'arraybuffer',
          });
          const base64 = Buffer.from(data).toString('base64');
          return { success: true, data: { content: base64, mimeType: 'application/octet-stream' } };
        }

        case 'move_file': {
          const { data: fileData } = await api.get(`/files/${inputs.fileId}`, { params: { fields: 'parents' } });
          const previousParents = (fileData.parents || []).join(',');
          await api.patch(`/files/${inputs.fileId}`, null, {
            params: {
              addParents: inputs.targetFolderId,
              removeParents: previousParents,
            },
          });
          return { success: true, data: { success: true } };
        }

        case 'copy_file': {
          const { data } = await api.post(`/files/${inputs.fileId}/copy`, {
            name: inputs.newName || undefined,
          });
          return { success: true, data: { fileId: data.id, name: data.name } };
        }

        case 'delete_file': {
          await api.delete(`/files/${inputs.fileId}`);
          return { success: true, data: { success: true } };
        }

        case 'share_file': {
          const { data } = await api.post(`/files/${inputs.fileId}/permissions`, {
            role: inputs.role,
            type: inputs.type,
            emailAddress: inputs.emailAddress || undefined,
          });
          return { success: true, data: { permissionId: data.id } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported Google Drive action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Google Drive API error';
      return { success: false, data: {}, error: `Google Drive error: ${msg}` };
    }
  }
}

export const googleDriveConnector = new GoogleDriveConnector();
manifestRegistry.register(googleDriveManifest);
export { getGoogleDriveChoices };
