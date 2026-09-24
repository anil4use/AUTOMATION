import { Request, Response } from 'express';
import {
  ConnectorCategoryModel,
  ConnectorModel,
  ConnectorActionModel,
  ConnectorAuthModel,
  ConnectorFeatureModel,
  ConnectorTestDefinitionModel,
} from '@automation/database';
import { ConnectorRuntime } from '@automation/connector-sdk';

export class ConnectorV2Controller {
  /**
   * List all connectors from MongoDB
   * GET /api/v2/connectors
   */
  public static async listConnectors(req: Request, res: Response): Promise<void> {
    try {
      const { category, search, status } = req.query;
      const query: any = { enabled: true };

      if (category) query.categoryId = String(category);
      if (status) query.status = String(status);
      if (search) {
        const regex = new RegExp(String(search), 'i');
        query.$or = [{ name: regex }, { displayName: regex }, { description: regex }, { connectorId: regex }];
      }

      const connectors = await ConnectorModel.find(query).sort({ categoryId: 1, displayName: 1 });
      const categories = await ConnectorCategoryModel.find().sort({ sortOrder: 1 });

      res.json({
        success: true,
        count: connectors.length,
        categories,
        data: connectors,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get single connector metadata with actions & auth spec & setup guide
   * GET /api/v2/connectors/:connectorId
   */
  public static async getConnectorById(req: Request, res: Response): Promise<void> {
    try {
      const { connectorId } = req.params;
      const connector = await ConnectorModel.findOne({ connectorId });

      if (!connector) {
        res.status(404).json({ success: false, message: `Connector '${connectorId}' not found` });
        return;
      }

      const actions = await ConnectorActionModel.find({ connectorId, enabled: true });
      const authSpec = await ConnectorAuthModel.findOne({ connectorId });
      const features = await ConnectorFeatureModel.find({ connectorId });
      const testSpecs = await ConnectorTestDefinitionModel.find({ connectorId, enabled: true });

      res.json({
        success: true,
        data: {
          connector,
          actions,
          authSpec,
          features,
          testSpecs,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get actions for a connector
   * GET /api/v2/connectors/:connectorId/actions
   */
  public static async listActions(req: Request, res: Response): Promise<void> {
    try {
      const { connectorId } = req.params;
      const actions = await ConnectorActionModel.find({ connectorId, enabled: true });

      res.json({
        success: true,
        count: actions.length,
        data: actions,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get dynamic options for a specific field
   * GET /api/v2/connectors/:connectorId/actions/:actionId/options/:fieldId
   */
  public static async resolveDynamicOptions(req: Request, res: Response): Promise<void> {
    try {
      const { connectorId, actionId, fieldId } = req.params;
      const orgId = (req as any).user?.organizationId || (req as any).user?.orgId;

      // Call runtime or strategy option resolver
      const optionsResult = await ConnectorRuntime.execute({
        connectorId,
        actionId: `get_options_${fieldId}`,
        input: { fieldId, actionId },
        organizationId: orgId,
      });

      if (optionsResult.success && Array.isArray(optionsResult.data)) {
        res.json({ success: true, options: optionsResult.data });
        return;
      }

      // Default empty options response
      res.json({
        success: true,
        options: [
          { label: 'Default / All', value: 'default' },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get complete feature matrix and capabilities
   * GET /api/v2/connectors/:connectorId/capabilities
   */
  public static async getCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const { connectorId } = req.params;
      const connector = await ConnectorModel.findOne({ connectorId });
      const features = await ConnectorFeatureModel.find({ connectorId });

      res.json({
        success: true,
        connectorId,
        capabilities: connector?.capabilities || [],
        featureMatrix: features,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Run dynamic action test (supports optional/partial inputs, returns latency & dynamic output schema)
   * POST /api/v2/connectors/:connectorId/test
   */
  public static async testAction(req: Request, res: Response): Promise<void> {
    try {
      const { connectorId } = req.params;
      const { actionId, input, connectionId } = req.body;
      const orgId = (req as any).user?.organizationId || (req as any).user?.orgId;

      if (!actionId) {
        res.status(400).json({ success: false, message: 'actionId is required in test payload' });
        return;
      }

      const result = await ConnectorRuntime.execute({
        connectorId,
        actionId,
        input: input || {},
        organizationId: orgId,
        connectionId,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PROVIDER_ERROR',
          message: err.message,
          details: err.stack,
        },
      });
    }
  }

  /**
   * Run connector health check
   * POST /api/v2/connectors/:connectorId/health-check
   */
  public static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const { connectorId } = req.params;
      const orgId = (req as any).user?.organizationId || (req as any).user?.orgId;

      const result = await ConnectorRuntime.execute({
        connectorId,
        actionId: 'execute',
        input: { healthCheck: true },
        organizationId: orgId,
      });

      res.json({
        success: result.success,
        connectorId,
        healthy: result.success,
        latencyMs: result.executionTimeMs,
        details: result.data || result.error,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        healthy: false,
        error: err.message,
      });
    }
  }
}
