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
      // 2. Detect connectors dynamically based on user requirement
      const isSchedule = lower.includes('8pm') || lower.includes('schedule') || lower.includes('daily') || lower.includes('time') || lower.includes('cron') || lower.includes('alert at');
      const isWebSearch = lower.includes('search') || lower.includes('scraper') || lower.includes('job') || lower.includes('google search');
      const isSlack = lower.includes('slack');
      const isGmail = lower.includes('gmail') || lower.includes('email');
      const isSheets = lower.includes('sheet');
      const isStripe = lower.includes('stripe') || lower.includes('payment');
      const isWhatsApp = lower.includes('whatsapp') || lower.includes('gf') || lower.includes('girlfriend') || lower.includes('text message');
      const isNotion = lower.includes('notion');

      const suggestedConnectors: string[] = [];

      // Trigger Node
      if (isSchedule) {
        suggestedConnectors.push('autoflow-schedule');
      } else if (isWebSearch) {
        suggestedConnectors.push('web-search');
      } else if (isGmail) {
        suggestedConnectors.push('gmail');
      } else if (isStripe) {
        suggestedConnectors.push('stripe');
      } else {
        suggestedConnectors.push('autoflow-schedule');
      }

      // AI Summarizer Step
      suggestedConnectors.push('ai-agent');

      // Action Node
      if (isWhatsApp) {
        suggestedConnectors.push('whatsapp');
      } else if (isSlack) {
        suggestedConnectors.push('slack');
      } else if (isSheets) {
        suggestedConnectors.push('google-sheets');
      } else if (isNotion) {
        suggestedConnectors.push('notion');
      } else if (isGmail) {
        suggestedConnectors.push('gmail');
      } else {
        suggestedConnectors.push('whatsapp');
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
        connectorId: cid,
        name:
          cid === 'autoflow-schedule'
            ? 'AutoFlow Schedule Trigger (8:00 PM)'
            : cid === 'ai-agent'
            ? 'AI Processor Node'
            : cid === 'web-search'
            ? 'Web Search & Scraper'
            : cid === 'whatsapp'
            ? 'WhatsApp Business'
            : cid.charAt(0).toUpperCase() + cid.slice(1),
        isConnected: cid === 'autoflow-schedule' || cid === 'ai-agent' || cid === 'web-search' || connectedIds.has(cid),
      }));

      // 4. Build Auto-Configured DAG Nodes & Edges
      const nodes: any[] = [];
      const edges: any[] = [];

      suggestedConnectors.forEach((cid, idx) => {
        const isFirst = idx === 0;
        const nodeId = `node_${idx + 1}`;

        let operationId = 'execute';
        let name = `${cid.toUpperCase()} Step`;
        let config: Record<string, any> = {};
        let fieldMapping: Record<string, any> = {};

        if (cid === 'autoflow-schedule') {
          operationId = 'schedule_time';
          name = 'Schedule Trigger (Daily at 8:00 PM)';
          config = { time: '20:00', frequency: 'daily' };
        } else if (cid === 'web-search') {
          operationId = 'search_web';
          name = 'Web Search & Scraper';
          config = { query: 'Romantic quotes & thoughtful messages' };
        } else if (cid === 'ai-agent') {
          operationId = 'process_text';
          name = 'AI Message Generator';
          config = { prompt: 'Generate a sweet, romantic 2-sentence message for my girlfriend.' };
          fieldMapping = { inputText: '{{nodes.node_1.output || nodes.node_2.output}}' };
        } else if (cid === 'whatsapp') {
          operationId = 'send_message';
          name = 'WhatsApp Business Send Message';
          config = { recipient: 'Girlfriend Contact' };
          fieldMapping = { message: '{{nodes.node_2.output.result || nodes.node_3.output.result}}' };
        } else if (cid === 'gmail') {
          operationId = 'send_email';
          name = 'Gmail Send Email';
          fieldMapping = { body: '{{nodes.node_2.output.result}}' };
        } else if (cid === 'slack') {
          operationId = 'send_message';
          name = 'Slack Post Message';
          fieldMapping = { text: '{{nodes.node_2.output.result}}' };
        } else if (cid === 'google-sheets') {
          operationId = 'append_row';
          name = 'Google Sheets Append Row';
          fieldMapping = { rowData: '{{nodes.node_2.output.result}}' };
        }

        nodes.push({
          id: nodeId,
          type: isFirst ? 'trigger' : cid === 'ai-agent' ? 'ai-agent' : 'action',
          connectorId: cid,
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

      const defaultMessage = `I've designed an automated workflow for **"${lastUserMessage}"**:\n\n1. **${suggestedConnectors[0].toUpperCase()}** fires at 8:00 PM.\n2. **AI Message Generator** crafts a sweet note.\n3. **${suggestedConnectors[suggestedConnectors.length - 1].toUpperCase()}** delivers the message!`;

      responseData = {
        replyMessage: llmResponseText || defaultMessage,
        isGreeting: false,
        workflowDraft: {
          name: `Workflow: ${lastUserMessage.slice(0, 35)}`,
          description: `Generated by AutoFlow AI Agent for: "${lastUserMessage}"`,
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
