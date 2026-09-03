import { WhatsAppAutomationModel, IWhatsAppAutomation } from '@automation/database';
import { AppError } from '../../shared/errors/app.error';
import { encryptJson, decryptJson } from '../../shared/utils/crypto';
import { CreateWhatsAppAutomationDTO, UpdateWhatsAppAutomationDTO } from './whatsapp-agent.types';
import { logger } from '../../config/logger';

export class WhatsAppAutomationService {
  /**
   * Create a new WhatsApp Agent Automation for an organization.
   * The plaintext access token is encrypted before storage.
   */
  static async create(
    orgId: string,
    creatorId: string,
    dto: CreateWhatsAppAutomationDTO
  ): Promise<IWhatsAppAutomation> {
    const encryptedAccessToken = encryptJson({ accessToken: dto.accessToken });

    const automation = await WhatsAppAutomationModel.create({
      organizationId: orgId,
      creatorId,
      name: dto.name,
      description: dto.description,
      whatsappPhoneNumberId: dto.whatsappPhoneNumberId,
      whatsappBusinessAccountId: dto.whatsappBusinessAccountId,
      encryptedAccessToken,
      verifyToken: dto.verifyToken,
      agentModel: dto.agentModel || 'gemini',
      agentPersonality: dto.agentPersonality,
      allowedUsers: dto.allowedUsers || [],
      blockedUsers: dto.blockedUsers || [],
      allowGroupConversations: dto.allowGroupConversations ?? false,
      conversationTimeoutMinutes: dto.conversationTimeoutMinutes ?? 60,
      maxHistoryMessages: dto.maxHistoryMessages ?? 20,
      enableLongTermMemory: dto.enableLongTermMemory ?? true,
      memoryExtractionEnabled: dto.memoryExtractionEnabled ?? true,
      memoryExtractionAfterEveryN: dto.memoryExtractionAfterEveryN ?? 3,
    });

    logger.info(`[WhatsAppAutomationService] Created automation "${dto.name}" for org ${orgId}`);
    return automation;
  }

  /**
   * List all WhatsApp automations for an organization.
   * Access token is excluded from the response (security).
   */
  static async listByOrg(orgId: string) {
    return WhatsAppAutomationModel.find({ organizationId: orgId })
      .select('-encryptedAccessToken')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get a single automation by ID. Validates org ownership.
   */
  static async getById(automationId: string, orgId: string): Promise<IWhatsAppAutomation> {
    const automation = await WhatsAppAutomationModel.findOne({
      _id: automationId,
      organizationId: orgId,
    }).select('-encryptedAccessToken');

    if (!automation) {
      throw new AppError('WhatsApp Automation not found', 404);
    }
    return automation;
  }

  /**
   * Get a single automation by ID with decrypted credentials.
   * Used internally by the webhook handler at runtime — never exposed via API.
   */
  static async getByIdWithCredentials(
    automationId: string
  ): Promise<{ automation: IWhatsAppAutomation; accessToken: string }> {
    const automation = await WhatsAppAutomationModel.findById(automationId);
    if (!automation) {
      throw new AppError('WhatsApp Automation not found', 404);
    }

    let accessToken = '';
    try {
      const decrypted = decryptJson(automation.encryptedAccessToken);
      accessToken = decrypted.accessToken || '';
    } catch (err) {
      logger.error(`[WhatsAppAutomationService] Failed to decrypt access token for ${automationId}`, err);
      throw new AppError('Failed to decrypt automation credentials', 500);
    }

    return { automation, accessToken };
  }

  /**
   * Update an automation's configuration.
   * If a new accessToken is provided, it is re-encrypted.
   */
  static async update(
    automationId: string,
    orgId: string,
    dto: UpdateWhatsAppAutomationDTO
  ): Promise<IWhatsAppAutomation> {
    const updatePayload: Record<string, any> = { ...dto };

    // Re-encrypt access token if being rotated
    if (dto.accessToken) {
      updatePayload.encryptedAccessToken = encryptJson({ accessToken: dto.accessToken });
      delete updatePayload.accessToken;
    }

    const updated = await WhatsAppAutomationModel.findOneAndUpdate(
      { _id: automationId, organizationId: orgId },
      { $set: updatePayload },
      { new: true }
    ).select('-encryptedAccessToken');

    if (!updated) {
      throw new AppError('WhatsApp Automation not found', 404);
    }

    logger.info(`[WhatsAppAutomationService] Updated automation ${automationId}`);
    return updated;
  }

  /**
   * Toggle enabled/disabled state.
   */
  static async setEnabled(
    automationId: string,
    orgId: string,
    enabled: boolean
  ): Promise<void> {
    await WhatsAppAutomationModel.updateOne(
      { _id: automationId, organizationId: orgId },
      { $set: { enabled } }
    );
  }

  /**
   * Permanently delete an automation and its configuration.
   * Note: Conversation history and memory are NOT deleted (for audit/replay).
   */
  static async delete(automationId: string, orgId: string): Promise<void> {
    const result = await WhatsAppAutomationModel.deleteOne({
      _id: automationId,
      organizationId: orgId,
    });

    if (result.deletedCount === 0) {
      throw new AppError('WhatsApp Automation not found', 404);
    }

    logger.info(`[WhatsAppAutomationService] Deleted automation ${automationId}`);
  }

  /**
   * Access control check — should this user be allowed to interact?
   * Returns the reason if blocked, or null if allowed.
   */
  static checkUserAccess(
    automation: IWhatsAppAutomation,
    userId: string
  ): { allowed: boolean; reason?: string } {
    // Check blocklist first (explicit deny takes priority)
    if (automation.blockedUsers && automation.blockedUsers.includes(userId)) {
      return { allowed: false, reason: 'user_blocked' };
    }

    // Check allowlist (empty = allow all)
    if (
      automation.allowedUsers &&
      automation.allowedUsers.length > 0 &&
      !automation.allowedUsers.includes(userId)
    ) {
      return { allowed: false, reason: 'user_not_in_allowlist' };
    }

    return { allowed: true };
  }
}
