import { Router } from 'express';
import { VaultController } from './vault.controller';

const router = Router();

// Public / Internal Vault File View & Download Endpoints
router.get('/files', VaultController.listFiles as any);
router.post('/upload', VaultController.uploadFile as any);
router.get('/download/:fileName(*)', VaultController.downloadFile as any);
router.get('/view/:fileName(*)', VaultController.viewFile as any);
router.delete('/files/:fileName(*)', VaultController.deleteFile as any);

export default router;
