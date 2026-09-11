import { Response, NextFunction } from 'express';
import { StorageService } from './storage.service';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';

export class StorageController {
  static async listFiles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user?.organizationId || 'default-org';
      const search = req.query.search as string;
      const format = req.query.format as string;
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;

      const data = await StorageService.listFiles(orgId, { search, format, limit, offset });
      return sendResponse(res, 200, true, data);
    } catch (err) {
      next(err);
    }
  }

  static async downloadFile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { fileId } = req.params;
      const orgId = req.user?.organizationId || 'default-org';
      const file = await StorageService.getFileById(fileId, orgId);

      const fileName = file.fileName || `document_${fileId}.${file.format || 'txt'}`;
      const mimeType = file.mimeType || 'application/octet-stream';
      const content = file.fileContent || '';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));

      return res.status(200).send(content);
    } catch (err) {
      next(err);
    }
  }

  static async previewFile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { fileId } = req.params;
      const orgId = req.user?.organizationId || 'default-org';
      const file = await StorageService.getFileById(fileId, orgId);
      return sendResponse(res, 200, true, file);
    } catch (err) {
      next(err);
    }
  }

  static async deleteFile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { fileId } = req.params;
      const orgId = req.user?.organizationId || 'default-org';
      await StorageService.deleteFile(fileId, orgId);
      return sendResponse(res, 200, true, null, 'File deleted from Data Vault');
    } catch (err) {
      next(err);
    }
  }
}
