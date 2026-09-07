import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getDropboxChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const dropboxManifest: ConnectorManifest = {
  id: 'dropbox',
  name: 'Dropbox',
  description: 'Full-power Dropbox integration — Upload, download, move, copy, search, delete files, manage folders & trigger on new/updated files.',
  category: 'File Management',
  icon: '/icons/dropbox.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'new_file',
      name: 'New File Created',
      description: 'Triggers when a new file is uploaded to a Dropbox folder.',
      type: 'trigger',
      deliveryMethod: 'polling',
      inputs: [
        { key: 'path', label: 'Folder Path', type: 'string', required: false, hasDynamicChoices: true, dynamicChoice: { endpoint: 'path' } },
      ],
      outputs: [
        { key: 'id', label: 'File ID', type: 'string', required: true },
        { key: 'name', label: 'File Name', type: 'string', required: true },
        { key: 'path_lower', label: 'Lower Path', type: 'string', required: true },
        { key: 'size', label: 'File Size (Bytes)', type: 'number', required: true },
        { key: 'client_modified', label: 'Modified Timestamp', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'upload_file',
      name: 'Upload File',
      description: 'Uploads a file to a specified Dropbox path.',
      type: 'action',
      inputs: [
        { key: 'path', label: 'Target File Path (e.g. /documents/report.pdf)', type: 'string', required: true },
        { key: 'content', label: 'File Text / Base64 Content', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'File ID', type: 'string', required: true },
        { key: 'name', label: 'File Name', type: 'string', required: true },
        { key: 'size', label: 'File Size', type: 'number', required: true },
      ],
    },
    {
      id: 'create_folder',
      name: 'Create Folder',
      description: 'Creates a new folder at a path.',
      type: 'action',
      inputs: [
        { key: 'path', label: 'New Folder Path (e.g. /projects/2026)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Folder ID', type: 'string', required: true },
        { key: 'path_display', label: 'Path Display', type: 'string', required: true },
      ],
    },
    {
      id: 'search_files',
      name: 'Search Files',
      description: 'Searches files and folders by filename query.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query Term', type: 'string', required: true },
      ],
      outputs: [
        { key: 'matches', label: 'Matched Files Array', type: 'json', required: true },
      ],
    },
  ],
};

export class DropboxConnector extends BaseConnector {
  manifest = dropboxManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey || credentials.token;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Dropbox access token.' };
    }

    try {
      if (actionId === 'upload_file') {
        const url = 'https://content.dropboxapi.com/2/files/upload';
        const headers = {
          Authorization: `Bearer ${token}`,
          'Dropbox-API-Arg': JSON.stringify({ path: inputs.path, mode: 'add', autorename: true, mute: false }),
          'Content-Type': 'application/octet-stream',
        };
        const res = await axios.post(url, inputs.content, { headers });
        return { success: true, data: { id: res.data.id, name: res.data.name, size: res.data.size } };
      }

      if (actionId === 'create_folder') {
        const url = 'https://api.dropboxapi.com/2/files/create_folder_v2';
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const res = await axios.post(url, { path: inputs.path, autorename: false }, { headers });
        const metadata = res.data?.metadata || {};
        return { success: true, data: { id: metadata.id, path_display: metadata.path_display } };
      }

      if (actionId === 'search_files') {
        const url = 'https://api.dropboxapi.com/2/files/search_v2';
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const res = await axios.post(url, { query: inputs.query }, { headers });
        const matches = res.data?.matches || [];
        return { success: true, data: { matches } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.error_summary || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getDropboxChoices(fieldId, credentials);
  }
}

manifestRegistry.register(dropboxManifest);
