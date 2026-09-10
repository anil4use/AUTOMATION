import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { BrowserSessionController } from './browser-session.controller';

const router = Router();

router.use(authMiddleware as any);

router.post('/start', BrowserSessionController.startSession as any);
router.get('/status/:sessionId', BrowserSessionController.getSessionStatus as any);
router.post('/capture', BrowserSessionController.captureSession as any);

export default router;
