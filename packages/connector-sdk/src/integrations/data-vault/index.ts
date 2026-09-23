import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import * as fs from 'fs';
import * as path from 'path';

const getVaultDirectory = (): string => {
  let rootDir = process.cwd();
  if (rootDir.includes('apps') || rootDir.includes('packages')) {
    rootDir = path.resolve(rootDir, rootDir.endsWith('backend') || rootDir.endsWith('frontend') ? '../..' : '..');
  }
  const dir = path.join(rootDir, 'storage', 'data-vault');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const getMimeType = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.pdf': 'application/pdf',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.zip': 'application/zip',
    '.xml': 'application/xml',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

const jsonToCsv = (items: any[]): string => {
  if (!Array.isArray(items) || items.length === 0) return '';
  const headers = Array.from(
    new Set(
      items.flatMap((item) => (item && typeof item === 'object' ? Object.keys(item) : []))
    )
  );

  const csvRows = [headers.join(',')];

  for (const item of items) {
    const values = headers.map((header) => {
      const val = item ? item[header] : '';
      if (val === null || val === undefined) return '""';
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const escaped = strVal.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

export const dataVaultManifest: ConnectorManifest = {
  id: 'data-vault',
  name: 'Data Vault & Local Storage',
  description: 'Zero-auth local persistent storage system. Save, serialize, view, and 1-click download all workflow outputs (JSON, CSV, TXT, HTML, PDF, Markdown, Images, Audio, Video) locally on disk without external cloud setup.',
  category: 'Databases & Storage',
  icon: '/icons/database.svg',
  authType: 'none', // Native Zero-Auth Local Storage Engine
  triggers: [],
  actions: [
    {
      id: 'upload_file',
      name: 'Save & Store Local File',
      description: 'Saves text, JSON, CSV, Base64 buffer, or document directly into local persistent vault storage.',
      type: 'action',
      inputs: [
        { key: 'fileName', label: 'File Name with Extension (e.g. report.csv, data.json, summary.md)', type: 'string', required: true },
        { key: 'content', label: 'File Content (Text, JSON string, or Base64 buffer)', type: 'string', required: true },
        { key: 'subfolder', label: 'Optional Subfolder (e.g. exports, datasets)', type: 'string', required: false },
        { key: 'isBase64', label: 'Is Content Base64 Encoded (true/false)', type: 'boolean', required: false },
      ],
      outputs: [
        { key: 'fileId', label: 'File Unique Identifier', type: 'string', required: true },
        { key: 'fileName', label: 'Saved File Name', type: 'string', required: true },
        { key: 'filePath', label: 'Local Disk Path', type: 'string', required: true },
        { key: 'fileSize', label: 'File Size (Bytes)', type: 'number', required: true },
        { key: 'mimeType', label: 'MIME Content Type', type: 'string', required: true },
        { key: 'downloadUrl', label: '1-Click Download URL', type: 'string', required: true },
        { key: 'viewUrl', label: '1-Click Preview / View URL', type: 'string', required: true },
        { key: 'savedAt', label: 'Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'save_dataset',
      name: 'Export Dataset to CSV / JSON File',
      description: 'Converts JSON array of records into a clean formatted CSV table or JSON file saved to local vault storage.',
      type: 'action',
      inputs: [
        { key: 'datasetName', label: 'Dataset File Name (e.g. lead_contacts, emails_list)', type: 'string', required: true },
        { key: 'records', label: 'Array of JSON Objects or Data Payload', type: 'string', required: true },
        { key: 'format', label: 'Export Format (csv or json)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'fileName', label: 'Saved File Name', type: 'string', required: true },
        { key: 'recordCount', label: 'Total Records Count', type: 'number', required: true },
        { key: 'fileSize', label: 'File Size (Bytes)', type: 'number', required: true },
        { key: 'downloadUrl', label: '1-Click Download URL', type: 'string', required: true },
        { key: 'viewUrl', label: '1-Click View URL', type: 'string', required: true },
      ],
    },
    {
      id: 'read_file',
      name: 'Read Vault File Content',
      description: 'Reads file text or JSON dataset stored in local vault storage.',
      type: 'action',
      inputs: [
        { key: 'fileName', label: 'Vault File Name (e.g. report.csv)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'content', label: 'File Text Content', type: 'string', required: true },
        { key: 'fileName', label: 'File Name', type: 'string', required: true },
        { key: 'fileSize', label: 'Size (Bytes)', type: 'number', required: true },
        { key: 'mimeType', label: 'MIME Type', type: 'string', required: true },
      ],
    },
    {
      id: 'get_all',
      name: 'Get All / List Local Vault Files',
      description: 'Browse, list, and filter all files saved in local persistent vault storage.',
      type: 'action',
      inputs: [
        { key: 'limit', label: 'Max Records Limit (Default 50, Max 250)', type: 'number', required: false },
        { key: 'offset', label: 'Offset Starting Index', type: 'number', required: false },
        { key: 'query', label: 'Filter Keywords / Prefix', type: 'string', required: false },
        { key: 'fileType', label: 'File Extension Filter (e.g. csv, json, pdf, txt, html)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'items', label: 'Vault Files Array', type: 'json', required: true },
        { key: 'totalCount', label: 'Total Files Count', type: 'number', required: true },
        { key: 'limit', label: 'Applied Limit', type: 'number', required: true },
        { key: 'hasMore', label: 'Has More Files', type: 'boolean', required: true },
      ],
    },
    {
      id: 'delete_file',
      name: 'Delete File from Vault',
      description: 'Deletes a file from local vault disk storage.',
      type: 'action',
      inputs: [
        { key: 'fileName', label: 'Vault File Name', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Deletion Status', type: 'boolean', required: true },
        { key: 'fileName', label: 'Deleted File Name', type: 'string', required: true },
        { key: 'message', label: 'Status Message', type: 'string', required: true },
      ],
    },
  ],
};

export class DataVaultConnector extends BaseConnector {
  manifest = dataVaultManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const vaultDir = getVaultDirectory();
    const serverBaseUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    try {
      switch (actionId) {
        case 'upload_file':
        case 'save_file':
        case 'save_document':
        case 'save_document_file':
        case 'create_file':
        case 'write_file': {
          let formatExt = (inputs.format || inputs.fileFormat || inputs.extension || '').trim().replace(/^\./, '');
          let fileName = (inputs.fileName || inputs.key || inputs.name || `document_${Date.now()}`).trim();
          if (formatExt && !fileName.toLowerCase().endsWith(`.${formatExt.toLowerCase()}`)) {
            fileName = `${fileName}.${formatExt}`;
          }
          const subfolder = (inputs.subfolder || '').trim();
          const isBase64 = Boolean(inputs.isBase64);

          if (subfolder) {
            const subDir = path.join(vaultDir, subfolder);
            if (!fs.existsSync(subDir)) {
              fs.mkdirSync(subDir, { recursive: true });
            }
            fileName = path.join(subfolder, path.basename(fileName));
          } else {
            fileName = path.basename(fileName);
          }

          const targetPath = path.join(vaultDir, fileName);
          let rawContent = inputs.content || inputs.data || inputs.payload || inputs.documentContent || '';

          if (typeof rawContent === 'object') {
            rawContent = JSON.stringify(rawContent, null, 2);
          }

          if (isBase64 || (typeof rawContent === 'string' && rawContent.startsWith('data:'))) {
            const base64Data = rawContent.includes('base64,') ? rawContent.split('base64,')[1] : rawContent;
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(targetPath, buffer);
          } else {
            fs.writeFileSync(targetPath, String(rawContent), 'utf-8');
          }

          const stat = fs.statSync(targetPath);
          const mimeType = getMimeType(fileName);
          const encodedName = encodeURIComponent(fileName.replace(/\\/g, '/'));
          const downloadUrl = `${serverBaseUrl}/api/v2/vault/download/${encodedName}`;
          const viewUrl = `${serverBaseUrl}/api/v2/vault/view/${encodedName}`;

          return {
            success: true,
            data: {
              fileId: `file_${Date.now()}`,
              fileName,
              filePath: targetPath,
              fileSize: stat.size,
              mimeType,
              downloadUrl,
              viewUrl,
              savedAt: new Date().toISOString(),
              summary: `✅ Saved '${fileName}' (${stat.size} bytes) to Local Data Vault.`,
            },
          };
        }

        case 'save_dataset': {
          let rawRecords = inputs.records || inputs.items || inputs.data;
          if (typeof rawRecords === 'string') {
            try {
              rawRecords = JSON.parse(rawRecords);
            } catch {
              rawRecords = [{ value: rawRecords }];
            }
          }

          if (!Array.isArray(rawRecords)) {
            rawRecords = rawRecords ? [rawRecords] : [];
          }

          const format = (inputs.format || 'csv').toLowerCase();
          let baseName = (inputs.datasetName || `dataset_${Date.now()}`).trim();
          baseName = baseName.replace(/\.(csv|json)$/i, '');
          const fileName = `${baseName}.${format}`;
          const targetPath = path.join(vaultDir, fileName);

          let fileContent = '';
          if (format === 'csv') {
            fileContent = jsonToCsv(rawRecords);
          } else {
            fileContent = JSON.stringify(rawRecords, null, 2);
          }

          fs.writeFileSync(targetPath, fileContent, 'utf-8');
          const stat = fs.statSync(targetPath);
          const mimeType = getMimeType(fileName);
          const encodedName = encodeURIComponent(fileName);
          const downloadUrl = `${serverBaseUrl}/api/v2/vault/download/${encodedName}`;
          const viewUrl = `${serverBaseUrl}/api/v2/vault/view/${encodedName}`;

          return {
            success: true,
            data: {
              fileName,
              recordCount: rawRecords.length,
              fileSize: stat.size,
              mimeType,
              downloadUrl,
              viewUrl,
              savedAt: new Date().toISOString(),
              summary: `🎉 Successfully exported ${rawRecords.length} dataset records to '${fileName}'.`,
            },
          };
        }

        case 'read_file': {
          const fileName = path.basename(inputs.fileName || '');
          const targetPath = path.join(vaultDir, fileName);

          if (!fs.existsSync(targetPath)) {
            return { success: false, data: {}, error: `File '${fileName}' not found in Data Vault.` };
          }

          const stat = fs.statSync(targetPath);
          const mimeType = getMimeType(fileName);
          let content: any = fs.readFileSync(targetPath, 'utf-8');

          if (mimeType === 'application/json') {
            try {
              content = JSON.parse(content);
            } catch {}
          }

          return {
            success: true,
            data: {
              fileName,
              content,
              fileSize: stat.size,
              mimeType,
              readAt: new Date().toISOString(),
            },
          };
        }

        case 'get_all':
        case 'list_files': {
          const limit = Number(inputs.limit) || 50;
          const offset = Number(inputs.offset) || 0;
          const query = (inputs.query || '').toLowerCase().trim();
          const fileType = (inputs.fileType || '').toLowerCase().replace(/^\./, '').trim();

          const allEntries: string[] = [];
          const readDirRecursive = (currentDir: string, relativePrefix = '') => {
            if (!fs.existsSync(currentDir)) return;
            const files = fs.readdirSync(currentDir);
            for (const f of files) {
              const fullP = path.join(currentDir, f);
              const relP = relativePrefix ? path.join(relativePrefix, f) : f;
              const stat = fs.statSync(fullP);
              if (stat.isDirectory()) {
                readDirRecursive(fullP, relP);
              } else {
                allEntries.push(relP);
              }
            }
          };

          readDirRecursive(vaultDir);

          let filtered = allEntries.map((relName) => {
            const fullP = path.join(vaultDir, relName);
            const stat = fs.statSync(fullP);
            const normalizedName = relName.replace(/\\/g, '/');
            const mimeType = getMimeType(relName);
            const ext = path.extname(relName).toLowerCase().replace(/^\./, '');
            const encoded = encodeURIComponent(normalizedName);

            return {
              fileName: normalizedName,
              fileSize: stat.size,
              mimeType,
              extension: ext,
              downloadUrl: `${serverBaseUrl}/api/v2/vault/download/${encoded}`,
              viewUrl: `${serverBaseUrl}/api/v2/vault/view/${encoded}`,
              savedAt: stat.mtime.toISOString(),
            };
          });

          if (query) {
            filtered = filtered.filter((f) => f.fileName.toLowerCase().includes(query));
          }

          if (fileType && fileType !== 'all') {
            filtered = filtered.filter((f) => f.extension === fileType);
          }

          filtered.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

          const paginated = filtered.slice(offset, offset + limit);

          return {
            success: true,
            data: {
              items: paginated,
              totalCount: filtered.length,
              limit,
              offset,
              hasMore: offset + limit < filtered.length,
              summary: `Listed ${paginated.length} files from Local Data Vault (${filtered.length} total).`,
            },
          };
        }

        case 'delete_file': {
          const fileName = path.basename(inputs.fileName || '');
          const targetPath = path.join(vaultDir, fileName);

          if (!fs.existsSync(targetPath)) {
            return { success: false, data: {}, error: `File '${fileName}' not found in Data Vault.` };
          }

          fs.unlinkSync(targetPath);
          return {
            success: true,
            data: {
              success: true,
              fileName,
              message: `Successfully deleted file '${fileName}' from Local Vault.`,
            },
          };
        }

        default:
          return { success: false, data: {}, error: `Unsupported action for Data Vault: ${actionId}` };
      }
    } catch (err: any) {
      return { success: false, data: {}, error: `Data Vault execution failed: ${err?.message || err}` };
    }
  }
}

export const dataVaultConnector = new DataVaultConnector();
manifestRegistry.register(dataVaultManifest);
