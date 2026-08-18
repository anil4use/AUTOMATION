import { logger } from '../../config/logger';

export class EmailService {
  static async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    logger.info(`[Email Infrastructure] Sending email to ${to}: "${subject}"`);
    return true;
  }
}
