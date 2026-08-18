import { logger } from '../../config/logger';

export interface WorkflowFailureAlertPayload {
  toEmail: string;
  workflowName: string;
  workflowId: string;
  executionId: string;
  errorMessage: string;
}

export class EmailService {
  static async sendEmail(to: string, subject: string, message: string): Promise<boolean> {
    logger.info(`[EmailService] Sending Email to ${to} | Subject: ${subject}`);
    return true;
  }

  static async sendWorkflowFailureAlert(payload: WorkflowFailureAlertPayload): Promise<boolean> {
    logger.info(`[EmailService] Sending Workflow Failure Notification to ${payload.toEmail} for Workflow: ${payload.workflowName}`);
    return true;
  }
}
