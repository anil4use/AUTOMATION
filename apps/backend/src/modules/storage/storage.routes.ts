import { Router } from 'express';
import { StorageController } from './storage.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as any);

router.get('/files', StorageController.listFiles as any);
router.get('/files/:fileId/download', StorageController.downloadFile as any);
router.get('/files/:fileId/preview', StorageController.previewFile as any);
router.delete('/files/:fileId', StorageController.deleteFile as any);

export default router;
