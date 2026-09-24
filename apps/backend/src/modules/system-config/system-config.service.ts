import { SystemConfigModel } from '@automation/database';
import { logger } from '../../config/logger';

export class SystemConfigService {
  /**
   * Fetch all configurations (or public configs for non-admin client)
   */
  static async getAllConfigs(publicOnly = true): Promise<Record<string, any>> {
    const filter = publicOnly ? { isPublic: true } : {};
    const docs = await SystemConfigModel.find(filter);

    const configMap: Record<string, any> = {};
    docs.forEach((doc: any) => {
      configMap[doc.key] = doc.value;
    });

    return configMap;
  }

  /**
   * Get single config value by key with fallback
   */
  static async getConfig(key: string, defaultValue?: any): Promise<any> {
    try {
      const doc = await SystemConfigModel.findOne({ key });
      return doc ? doc.value : defaultValue;
    } catch (err: any) {
      logger.warn(`[SystemConfigService] Failed to fetch key ${key}: ${err.message}`);
      return defaultValue;
    }
  }

  /**
   * Set or update config value
   */
  static async setConfig(
    key: string,
    value: any,
    category = 'general',
    description?: string,
    isPublic = true,
    updatedBy?: string
  ): Promise<any> {
    const doc = await SystemConfigModel.findOneAndUpdate(
      { key },
      { key, value, category, description, isPublic, updatedBy },
      { upsert: true, new: true }
    );
    return doc;
  }
}
