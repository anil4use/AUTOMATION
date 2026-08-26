import { ConnectionModel, AIChatModel } from '@automation/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isGreeting?: boolean;
  suggestedConnectors?: string[];
  userConnectionsStatus?: any[];
  workflowDraft?: any;
}

const REGISTERED_CONNECTORS_LIST = `
Available Native AutoFlow Platform Connectors:
1. Scheduled Trigger (connectorId: 'autoflow-schedule') — Runs workflows automatically on fixed schedules (e.g. daily at 8pm, hourly, cron).
2. Web Search & Scraper (connectorId: 'web-search') — Searches Google/Tavily and scrapes web page content.
3. Gmail (connectorId: 'gmail') — Sends email notifications (send_email) or triggers on new incoming email (new_email).
4. Slack (connectorId: 'slack') — Posts channel messages (send_message) or triggers on inbound messages.
5. Google Sheets (connectorId: 'google-sheets') — Appends spreadsheet rows (append_row) or triggers on new rows.
6. Google Drive (connectorId: 'google-drive') — Uploads files and manages folders.
7. Notion Workspace (connectorId: 'notion') — Creates database pages or queries workspace records.
8. Stripe Payments (connectorId: 'stripe') — Listens for payment events (payment_succeeded) or creates customers.
9. WhatsApp Business (connectorId: 'whatsapp') — Sends text messages (send_message) or triggers on inbound messages.
10. Webhook / HTTP Request (connectorId: 'http-request') — Calls any custom REST API endpoint (GET, POST, PUT, DELETE).
11. AI Processor Node (connectorId: 'ai-agent') — Analyzes, summarizes, formats, or translates payload text using Groq/Gemini LLM.
`;

const SYSTEM_PROMPT = `You are the AutoFlow AI Assistant inside the AutoFlow Automation Platform.

${REGISTERED_CONNECTORS_LIST}

CRITICAL RULES & CONSTRAINTS:
1. NEVER output raw Python code, Airflow scripts, Selenium, or external code blocks.
2. If the user asks for a feature or service that isn't one of the 11 registered native connectors above, explicitly explain: "AutoFlow currently connects with [list closest native connectors], and you can use our Webhook/HTTP Request ('http-request') or Web Search ('web-search') connector for custom external services!"
3. When the user specifies any requirement (e.g. scheduled message for girlfriend at 8pm, job search, email notifications, payment receipts), explain how to build it using AutoFlow's native connectors step-by-step.
4. Keep responses concise, direct, helpful, and professional.
`;

export class AIAgentService {
  /**
   * Fetch user's persistent chat history from MongoDB Atlas
   */
  static async getChatHistory(orgId: string, userId: string) {
    try {
      const chat = await AIChatModel.findOne({ organizationId: orgId, userId });
      return chat ? chat.messages : [];
    } catch (err) {
      logger.error('[AIAgentService] Error loading chat history:', err);
      return [];
    }
  }

  /**
   * Clear user's persistent chat history in MongoDB Atlas
   */
  static async clearChatHistory(orgId: string, userId: string) {
    try {
      await AIChatModel.deleteOne({ organizationId: orgId, userId });
      return true;
    } catch (err) {
      logger.error('[AIAgentService] Error clearing chat history:', err);
      return false;
    }
  }

  /**
   * Conversational AI requirement processing using Groq / Gemini LLM
   * Automatically persists user and AI assistant messages into MongoDB Atlas
   */
  static async processChat(messages: ChatMessage[], orgId: string, userId: string) {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content || '';
    logger.info(`[AIAgentService] Processing chat prompt: "${lastUserMessage}" for org: ${orgId}`);

    const lower = lastUserMessage.trim().toLowerCase();
    const isGreeting =
      ['hi', 'hello', 'hey', 'hil..', 'hi.', 'hello.', 'hey!'].includes(lower) || lower.length <= 3;

    // 1. Call real LLM (Groq / Gemini) with strict AutoFlow system context
    let llmResponseText = '';

    if (env.groqApiKey) {
      try {
        llmResponseText = await AIAgentService.callGroq(messages);
      } catch (err) {
        logger.warn('[AIAgentService] Groq call failed, trying Gemini:', err);
      }
    }

    if (!llmResponseText && env.geminiApiKey) {
      try {
        llmResponseText = await AIAgentService.callGemini(messages);
      } catch (err) {
        logger.warn('[AIAgentService] Gemini call failed:', err);
      }
    }

    // Clean up thinking tags and code blocks
    if (llmResponseText) {
      llmResponseText = llmResponseText
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/```[a-z]*[\s\S]*?```/gi, '')
        .trim();
    }

    // Response payload initialization
    let responseData: any = {};

    if (isGreeting) {
      responseData = {
        replyMessage:
          "Hello! I am your AutoFlow AI Assistant. What process or workflow would you like to automate today?\n\nFor example, you can tell me:\n• *'Schedule a daily message at 8pm to my girlfriend via WhatsApp'* \n• *'When a new lead arrives in Gmail, summarize it with AI and notify Slack'*",
        isGreeting: true,
        workflowDraft: null,
        suggestedConnectors: [],
        userConnectionsStatus: [],
      };
    } else {
      // 2. Dynamic Connector Chain Resolver
      const isSchedule = lower.includes('schedule') || lower.includes('daily') || lower.includes('cron') || lower.includes('alert at') || lower.includes('8pm') || lower.includes('reminder') || lower.includes('every day') || lower.includes('everyday') || lower.includes('today');
      const isInterval = /every\s+\d+\s*(min|minute|hour|sec)/.test(lower);
      const needsScheduleTrigger = isSchedule || isInterval || lower.includes('every');

      const isWebSearch = lower.includes('search') || lower.includes('scraper') || lower.includes('job') || lower.includes('google search');
      const isSlack = lower.includes('slack');
      const isGmail = lower.includes('gmail') || lower.includes('email');
      const isSheets = lower.includes('sheet') || lower.includes('excel') || lower.includes('spreadsheet');
      const isDrive = lower.includes('drive');
      const isDocs = lower.includes('doc');
      const isCalendar = lower.includes('calendar') || lower.includes('meeting');
      const isStripe = lower.includes('stripe') || lower.includes('payment');
      const isWhatsApp = lower.includes('whatsapp') || lower.includes('gf') || lower.includes('girlfriend') || lower.includes('text message');
      const isNotion = lower.includes('notion');

      // Extract schedule interval if mentioned (e.g. "every 10 minutes")
      const intervalMatch = lower.match(/every\s+(\d+)\s*(min|minute|hour)/);
      const intervalValue = intervalMatch ? parseInt(intervalMatch[1]) : null;
      const intervalUnit = intervalMatch ? (intervalMatch[2].startsWith('h') ? 'hours' : 'minutes') : 'minutes';

      // Extract recipient email if mentioned
      const recipientMatch = lower.match(/send.*?to\s+([\w.\-+]+@[\w.\-]+\.\w+)/i) || lower.match(/([\w.\-+]+@[\w.\-]+\.\w+)/i);
      const recipientEmail = recipientMatch ? recipientMatch[1] : '';

      const suggestedConnectors: string[] = [];

      // Step 1: Trigger Node
      if (needsScheduleTrigger) {
        suggestedConnectors.push('autoflow-schedule');
      } else if (isStripe) {
        suggestedConnectors.push('stripe');
      } else if (isWhatsApp) {
        suggestedConnectors.push('whatsapp');
      } else {
        suggestedConnectors.push('autoflow-schedule');
      }

      // Step 2: Intermediate Data Source Node (Fetch/Read)
      if (needsScheduleTrigger && isGmail) {
        suggestedConnectors.push('gmail-read');
      } else if (needsScheduleTrigger && isWebSearch) {
        suggestedConnectors.push('web-search');
      }

      // Step 3: AI Processing Node
      suggestedConnectors.push('ai-agent');

      // Step 4: Final Action Destination Node
      if (isSheets) {
        suggestedConnectors.push('google-sheets');
      } else if (isDrive) {
        suggestedConnectors.push('google-drive');
      } else if (isDocs) {
        suggestedConnectors.push('google-docs');
      } else if (isCalendar) {
        suggestedConnectors.push('google-calendar');
      } else if (isSlack) {
        suggestedConnectors.push('slack');
      } else if (isWhatsApp) {
        suggestedConnectors.push('whatsapp');
      } else if (isNotion) {
        suggestedConnectors.push('notion');
      } else if (isGmail && suggestedConnectors.includes('gmail-read')) {
        suggestedConnectors.push('gmail');
      } else if (isGmail) {
        suggestedConnectors.push('gmail');
      } else {
        suggestedConnectors.push('google-sheets');
      }

      // 3. Query MongoDB for active user connections
      let userConnections: any[] = [];
      try {
        userConnections = await ConnectionModel.find({
          organizationId: orgId,
          status: 'connected',
        });
      } catch (dbErr) {
        userConnections = [];
      }

      const connectedIds = new Set(userConnections.map((c) => c.connectorId));

      const userConnectionsStatus = suggestedConnectors.map((cid) => ({
        connectorId: cid === 'gmail-read' ? 'gmail' : cid,
        name:
          cid === 'autoflow-schedule'
            ? 'AutoFlow Schedule Trigger'
            : cid === 'ai-agent'
            ? 'AI Processor Node'
            : cid === 'web-search'
            ? 'Web Search & Scraper'
            : cid === 'whatsapp'
            ? 'WhatsApp Business'
            : cid === 'gmail-read'
            ? 'Gmail — Read Inbox'
            : cid === 'gmail'
            ? 'Gmail — Send Email'
            : cid === 'google-sheets'
            ? 'Google Sheets'
            : cid.charAt(0).toUpperCase() + cid.slice(1),
        isConnected: cid === 'autoflow-schedule' || cid === 'ai-agent' || cid === 'web-search' || connectedIds.has(cid) || connectedIds.has('gmail') || connectedIds.has('google-sheets'),
      }));

      // 4. Build Auto-Configured DAG Nodes & Edges
      const nodes: any[] = [];
      const edges: any[] = [];

      // Determine interval label for schedule node
      const scheduleLabel = intervalValue
        ? `Schedule Trigger (Every ${intervalValue} ${intervalUnit})`
        : isSchedule && lower.includes('8pm')
        ? 'Schedule Trigger (Daily at 8:00 PM)'
        : isSchedule && lower.includes('daily')
        ? 'Schedule Trigger (Daily)'
        : 'Schedule Trigger (Hourly)';
      const scheduleConfig = intervalValue
        ? { intervalMinutes: intervalUnit === 'hours' ? intervalValue * 60 : intervalValue, frequency: 'interval' }
        : { time: '20:00', frequency: 'daily' };

      suggestedConnectors.forEach((cid, idx) => {
        const isFirst = idx === 0;
        const nodeId = `node_${idx + 1}`;
        const aiNodeIdx = suggestedConnectors.indexOf('ai-agent') + 1; // 1-based index of AI node

        let operationId = 'execute';
        let name = `${cid.toUpperCase()} Step`;
        let config: Record<string, any> = {};
        let fieldMapping: Record<string, any> = {};

        if (cid === 'autoflow-schedule') {
          operationId = 'schedule_time';
          name = scheduleLabel;
          config = scheduleConfig;
        } else if (cid === 'gmail-read') {
          // Gmail Read Step — fetch emails from INBOX
          operationId = 'new_email';
          name = 'Gmail — Read Inbox Emails';
          config = { label: 'INBOX', searchQuery: 'is:unread' };
          fieldMapping = {};
        } else if (cid === 'web-search') {
          operationId = 'search_web';
          name = 'Web Search & Scraper';
          config = { query: 'Latest news & updates' };
        } else if (cid === 'ai-agent') {
          operationId = 'process_text';
          const isEmailSummary = suggestedConnectors.includes('gmail-read');
          name = isEmailSummary ? 'AI Email Summarizer' : 'AI Message Generator';
          config = {
            prompt: isEmailSummary
              ? 'Summarize the following emails into a concise, readable digest. Group by sender. Highlight important action items.'
              : 'Generate a helpful, concise, professional response based on the input.',
          };
          // Reference the previous node's output
          const prevNodeId = `node_${idx}`;
          fieldMapping = { inputText: `{{${prevNodeId}.output.emails || ${prevNodeId}.output.body || ${prevNodeId}.output}}` };
        } else if (cid === 'whatsapp') {
          operationId = 'send_message';
          name = 'WhatsApp Business — Send Message';
          config = { recipient: '+1234567890' };
          fieldMapping = { message: `{{node_${aiNodeIdx}.output.result}}` };
        } else if (cid === 'gmail') {
          const isLastNode = idx === suggestedConnectors.length - 1;
          if (isLastNode && suggestedConnectors.includes('gmail-read')) {
            // Final action: send summary email
            operationId = 'send_email';
            name = 'Gmail — Send Summary Email';
            config = {
              to: recipientEmail || 'your@email.com',
              subject: 'Your Automated Email Summary — AutoFlow',
              body: `{{node_${aiNodeIdx}.output.result}}`,
            };
            fieldMapping = {
              to: recipientEmail || 'your@email.com',
              subject: 'Your Automated Email Summary — AutoFlow',
              body: `{{node_${aiNodeIdx}.output.result}}`,
            };
          } else {
            operationId = 'send_email';
            name = 'Gmail — Send Email';
            config = { to: recipientEmail || '', subject: 'AutoFlow Notification' };
            fieldMapping = { body: `{{node_${aiNodeIdx}.output.result}}` };
          }
        } else if (cid === 'slack') {
          operationId = 'send_message';
          name = 'Slack — Post Message';
          config = { channel: '#general' };
          fieldMapping = { text: `{{node_${aiNodeIdx}.output.result}}` };
        } else if (cid === 'google-sheets') {
          operationId = 'append_row';
          name = 'Google Sheets — Log Summary Row';
          const rowValueStr = `["{{trigger.output.triggeredAt}}", "Email Summary Digest", "{{node_${aiNodeIdx}.output.summary || node_${aiNodeIdx}.output.result}}"]`;
          config = {
            spreadsheetId: 'Daily_Email_Summaries_Log',
            worksheet: 'Sheet1',
            values: rowValueStr,
          };
          fieldMapping = {
            spreadsheetId: 'Daily_Email_Summaries_Log',
            worksheet: 'Sheet1',
            values: rowValueStr,
          };
        } else if (cid === 'google-drive') {
          operationId = 'upload_file';
          name = 'Google Drive — Upload Document';
          config = {
            fileName: `Email_Summary_${new Date().toISOString().slice(0, 10)}.txt`,
            content: `{{node_${aiNodeIdx}.output.summary || node_${aiNodeIdx}.output.result}}`,
            mimeType: 'text/plain',
          };
          fieldMapping = {
            fileName: `Email_Summary_${new Date().toISOString().slice(0, 10)}.txt`,
            content: `{{node_${aiNodeIdx}.output.summary || node_${aiNodeIdx}.output.result}}`,
          };
        } else if (cid === 'google-calendar') {
          operationId = 'create_event';
          name = 'Google Calendar — Schedule Event';
          config = {
            summary: 'Automated AI Sync Meeting',
            description: `{{node_${aiNodeIdx}.output.summary || node_${aiNodeIdx}.output.result}}`,
            startTime: new Date(Date.now() + 3600000).toISOString(),
            endTime: new Date(Date.now() + 7200000).toISOString(),
          };
          fieldMapping = {
            summary: 'Automated AI Sync Meeting',
            description: `{{node_${aiNodeIdx}.output.summary || node_${aiNodeIdx}.output.result}}`,
          };
        } else if (cid === 'google-docs') {
          operationId = 'create_document';
          name = 'Google Docs — Create Summary Doc';
          config = {
            title: `Email_Summary_Doc_${new Date().toISOString().slice(0, 10)}`,
            initialText: `{{node_${aiNodeIdx}.output.summary || node_${aiNodeIdx}.output.result}}`,
          };
          fieldMapping = {
            title: `Email_Summary_Doc_${new Date().toISOString().slice(0, 10)}`,
            initialText: `{{node_${aiNodeIdx}.output.summary || node_${aiNodeIdx}.output.result}}`,
          };
        }

        // gmail-read maps to connectorId 'gmail' on the canvas
        const canvasConnectorId = cid === 'gmail-read' ? 'gmail' : cid;

        nodes.push({
          id: nodeId,
          type: isFirst ? 'trigger' : cid === 'ai-agent' ? 'ai-agent' : 'action',
          connectorId: canvasConnectorId,
          operationId,
          name,
          config,
          fieldMapping,
          position: { x: 250, y: 80 + idx * 180 },
        });

        if (idx > 0) {
          const prevId = `node_${idx}`;
          edges.push({
            id: `e_${prevId}_${nodeId}`,
            source: prevId,
            target: nodeId,
          });
        }
      });

      const stepSummaryText = nodes.map((n, i) => `${i + 1}. **${n.name}** (${n.connectorId})`).join('\n');
      const defaultMessage = `I've designed a **${nodes.length}-step** automated workflow for your request:\n\n${stepSummaryText}\n\nAll **${nodes.length} steps** have been auto-configured with field mappings and parameters. Click below to load onto your builder canvas!`;

      // Clean up workflow title
      const cleanTitle = lastUserMessage.length > 40 ? `${lastUserMessage.slice(0, 40)}...` : lastUserMessage;

      responseData = {
        replyMessage: defaultMessage,
        isGreeting: false,
        workflowDraft: {
          name: `Workflow: ${cleanTitle}`,
          description: `AutoFlow ${nodes.length}-step pipeline for: "${lastUserMessage}"`,
          nodes,
          edges,
        },
        suggestedConnectors,
        userConnectionsStatus,
      };
    }

    // 5. Persist user prompt & AI response directly into MongoDB Atlas
    try {
      const userMessageObj = {
        id: `user_${Date.now()}`,
        role: 'user' as const,
        content: lastUserMessage,
      };

      const aiMessageObj = {
        id: `ai_${Date.now()}`,
        role: 'assistant' as const,
        content: responseData.replyMessage,
        isGreeting: responseData.isGreeting,
        suggestedConnectors: responseData.suggestedConnectors,
        userConnectionsStatus: responseData.userConnectionsStatus,
        workflowDraft: responseData.workflowDraft,
      };

      await AIChatModel.findOneAndUpdate(
        { organizationId: orgId, userId },
        {
          $push: { messages: { $each: [userMessageObj, aiMessageObj] } },
        },
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      logger.error('[AIAgentService] Error persisting chat message to DB:', dbErr);
    }

    return responseData;
  }

  /** Direct Groq API call */
  private static async callGroq(messages: ChatMessage[]): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(`Groq API error: ${data.error.message}`);
    }
    return data.choices?.[0]?.message?.content || '';
  }

  /** Direct Gemini API call */
  private static async callGemini(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: SYSTEM_PROMPT }],
            },
            ...messages.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          ],
        }),
      }
    );
    const data = await response.json();
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`);
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
