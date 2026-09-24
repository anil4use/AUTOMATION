import { Request, Response, Router } from 'express';
import { SystemConfigService } from './system-config.service';

const router = Router();

/**
 * GET /api/v1/system/config
 * Returns all public runtime configurations for frontend consumption
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const configs = await SystemConfigService.getAllConfigs(true);
    res.json({ success: true, configs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/system/config
 * Upsert dynamic configuration value
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { key, value, category, description, isPublic } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, error: 'Key is required.' });
    }
    const updated = await SystemConfigService.setConfig(key, value, category, description, isPublic);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const systemConfigRouter = router;
