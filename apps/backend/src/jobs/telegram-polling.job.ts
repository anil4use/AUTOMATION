import axios from 'axios';
import { WorkflowModel, ExecutionLogModel, ConnectionModel } from '@automation/database';
import { getWorkflowQueue } from '../infrastructure/queue';
import { logger } from '../config/logger';
import { decryptJson } from '../shared/utils/crypto';
import { DAGRunner } from '@automation/workflow-engine';

export class TelegramPollingDaemon {
  private static isRunning = false;
  private static timer: NodeJS.Timeout | null = null;
  private static lastOffsetMap: Record<string, number> = {};
  private static isPollingMap: Record<string, boolean> = {};

  static start(pollIntervalMs: number = 3000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`🤖 [TelegramPollingDaemon] Started Telegram Bot Polling Engine (every ${pollIntervalMs / 1000}s)`);

    this.timer = setInterval(() => {
      this.pollUpdates().catch((err) => {
        logger.error('[TelegramPollingDaemon] Polling error:', err?.message || err);
      });
    }, pollIntervalMs);

    // Initial immediate poll
    this.pollUpdates().catch(() => {});
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('🤖 [TelegramPollingDaemon] Stopped Telegram Polling Engine.');
  }

  private static async pollUpdates() {
    try {
      // Find all Telegram tokens to poll (from env or active database connections)
      const botTokens: string[] = [];
      const defaultToken = process.env.TELEGRAM_BOT_TOKEN;
      if (defaultToken && defaultToken.includes(':')) {
        botTokens.push(defaultToken);
      }

      // Check MongoDB ConnectionModel for any saved Telegram connections
      try {
        const tgConnections = await ConnectionModel.find({
          connectorId: 'telegram',
          status: 'connected',
        });
        for (const conn of tgConnections) {
          if (conn.encryptedCredentials) {
            const creds = typeof conn.encryptedCredentials === 'string'
              ? decryptJson(conn.encryptedCredentials)
              : conn.encryptedCredentials;
            const token = creds.apiKey || creds.botToken;
            if (token && token.includes(':') && !botTokens.includes(token)) {
              botTokens.push(token);
            }
          }
        }
      } catch {}

      if (!botTokens.length) return;

      for (const token of botTokens) {
        await this.pollTokenUpdates(token);
      }
    } catch (err: any) {
      logger.error('[TelegramPollingDaemon] Error fetching updates:', err?.message || err);
    }
  }

  private static async pollTokenUpdates(token: string) {
    if (this.isPollingMap[token]) return;
    this.isPollingMap[token] = true;

    try {
      const lastOffset = this.lastOffsetMap[token] || 0;
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastOffset}&timeout=2`;
      
      const res = await axios.get(url, { timeout: 8000 });
      if (!res.data || !res.data.ok || !Array.isArray(res.data.result)) return;

      const updates = res.data.result;
      if (!updates.length) return;

      for (const update of updates) {
        const updateId = update.update_id;
        this.lastOffsetMap[token] = updateId + 1;

        const message = update.message || update.edited_message || update.channel_post;
        if (!message || !message.chat) continue;

        const text = (message.text || message.caption || '').trim();
        const chatId = message.chat.id;
        const from = message.from || {};

        logger.info(`🤖 [TelegramPollingDaemon] Received message from Telegram user @${from.username || from.id} (Chat ${chatId}): "${text}"`);

        const normalizedPayload = {
          message_text: text,
          text,
          chat_id: chatId,
          chatId,
          user_id: from.id,
          userId: from.id,
          username: from.username || '',
          first_name: from.first_name || '',
          last_name: from.last_name || '',
          message_id: message.message_id,
          timestamp: new Date(message.date ? message.date * 1000 : Date.now()).toISOString(),
          botToken: token,
        };

        // 1. Check if there are active workflows bound specifically to Telegram connector (newest first)
        const activeWorkflows = await WorkflowModel.find({ status: { $in: ['active', 'running'] } }).sort({ updatedAt: -1 });
        const matchingWorkflow = activeWorkflows.find((w) => {
          const nodes = w.definition?.nodes || [];
          return nodes.some(
            (n: any) => n.connectorId === 'telegram' || n.connectorId === 'telegram-bot' || n.id?.includes('telegram')
          );
        });

        if (matchingWorkflow) {
          logger.info(`🚀 [TelegramPollingDaemon] Executing matching workflow "${matchingWorkflow.name}" (ID: ${matchingWorkflow._id})`);

          try {
            const nodes = matchingWorkflow.definition?.nodes || [];
            const edges = matchingWorkflow.definition?.edges || [];
            const orgId = matchingWorkflow.organizationId?.toString();

            await DAGRunner.run(nodes, edges, normalizedPayload, undefined, {}, orgId);
          } catch (execErr: any) {
            const errMsg = execErr?.message || String(execErr);
            logger.error(`[TelegramPollingDaemon] Workflow execution error: ${errMsg}`);

            // Direct error feedback to Telegram user in chat so they are never left wondering!
            const errorReplyText = `⚠️ <b>AutoFlow Step Execution Error</b>\n\n🚨 <b>Details:</b> <i>${errMsg}</i>\n\n<u>Fix:</u> Open the AutoFlow Workflow Builder to configure missing step inputs or credentials.`;
            
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
              chat_id: chatId,
              text: errorReplyText,
              parse_mode: 'HTML',
            }).catch(() => {});
          }
        } else {
          // Default Welcome Handler for /start or any message if no custom workflow is active
          const welcomeText = `🤖 <b>Hello ${from.first_name || 'there'}!</b>\n\nI am your <b>AutoFlow AI Automation Bot</b> (@${from.username || 'bot'}).\n\n🟢 <b>Status:</b> Connected & Ready\n⚡ <b>Chat ID:</b> <code>${chatId}</code>\n💬 <b>Your Query:</b> "<i>${text}</i>"\n\nYou can now trigger custom workflows or build AI automations!`;
          
          await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: welcomeText,
            parse_mode: 'HTML',
          }).catch((sendErr) => {
            logger.warn(`[TelegramPollingDaemon] Send message error: ${sendErr?.message}`);
          });
        }
      }
    } catch (err: any) {
      if (err.response?.status === 409 || err.message?.includes('409')) {
        logger.warn(`[TelegramPollingDaemon] 409 Conflict detected for token ${token.substring(0, 8)}... Clearing active Telegram webhook.`);
        await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`).catch(() => {});
      } else if (err.code !== 'ECONNABORTED') {
        logger.error(`[TelegramPollingDaemon] Error polling token updates: ${err?.message || err}`);
      }
    } finally {
      this.isPollingMap[token] = false;
    }
  }
}
