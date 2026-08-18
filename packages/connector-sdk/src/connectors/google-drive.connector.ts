import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class GoogleDriveConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Upload files, create folders, and manage Drive storage.',
    category: 'Storage',
    icon: '/icons/google-drive.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_file',
        name: 'New File Created',
        description: 'Triggers when a new file is uploaded to a specified folder.',
        type: 'trigger',
        inputs: [{ key: 'folderId', label: 'Folder ID', type: 'string', required: true }],
        outputs: [
          { key: 'fileId', label: 'File ID', type: 'string', required: true },
          { key: 'fileName', label: 'File Name', type: 'string', required: true },
          { key: 'fileUrl', label: 'File URL', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Uploads a file payload to Google Drive folder.',
        type: 'action',
        inputs: [
          { key: 'fileName', label: 'File Name', type: 'string', required: true },
          { key: 'fileUrl', label: 'File URL', type: 'string', required: true },
        ],
        outputs: [
          { key: 'fileId', label: 'File ID', type: 'string', required: true },
          { key: 'webViewLink', label: 'Web View Link', type: 'string', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    return {
      success: true,
      data: {
        fileId: `drive_file_${Date.now()}`,
        fileName: context.stepInput.fileName || 'uploaded_document.pdf',
        webViewLink: `https://drive.google.com/file/d/drive_file_${Date.now()}`,
      },
    };
  }
}
