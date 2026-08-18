import { logger } from '../../config/logger';

export class StorageService {
  static async uploadFile(fileBuffer: Buffer, fileName: string): Promise<string> {
    logger.info(`[Storage] Uploading ${fileName} to R2/Storage...`);
    return `https://storage.autoflow.dev/${fileName}`;
  }
}
