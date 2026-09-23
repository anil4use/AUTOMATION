import { Request, Response } from 'express';
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
    '.json': 'application/json; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.pdf': 'application/pdf',
    '.md': 'text/markdown; charset=utf-8',
    '.markdown': 'text/markdown; charset=utf-8',
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

export class VaultController {
  static async listFiles(req: Request, res: Response) {
    try {
      const vaultDir = getVaultDirectory();
      const serverBaseUrl = `${req.protocol}://${req.get('host')}`;
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const query = String(req.query.query || '').toLowerCase().trim();
      const fileType = String(req.query.fileType || '').toLowerCase().replace(/^\./, '').trim();

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

      let items = allEntries.map((relName) => {
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
        items = items.filter((f) => f.fileName.toLowerCase().includes(query));
      }

      if (fileType && fileType !== 'all') {
        items = items.filter((f) => f.extension === fileType);
      }

      items.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      const paginated = items.slice(offset, offset + limit);

      res.status(200).json({
        success: true,
        data: {
          items: paginated,
          totalCount: items.length,
          limit,
          offset,
          hasMore: offset + limit < items.length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to list vault files' });
    }
  }

  static async downloadFile(req: Request, res: Response) {
    try {
      const vaultDir = getVaultDirectory();
      const rawFileName = req.params.fileName || (req.params as any)[0] || '';
      const decodedName = decodeURIComponent(rawFileName).replace(/\.\./g, '');
      const filePath = path.join(vaultDir, decodedName);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return res.status(404).json({ success: false, message: `File '${decodedName}' not found in Data Vault.` });
      }

      const mimeType = getMimeType(decodedName);
      const downloadName = path.basename(decodedName);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to download file' });
    }
  }

  static async viewFile(req: Request, res: Response) {
    try {
      const vaultDir = getVaultDirectory();
      const rawFileName = req.params.fileName || (req.params as any)[0] || '';
      const decodedName = decodeURIComponent(rawFileName).replace(/\.\./g, '');
      const filePath = path.join(vaultDir, decodedName);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return res.status(404).send(`<h3>404 File Not Found</h3><p>File '${decodedName}' is not in Data Vault.</p>`);
      }

      const mimeType = getMimeType(decodedName);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', 'inline');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err: any) {
      res.status(500).send(`<h3>500 Server Error</h3><p>${err?.message}</p>`);
    }
  }

  static async uploadFile(req: Request, res: Response) {
    try {
      const vaultDir = getVaultDirectory();
      const { fileName, content, subfolder, isBase64 } = req.body;

      if (!fileName || !content) {
        return res.status(400).json({ success: false, message: 'fileName and content are required.' });
      }

      let cleanName = path.basename(fileName);
      if (subfolder) {
        const subDir = path.join(vaultDir, subfolder);
        if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
        cleanName = path.join(subfolder, cleanName);
      }

      const targetPath = path.join(vaultDir, cleanName);
      let payload = content;

      if (typeof payload === 'object') {
        payload = JSON.stringify(payload, null, 2);
      }

      if (isBase64 || (typeof payload === 'string' && payload.startsWith('data:'))) {
        const base64Data = payload.includes('base64,') ? payload.split('base64,')[1] : payload;
        fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
      } else {
        fs.writeFileSync(targetPath, String(payload), 'utf-8');
      }

      const stat = fs.statSync(targetPath);
      const serverBaseUrl = `${req.protocol}://${req.get('host')}`;
      const encoded = encodeURIComponent(cleanName.replace(/\\/g, '/'));

      res.status(200).json({
        success: true,
        data: {
          fileName: cleanName,
          fileSize: stat.size,
          mimeType: getMimeType(cleanName),
          downloadUrl: `${serverBaseUrl}/api/v2/vault/download/${encoded}`,
          viewUrl: `${serverBaseUrl}/api/v2/vault/view/${encoded}`,
          savedAt: stat.mtime.toISOString(),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to upload file' });
    }
  }

  static async deleteFile(req: Request, res: Response) {
    try {
      const vaultDir = getVaultDirectory();
      const rawFileName = req.params.fileName || '';
      const decodedName = decodeURIComponent(rawFileName).replace(/\.\./g, '');
      const filePath = path.join(vaultDir, decodedName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: `File '${decodedName}' not found.` });
      }

      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, message: `File '${decodedName}' deleted successfully.` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to delete file' });
    }
  }
}
