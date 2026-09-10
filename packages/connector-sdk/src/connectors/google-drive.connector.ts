import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class GoogleDriveConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Real Google Drive integration — Upload files, create folders, search files, and manage Drive storage.',
    category: 'Storage',
    icon: '/icons/google-drive.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_file',
        name: 'New File Created',
        description: 'Triggers when a new file or document is created in your Google Drive.',
        type: 'trigger',
        inputs: [{ key: 'query', label: 'Search Query (Optional)', type: 'string', required: false }],
        outputs: [
          { key: 'fileId', label: 'File ID', type: 'string', required: true },
          { key: 'fileName', label: 'File Name', type: 'string', required: true },
          { key: 'mimeType', label: 'MIME Type', type: 'string', required: true },
          { key: 'webViewLink', label: 'Google Drive Link', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'upload_file',
        name: 'Create / Upload File',
        description: 'Uploads text or document content to your Google Drive.',
        type: 'action',
        inputs: [
          { key: 'fileName', label: 'File Name (e.g. Report.txt)', type: 'string', required: true },
          { key: 'content', label: 'File Content (Text or Base64)', type: 'string', required: true },
          { key: 'folderId', label: 'Parent Folder ID (Optional)', type: 'string', required: false },
          { key: 'mimeType', label: 'MIME Type (Default: text/plain)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'fileId', label: 'File ID', type: 'string', required: true },
          { key: 'fileName', label: 'File Name', type: 'string', required: true },
          { key: 'webViewLink', label: 'Google Drive Link', type: 'string', required: true },
        ],
      },
      {
        id: 'create_folder',
        name: 'Create Folder',
        description: 'Creates a new directory folder in your Google Drive.',
        type: 'action',
        inputs: [
          { key: 'folderName', label: 'Folder Name', type: 'string', required: true },
          { key: 'parentFolderId', label: 'Parent Folder ID (Optional)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'folderId', label: 'Folder ID', type: 'string', required: true },
          { key: 'folderName', label: 'Folder Name', type: 'string', required: true },
          { key: 'webViewLink', label: 'Folder Link', type: 'string', required: true },
        ],
      },
      {
        id: 'list_files',
        name: 'Search & List Files',
        description: 'Searches and lists files in your Google Drive storage.',
        type: 'action',
        inputs: [
          { key: 'query', label: 'Search Query (e.g. name contains "Invoice")', type: 'string', required: false },
          { key: 'pageSize', label: 'Max Files to Return (Default: 10)', type: 'number', required: false },
        ],
        outputs: [
          { key: 'count', label: 'File Count', type: 'number', required: true },
          { key: 'files', label: 'Files List', type: 'array', required: true },
        ],
      },
      {
        id: 'delete_file',
        name: 'Delete File',
        description: 'Deletes a file or folder from your Google Drive.',
        type: 'action',
        inputs: [
          { key: 'fileId', label: 'File ID to Delete', type: 'string', required: true },
        ],
        outputs: [
          { key: 'fileId', label: 'File ID', type: 'string', required: true },
          { key: 'status', label: 'Status', type: 'string', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const creds = context.connectionCredentials || {};
    const accessToken = creds.accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    const userEmail = creds.userEmail || creds.email || 'me';

    const token = this.requireAccessToken(accessToken, userEmail);

    // 1. Action: UPLOAD FILE
    if (actionId === 'upload_file') {
      const fileName = context.stepInput.fileName || context.stepInput.name || context.stepInput.title || 'AutoFlow_Export.txt';
      const content = context.stepInput.content || '';
      const mimeType = context.stepInput.mimeType || 'text/plain';
      const folderId = context.stepInput.folderId;

      const metadata: any = { name: fileName, mimeType };
      if (folderId) metadata.parents = [folderId];

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        closeDelimiter;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      const data: any = await res.json();
      if (!res.ok) throw new Error(`Google Drive Upload Error (${res.status}): ${data.error?.message || res.statusText}`);

      return {
        success: true,
        data: {
          fileId: data.id,
          fileName: data.name,
          mimeType: data.mimeType,
          webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}`,
        },
      };
    }

    // 2. Action: CREATE FOLDER
    if (actionId === 'create_folder') {
      const folderName = context.stepInput.folderName || context.stepInput.name || context.stepInput.title || 'AutoFlow Folder';

      const metadata: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (context.stepInput.parentFolderId) {
        metadata.parents = [context.stepInput.parentFolderId];
      }

      const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      const data: any = await res.json();
      if (!res.ok) throw new Error(`Google Drive Create Folder Error (${res.status}): ${data.error?.message || res.statusText}`);

      return {
        success: true,
        data: {
          folderId: data.id,
          folderName: data.name,
          webViewLink: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
        },
      };
    }

    // 3. Action: LIST / SEARCH FILES
    if (actionId === 'list_files') {
      const q = context.stepInput.query ? `trashed = false and ${context.stepInput.query}` : 'trashed = false';
      const pageSize = Number(context.stepInput.pageSize) || 10;

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${pageSize}&fields=files(id,name,mimeType,webViewLink,createdTime,size)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data: any = await res.json();
      if (!res.ok) throw new Error(`Google Drive Search Error (${res.status}): ${data.error?.message || res.statusText}`);

      const files = data.files || [];
      return {
        success: true,
        data: {
          count: files.length,
          files,
        },
      };
    }

    // 4. Action: DELETE FILE
    if (actionId === 'delete_file') {
      const fileId = context.stepInput.fileId;
      if (!fileId) throw new Error('Google Drive Delete error: "fileId" is required.');

      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok && res.status !== 204) {
        const data: any = await res.json().catch(() => ({}));
        throw new Error(`Google Drive Delete Error (${res.status}): ${data.error?.message || res.statusText}`);
      }

      return {
        success: true,
        data: {
          fileId,
          status: 'deleted',
        },
      };
    }

    throw new Error(`Unsupported Google Drive action: ${actionId}`);
  }

  private requireAccessToken(accessToken: string | undefined, userEmail: string): string {
    if (!accessToken || accessToken.startsWith('default_') || accessToken.startsWith('access_token_')) {
      throw new Error(
        `Google Drive API Error: Account "${userEmail}" is not authenticated with real Google OAuth. Please go to Connectors page and click "Connect Google Drive" to log in with your Google account.`
      );
    }
    return accessToken;
  }
}
