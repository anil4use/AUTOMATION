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
    {
      id: 'file_deleted',
      name: 'File Deleted',
      description: 'Triggers when a file is moved to trash or deleted from Drive.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
      ],
    },
    {
      id: 'file_shared_with_me',
      name: 'File Shared With Me',
      description: 'Triggers when another user shares a file with the authenticated user.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'name', label: 'File Name', type: 'string', required: true },
        { key: 'sharedBy', label: 'Shared By Email', type: 'string', required: true },
      ],
    },
    {
      id: 'new_comment_added',
      name: 'New Comment Added',
      description: 'Triggers when a comment is posted on a Drive file.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'commentId', label: 'Comment ID', type: 'string', required: true },
        { key: 'content', label: 'Comment Text', type: 'string', required: true },
        { key: 'author', label: 'Author Name', type: 'string', required: true },
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
    {
      id: 'create_google_doc',
      name: 'Create Google Doc',
      description: 'Creates a new empty Google Doc document in Drive.',
      type: 'action',
      inputs: [
        { key: 'title', label: 'Document Title', type: 'string', required: true },
        { key: 'folderId', label: 'Parent Folder ID', type: 'string', required: false },
      ],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'webViewLink', label: 'View Link', type: 'string', required: true },
      ],
    },
    {
      id: 'create_google_sheet',
      name: 'Create Google Sheet',
      description: 'Creates a new Google Spreadsheet in Drive.',
      type: 'action',
      inputs: [
        { key: 'title', label: 'Spreadsheet Title', type: 'string', required: true },
        { key: 'folderId', label: 'Parent Folder ID', type: 'string', required: false },
      ],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'webViewLink', label: 'View Link', type: 'string', required: true },
      ],
    },
    {
      id: 'create_google_slides',
      name: 'Create Google Slides',
      description: 'Creates a new Google Slides presentation in Drive.',
      type: 'action',
      inputs: [
        { key: 'title', label: 'Presentation Title', type: 'string', required: true },
        { key: 'folderId', label: 'Parent Folder ID', type: 'string', required: false },
      ],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'webViewLink', label: 'View Link', type: 'string', required: true },
      ],
    },
    {
      id: 'add_file_comment',
      name: 'Add Comment to File',
      description: 'Posts a comment thread on a Drive file.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'content', label: 'Comment Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'commentId', label: 'Comment ID', type: 'string', required: true },
      ],
    },
    {
      id: 'list_file_comments',
      name: 'List Comments on File',
      description: 'Lists all comments posted on a Drive file.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'comments', label: 'Comments Array', type: 'array', required: true },
      ],
    },
    {
      id: 'remove_file_permission',
      name: 'Remove Sharing Permission',
      description: 'Revokes a specific permission from a file.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'permissionId', label: 'Permission ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'list_file_permissions',
      name: 'List File Permissions',
      description: 'Lists all users/groups with permission to access a file.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'permissions', label: 'Permissions Array', type: 'array', required: true },
      ],
    },
    {
      id: 'star_file',
      name: 'Star File',
      description: 'Stars a file in Google Drive.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'unstar_file',
      name: 'Unstar File',
      description: 'Removes star from a file in Google Drive.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'empty_trash',
      name: 'Empty Trash',
      description: 'Permanently deletes all files in user trash.',
      type: 'action',
      inputs: [],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'update_file_content',
      name: 'Update File Content',
      description: 'Overwrites existing file content in Google Drive.',
      type: 'action',
      inputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'content', label: 'New File Content', type: 'string', required: true },
      ],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
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

        case 'create_google_doc': {
          const metadata: any = { name: inputs.title, mimeType: 'application/vnd.google-apps.document' };
          if (inputs.folderId) metadata.parents = [inputs.folderId];
          const { data } = await api.post('/files', metadata);
          return { success: true, data: { fileId: data.id, webViewLink: `https://docs.google.com/document/d/${data.id}/edit` } };
        }

        case 'create_google_sheet': {
          const metadata: any = { name: inputs.title, mimeType: 'application/vnd.google-apps.spreadsheet' };
          if (inputs.folderId) metadata.parents = [inputs.folderId];
          const { data } = await api.post('/files', metadata);
          return { success: true, data: { fileId: data.id, webViewLink: `https://docs.google.com/spreadsheets/d/${data.id}/edit` } };
        }

        case 'create_google_slides': {
          const metadata: any = { name: inputs.title, mimeType: 'application/vnd.google-apps.presentation' };
          if (inputs.folderId) metadata.parents = [inputs.folderId];
          const { data } = await api.post('/files', metadata);
          return { success: true, data: { fileId: data.id, webViewLink: `https://docs.google.com/presentation/d/${data.id}/edit` } };
        }

        case 'add_file_comment': {
          const { data } = await api.post(`/files/${inputs.fileId}/comments`, { content: inputs.content }, { params: { fields: 'id' } });
          return { success: true, data: { commentId: data.id } };
        }

        case 'list_file_comments': {
          const { data } = await api.get(`/files/${inputs.fileId}/comments`, { params: { fields: 'comments(id, content, author)' } });
          return { success: true, data: { comments: data.comments || [] } };
        }

        case 'remove_file_permission': {
          await api.delete(`/files/${inputs.fileId}/permissions/${inputs.permissionId}`);
          return { success: true, data: { success: true } };
        }

        case 'list_file_permissions': {
          const { data } = await api.get(`/files/${inputs.fileId}/permissions`, { params: { fields: 'permissions(id, role, type, emailAddress)' } });
          return { success: true, data: { permissions: data.permissions || [] } };
        }

        case 'star_file': {
          await api.patch(`/files/${inputs.fileId}`, { starred: true });
          return { success: true, data: { success: true } };
        }

        case 'unstar_file': {
          await api.patch(`/files/${inputs.fileId}`, { starred: false });
          return { success: true, data: { success: true } };
        }

        case 'empty_trash': {
          await api.delete('/files/trash');
          return { success: true, data: { success: true } };
        }

        case 'update_file_content': {
          const { data } = await api.patch(`/files/${inputs.fileId}`, inputs.content, { headers: { 'Content-Type': 'text/plain' } });
          return { success: true, data: { fileId: data.id || inputs.fileId } };
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
