import { Types } from 'mongoose';
import {
  WAConversationModel,
  WAMessageModel,
  IWAConversation,
  IWAMessage,
  WhatsAppAutomationModel,
} from '@automation/database';
import { NormalizedMessage } from '@automation/connector-sdk';
import { logger } from '../../config/logger';

export class ConversationService {
  /**
   * Get an active conversation session for this user + automation,
   * or create a new one if none exists (or the previous one timed out).
   */
  static async getOrCreateSession(
    automationId: string,
    organizationId: string,
    externalUserId: string,
    channel: string,
    timeoutMinutes: number = 60
  ): Promise<IWAConversation> {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    // Find an active session that hasn't timed out
    const existing = await WAConversationModel.findOne({
      automationId: new Types.ObjectId(automationId),
      externalUserId,
      status: 'active',
      lastMessageAt: { $gte: cutoffTime },
    });

    if (existing) {
      // Touch lastMessageAt to keep the session alive
      existing.lastMessageAt = new Date();
      await existing.save();
      return existing;
    }

    // Close any stale active sessions for this user
    await WAConversationModel.updateMany(
      {
        automationId: new Types.ObjectId(automationId),
        externalUserId,
        status: 'active',
      },
      { $set: { status: 'closed', closedAt: new Date() } }
    );

    // Open a new conversation
    const conversation = await WAConversationModel.create({
      automationId: new Types.ObjectId(automationId),
      organizationId: new Types.ObjectId(organizationId),
      channel,
      externalUserId,
      status: 'active',
      messageCount: 0,
      lastMessageAt: new Date(),
      openedAt: new Date(),
    });

    logger.info(
      `[ConversationService] New conversation ${conversation._id} for user ${externalUserId} on automation ${automationId}`
    );

    return conversation;
  }

  /**
   * Persist a message to the conversation history.
   */
  static async addMessage(
    conversationId: string,
    organizationId: string,
    role: 'user' | 'agent',
    content: string,
    normalizedMessage?: NormalizedMessage
  ): Promise<IWAMessage> {
    const message = await WAMessageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      organizationId: new Types.ObjectId(organizationId),
      role,
      type: normalizedMessage?.type || 'text',
      content,
      normalizedMessage: normalizedMessage || {},
      platformMessageId: normalizedMessage?.platformMessageId,
      timestamp: normalizedMessage?.timestamp || new Date(),
    });

    // Increment the conversation message count
    await WAConversationModel.updateOne(
      { _id: conversationId },
      {
        $inc: { messageCount: 1 },
        $set: { lastMessageAt: new Date() },
      }
    );

    return message;
  }

  /**
   * Get recent conversation history for a session.
   * Returns messages sorted oldest-first so they can be fed to an LLM in order.
   */
  static async getHistory(
    conversationId: string,
    limit: number = 20
  ): Promise<Array<{ role: 'user' | 'agent'; content: string; timestamp: Date }>> {
    const messages = await WAMessageModel.find({ conversationId })
      .sort({ timestamp: -1 })          // newest first for limit...
      .limit(limit)
      .select('role content timestamp')
      .lean();

    // Reverse to chronological order for the LLM prompt
    return messages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
  }

  /**
   * Get paginated conversation messages for the management UI.
   */
  static async getMessages(
    conversationId: string,
    orgId: string,
    page: number = 1,
    pageSize: number = 50
  ) {
    const skip = (page - 1) * pageSize;
    const [messages, total] = await Promise.all([
      WAMessageModel.find({ conversationId, organizationId: new Types.ObjectId(orgId) })
        .sort({ timestamp: 1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      WAMessageModel.countDocuments({ conversationId, organizationId: new Types.ObjectId(orgId) }),
    ]);
    return { messages, total, page, pageSize };
  }

  /**
   * List conversations for an automation (for the management UI).
   */
  static async listConversations(
    orgId: string,
    automationId?: string,
    page: number = 1,
    pageSize: number = 20
  ) {
    const filter: Record<string, any> = {
      organizationId: new Types.ObjectId(orgId),
    };
    if (automationId) filter.automationId = new Types.ObjectId(automationId);

    const skip = (page - 1) * pageSize;
    const [conversations, total] = await Promise.all([
      WAConversationModel.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      WAConversationModel.countDocuments(filter),
    ]);

    return { conversations, total, page, pageSize };
  }

  /**
   * Count how many messages have been exchanged in the current active session.
   * Used to determine when to trigger memory extraction.
   */
  static async getSessionMessageCount(conversationId: string): Promise<number> {
    const conv = await WAConversationModel.findById(conversationId).select('messageCount').lean();
    return conv?.messageCount || 0;
  }
}
