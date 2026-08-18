import { EmailService } from '../infrastructure/email';

export async function sendNotificationJob(to: string, subject: string, message: string) {
  return await EmailService.sendEmail(to, subject, message);
}
