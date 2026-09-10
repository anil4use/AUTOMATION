import { Router } from 'express';
import { ConnectorV2Controller } from './connector-v2.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Public / open routes for listing connectors & categories
router.get('/', ConnectorV2Controller.listConnectors as any);
router.get('/:connectorId', ConnectorV2Controller.getConnectorById as any);
router.get('/:connectorId/actions', ConnectorV2Controller.listActions as any);
router.get('/:connectorId/capabilities', ConnectorV2Controller.getCapabilities as any);

// Protected routes for testing & dynamic options
router.use(authMiddleware as any);

router.get('/:connectorId/actions/:actionId/options/:fieldId', ConnectorV2Controller.resolveDynamicOptions as any);
router.post('/:connectorId/test', ConnectorV2Controller.testAction as any);
router.post('/:connectorId/health-check', ConnectorV2Controller.healthCheck as any);

export default router;
