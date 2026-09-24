import { LocalStorageFileModel } from '@automation/database';
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
  };
  return mimeMap[ext] || 'application/octet-stream';
};

export class StorageService {
  /**
   * Scan disk storage/data-vault recursively and sync any untracked disk files to MongoDB LocalStorageFileModel
   */
  static async syncDiskVaultFiles(orgId: string = 'default-org') {
    try {
      const vaultDir = getVaultDirectory();
      if (!fs.existsSync(vaultDir)) return;

      const diskFiles: { relPath: string; fullPath: string }[] = [];
      const readDirRecursive = (currentDir: string, relPrefix = '') => {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          const fullP = path.join(currentDir, item);
          const relP = relPrefix ? `${relPrefix}/${item}` : item;
          const stat = fs.statSync(fullP);
          if (stat.isDirectory()) {
            readDirRecursive(fullP, relP);
          } else {
            diskFiles.push({ relPath: relP, fullPath: fullP });
          }
        }
      };

      readDirRecursive(vaultDir);

      for (const diskFile of diskFiles) {
        const normalizedRelPath = diskFile.relPath.replace(/\\/g, '/');
        const baseName = path.basename(normalizedRelPath);
        const ext = path.extname(baseName).toLowerCase().replace(/^\./, '') || 'json';
        const stat = fs.statSync(diskFile.fullPath);

        const existing = await LocalStorageFileModel.findOne({
          $or: [
            { fileName: normalizedRelPath },
            { fileName: baseName },
            { storagePath: normalizedRelPath },
          ],
        });

        if (!existing) {
          let content = '';
          if (stat.size < 5 * 1024 * 1024) {
            try {
              content = fs.readFileSync(diskFile.fullPath, 'utf-8');
            } catch {
              content = '[Binary File Buffer]';
            }
          } else {
            content = '[Large File Content Exceeds Preview Limit]';
          }

          await LocalStorageFileModel.create({
            organizationId: orgId,
            fileName: normalizedRelPath,
            format: ext,
            mimeType: getMimeType(baseName),
            sizeBytes: stat.size,
            fileContent: content,
            storagePath: normalizedRelPath,
            version: 'v1.0',
            metadata: { syncedFromDisk: true, subfolder: path.dirname(normalizedRelPath) },
            createdAt: stat.birthtime || stat.mtime,
            updatedAt: stat.mtime,
          });
        } else {
          // Keep existing document's timestamp in sync with disk mtime if disk file was updated
          if (stat.mtime && existing.updatedAt && new Date(stat.mtime).getTime() > new Date(existing.updatedAt).getTime()) {
            existing.updatedAt = stat.mtime;
            existing.sizeBytes = stat.size;
            await existing.save();
          }
        }
      }
    } catch (err) {
      console.error('Failed to auto-sync Data Vault disk files:', err);
    }
  }

  /**
   * List saved vault files for organization with format & search filters
   */
  static async listFiles(orgId: string, options: { search?: string; format?: string; limit?: number; offset?: number }) {
    await this.syncDiskVaultFiles(orgId);

    const filter: any = { organizationId: orgId };

    if (options.search) {
      filter.$or = [
        { fileName: { $regex: options.search, $options: 'i' } },
        { format: { $regex: options.search, $options: 'i' } },
        { version: { $regex: options.search, $options: 'i' } },
      ];
    }

    if (options.format && options.format !== 'all') {
      filter.format = options.format;
    }

    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    const [files, totalCount] = await Promise.all([
      LocalStorageFileModel.find(filter)
        .select('-fileContent') // Exclude heavy raw buffer payload from list view for maximum speed
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      LocalStorageFileModel.countDocuments(filter),
    ]);

    // Compute stats
    const statsResult = await LocalStorageFileModel.aggregate([
      { $match: { organizationId: orgId } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSizeBytes: { $sum: '$sizeBytes' },
          csvCount: { $sum: { $cond: [{ $eq: ['$format', 'csv'] }, 1, 0] } },
          jsonCount: { $sum: { $cond: [{ $eq: ['$format', 'json'] }, 1, 0] } },
          htmlCount: { $sum: { $cond: [{ $eq: ['$format', 'html'] }, 1, 0] } },
          txtCount: { $sum: { $cond: [{ $eq: ['$format', 'txt'] }, 1, 0] } },
        },
      },
    ]);

    const stats = statsResult[0] || {
      totalFiles: 0,
      totalSizeBytes: 0,
      csvCount: 0,
      jsonCount: 0,
      htmlCount: 0,
      txtCount: 0,
    };

    return {
      files,
      totalCount,
      limit,
      offset,
      stats,
    };
  }

  /**
   * Fetch single file by ID for download/preview
   */
  static async getFileById(fileId: string, orgId: string) {
    const file = (await LocalStorageFileModel.findOne({ _id: fileId, organizationId: orgId }).lean()) as any;
    if (!file) {
      throw new Error(`Storage file '${fileId}' not found or access denied.`);
    }

    // If file content is missing in DB but storagePath exists on disk, read it on demand
    if (!file.fileContent && file.storagePath) {
      try {
        const vaultDir = getVaultDirectory();
        const diskPath = path.join(vaultDir, file.storagePath);
        if (fs.existsSync(diskPath)) {
          file.fileContent = fs.readFileSync(diskPath, 'utf-8');
        }
      } catch {}
    }

    return file;
  }

  /**
   * Delete file by ID
   */
  static async deleteFile(fileId: string, orgId: string) {
    const file = await LocalStorageFileModel.findOne({ _id: fileId, organizationId: orgId });
    if (!file) {
      throw new Error(`Storage file '${fileId}' not found.`);
    }

    if (file.storagePath || file.fileName) {
      try {
        const vaultDir = getVaultDirectory();
        const diskPath = path.join(vaultDir, file.storagePath || file.fileName);
        if (fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
      } catch {}
    }

    await LocalStorageFileModel.deleteOne({ _id: fileId });
    return true;
  }
}

