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
   * GET /api/v1/connectors/registry/manifests/:appId
   */
  static async getManifestById(req: Request, res: Response) {
    try {
      const { appId } = req.params;
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
   * GET /api/v1/connectors/registry/export-ai
   * Query params: appIds (comma-separated), prompt
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
