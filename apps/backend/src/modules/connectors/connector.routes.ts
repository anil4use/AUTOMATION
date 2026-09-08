import { Router } from 'express';
import { ConnectorController } from './connector.controller';
import { ConnectorChoicesController } from './connector-choices.controller';
import { ConnectorRegistryController } from './connector-registry.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { createApiKeyConnectionSchema, oauthCallbackSchema } from './connector.validation';

const router = Router();

router.use(authMiddleware as any);

// Registry endpoints (Phase 2)
router.get('/registry/search', ConnectorRegistryController.searchConnectors as any);
router.get('/registry/manifests', ConnectorRegistryController.getAllManifests as any);
router.get('/registry/manifests/:appId', ConnectorRegistryController.getManifestById as any);
router.get('/registry/export-ai', ConnectorRegistryController.exportForAI as any);
router.get('/registry/:connectorId/triggers/:triggerId', ConnectorRegistryController.getTriggerById as any);
router.get('/registry/:connectorId/actions/:actionId', ConnectorRegistryController.getActionById as any);

router.get('/available', ConnectorController.listAvailable as any);
router.get('/connections', ConnectorController.listUserConnections as any);
router.get('/oauth/authorize/:connectorId', ConnectorController.authorizeOAuth as any);
router.post('/oauth/callback/:connectorId', validationMiddleware(oauthCallbackSchema), ConnectorController.handleOAuthCallback as any);
router.post('/connections/api-key', validationMiddleware(createApiKeyConnectionSchema), ConnectorController.createApiKeyConnection as any);
router.post('/install-all', ConnectorController.installAll as any);
router.delete('/connections/:id', ConnectorController.deleteConnection as any);
router.post('/test/:connectorId', ConnectorController.testConnection as any);

// Database Architecture Endpoints
router.post('/test-connection', ConnectorController.testRawConnectionConfig as any);
router.post('/connections/:connectionId/test', ConnectorController.testSavedConnection as any);
router.put('/connections/:connectionId', ConnectorController.updateConnection as any);

// Dynamic Dropdown Choices API (Zapier.md Topics 21, 22)
router.get('/:appId/choices/:actionId', ConnectorChoicesController.getDynamicChoices as any);

export default router;
