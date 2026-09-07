import { Request, Response } from 'express';
import { manifestRegistry } from '@automation/connector-sdk';

export class ConnectorRegistryController {
  /**
   * GET /api/v1/connectors/registry/manifests
   * Query params: category
   */
  static async getAllManifests(req: Request, res: Response) {
    try {
      const { category } = req.query;
      let manifests = manifestRegistry.getAllManifests();

      if (category && typeof category === 'string') {
        manifests = manifests.filter(
          (m) => m.category?.toLowerCase() === category.toLowerCase()
        );
      }

      return res.status(200).json({
        success: true,
        count: manifests.length,
        data: manifests,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/connectors/registry/search?q=:query
   */
  static async searchConnectors(req: Request, res: Response) {
    try {
      const q = (req.query.q as string || '').toLowerCase().trim();
      const manifests = manifestRegistry.getAllManifests();

      if (!q) {
        return res.status(200).json({ success: true, count: manifests.length, data: manifests });
      }

      const filtered = manifests.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );

      return res.status(200).json({
        success: true,
        count: filtered.length,
        data: filtered,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/connectors/registry/manifests/:appId or /registry/:connectorId
   */
  static async getManifestById(req: Request, res: Response) {
    try {
      const appId = req.params.appId || req.params.connectorId;
      const manifest = manifestRegistry.getManifest(appId);

      if (!manifest) {
        return res.status(404).json({
          success: false,
          error: `Connector manifest for '${appId}' not found.`,
        });
      }

      return res.status(200).json({
        success: true,
        data: manifest,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/connectors/registry/:connectorId/triggers/:triggerId
   */
  static async getTriggerById(req: Request, res: Response) {
    try {
      const { connectorId, triggerId } = req.params;
      const manifest = manifestRegistry.getManifest(connectorId);

      if (!manifest) {
        return res.status(404).json({ success: false, error: `Connector '${connectorId}' not found.` });
      }

      const trigger = (manifest.triggers || []).find((t) => t.id === triggerId);
      if (!trigger) {
        return res.status(404).json({ success: false, error: `Trigger '${triggerId}' not found for connector '${connectorId}'.` });
      }

      return res.status(200).json({ success: true, data: trigger });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/connectors/registry/:connectorId/actions/:actionId
   */
  static async getActionById(req: Request, res: Response) {
    try {
      const { connectorId, actionId } = req.params;
      const manifest = manifestRegistry.getManifest(connectorId);

      if (!manifest) {
        return res.status(404).json({ success: false, error: `Connector '${connectorId}' not found.` });
      }

      const action = (manifest.actions || []).find((a) => a.id === actionId);
      if (!action) {
        return res.status(404).json({ success: false, error: `Action '${actionId}' not found for connector '${connectorId}'.` });
      }

      return res.status(200).json({ success: true, data: action });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/connectors/registry/export-ai (or /registry/ai-index)
   */
  static async exportForAI(req: Request, res: Response) {
    try {
      const { appIds, prompt } = req.query;
      let filterAppIds: string[] = [];

      if (appIds && typeof appIds === 'string') {
        filterAppIds = appIds.split(',').map((s) => s.trim()).filter(Boolean);
      }

      const aiExport = manifestRegistry.exportForAI(
        filterAppIds,
        (prompt as string) || '',
        []
      );

      return res.status(200).json({
        success: true,
        count: aiExport.fullSchemas.length,
        data: aiExport,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
