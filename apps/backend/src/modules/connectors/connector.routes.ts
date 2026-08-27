import { Router } from 'express';
import { ConnectorController } from './connector.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { createApiKeyConnectionSchema, oauthCallbackSchema } from './connector.validation';

const router = Router();

router.use(authMiddleware as any);

router.get('/available', ConnectorController.listAvailable as any);
router.get('/connections', ConnectorController.listUserConnections as any);
router.get('/oauth/authorize/:connectorId', ConnectorController.authorizeOAuth as any);
router.post('/oauth/callback/:connectorId', validationMiddleware(oauthCallbackSchema), ConnectorController.handleOAuthCallback as any);
router.post('/connections/api-key', validationMiddleware(createApiKeyConnectionSchema), ConnectorController.createApiKeyConnection as any);
router.post('/install-all', ConnectorController.installAll as any);
router.delete('/connections/:id', ConnectorController.deleteConnection as any);
router.post('/test/:connectorId', ConnectorController.testConnection as any);

export default router;
