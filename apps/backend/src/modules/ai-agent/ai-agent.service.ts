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

const DYNAMIC_WORKFLOW_SYSTEM_PROMPT = `You are the AutoFlow AI Assistant & Workflow Compiler inside the AutoFlow Automation Platform.
Your goal is to analyze the user's natural language requirement and dynamically construct a COMPLETE, FULLY-CONFIGURED AutoFlow DAG Workflow JSON structure.

Available Native AutoFlow Connectors & Supported Operations:
1. 'autoflow-schedule' — Triggers: 'schedule_time' (config: { frequency: 'daily'|'hourly'|'interval', time: '09:00', intervalMinutes: number })
2. 'web-search' — Actions: 'search_web' (config: { query: string, maxResults: number }), 'scrape_url' (config: { url: string })
3. 'gmail' — Triggers: 'new_email' (config: { query: string }), Actions: 'send_email' (config: { to: string, subject: string, body: string }), 'read_emails' (config: { query: string, maxResults: number })
4. 'google-sheets' — Triggers: 'new_row', Actions: 'append_row' (config: { spreadsheetId: string, worksheet: 'Sheet1', values: string }), 'create_spreadsheet' (config: { title: string })
5. 'google-drive' — Actions: 'upload_file' (config: { fileName: string, content: string }), 'create_folder'
6. 'google-calendar' — Actions: 'create_event' (config: { summary: string, description: string, startTime: string, endTime: string })
7. 'google-docs' — Actions: 'create_document' (config: { title: string, initialText: string })
8. 'slack' — Actions: 'send_message' (config: { channel: string, text: string })
9. 'whatsapp' — Actions: 'send_message' (config: { recipient: string, message: string })
10. 'notion' — Actions: 'create_page' (config: { databaseId: string, title: string })
11. 'ai-agent' — Actions: 'process_text' (config: { prompt: string }, fieldMapping: { inputText: '{{node_X.output.topSnippet || node_X.output.results || node_X.output.emails || node_X.output}}' })
12. 'http-request' — Actions: 'custom_api_call' (config: { method: 'POST'|'GET', url: string, body: string })

CRITICAL PIPELINE RULE:
When the user asks to process/summarize data with AI and store or log the results (e.g. search web + analyze with AI + log to Google Sheets or Slack), YOU MUST ALWAYS INCLUDE ALL 4 PIPELINE STAGES IN THE 'nodes' ARRAY:
- Step 1: 'autoflow-schedule' (Schedule Trigger)
- Step 2: Data Source ('web-search' or 'gmail')
- Step 3: 'ai-agent' (AI Job & Web Analyst)
- Step 4: Destination Action ('google-sheets' or 'slack')

NEVER stop after Step 2! ALWAYS include Step 3 ('ai-agent') and Step 4 ('google-sheets' or 'slack') whenever AI analysis and spreadsheet/notification logging are mentioned in the user prompt!

CRITICAL INSTRUCTION:
Return ONLY a single valid JSON object (no markdown fences, no \`\`\` json, no extra text):
{
  "replyMessage": "Markdown string describing the generated workflow steps clearly.",
  "suggestedConnectors": ["autoflow-schedule", "web-search", "ai-agent", "google-sheets"],
  "workflowDraft": {
    "name": "Short Title Based on Requirement",
    "description": "Clear description of the automation pipeline",
    "nodes": [
      {
        "id": "node_1",
        "type": "trigger",
        "connectorId": "autoflow-schedule",
        "operationId": "schedule_time",
        "name": "AutoFlow Schedule Trigger",
        "config": { "frequency": "daily", "time": "09:00" },
        "fieldMapping": {},
        "position": { "x": 250, "y": 80 }
      }
    ],
    "edges": [
      { "id": "e_node_1_node_2", "source": "node_1", "target": "node_2" }
    ]
  }
}
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
   * Fully Dynamic Conversational AI Workflow Compiler using Groq / Gemini LLM
   */
  static async processChat(messages: ChatMessage[], orgId: string, userId: string) {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content || '';
    logger.info(`[AIAgentService] Dynamic LLM Workflow Generation for prompt: "${lastUserMessage}"`);

    const lower = lastUserMessage.trim().toLowerCase();
    const isGreeting =
      ['hi', 'hello', 'hey', 'hil..', 'hi.', 'hello.', 'hey!'].includes(lower) || lower.length <= 3;

    if (isGreeting) {
      const responseData = {
        replyMessage:
          "Hello! I am your AutoFlow AI Assistant. Describe what you'd like to automate (e.g. *'Search for React developer jobs, summarize with AI, and save to a Google Sheet named React_Jobs_Log'*) and I will dynamically build and configure your entire workflow!",
        isGreeting: true,
        workflowDraft: null,
        suggestedConnectors: [],
        userConnectionsStatus: [],
      };
      await AIAgentService.persistChat(messages, lastUserMessage, responseData, orgId, userId);
      return responseData;
    }

    // 1. Attempt Fully Dynamic LLM Workflow JSON Compilation via Gemini 2.0 Flash or Groq
    let llmJsonText = '';

    if (env.geminiApiKey) {
      try {
        llmJsonText = await AIAgentService.callGeminiJSON(messages);
      } catch (err) {
        logger.warn('[AIAgentService] Gemini JSON generation failed, trying Groq:', err);
      }
    }

    if (!llmJsonText && env.groqApiKey) {
      try {
        llmJsonText = await AIAgentService.callGroqJSON(messages);
      } catch (err) {
        logger.warn('[AIAgentService] Groq JSON generation failed:', err);
      }
    }

    let responseData: any = null;

    // Parse LLM JSON Output
    if (llmJsonText) {
      try {
        const cleaned = llmJsonText.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/gi, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.workflowDraft && parsed.workflowDraft.nodes && parsed.workflowDraft.nodes.length > 0) {
          let nodes: any[] = parsed.workflowDraft.nodes || [];
          let edges: any[] = parsed.workflowDraft.edges || [];

          // Dynamic 4-Step Pipeline Safeguard: Auto-complete missing AI Processor or Destination nodes
          const hasWebSearch = nodes.some((n: any) => n.connectorId === 'web-search');
          const hasGmail = nodes.some((n: any) => n.connectorId === 'gmail' || n.connectorId === 'gmail-read');
          const hasAiAgent = nodes.some((n: any) => n.connectorId === 'ai-agent');
          const hasSheets = nodes.some((n: any) => n.connectorId === 'google-sheets');
          const hasSlack = nodes.some((n: any) => n.connectorId === 'slack');

          const userWantsAi = lower.includes('ai') || lower.includes('analyze') || lower.includes('summarize') || lower.includes('extract');
          const userWantsSheets = lower.includes('sheet') || lower.includes('excel') || lower.includes('spreadsheet') || lower.includes('log');
          const userWantsSlack = lower.includes('slack');

          const needsAi = (hasWebSearch || hasGmail || userWantsAi) && !hasAiAgent;
          const needsSheets = userWantsSheets && !hasSheets;
          const needsSlack = userWantsSlack && !hasSlack;

          if (needsAi || needsSheets || needsSlack) {
            let nextIdx = nodes.length + 1;

            if (needsAi) {
              const prevNodeId = `node_${nodes.length}`;
              const aiNodeId = `node_${nextIdx}`;
              nodes.push({
                id: aiNodeId,
                type: 'ai-agent',
                connectorId: 'ai-agent',
                operationId: 'process_text',
                name: hasWebSearch ? 'AI Job & Web Analyst' : 'AI Email Summarizer',
                config: {
                  prompt: hasWebSearch
                    ? 'Analyze the web search results. Extract a structured list of top 20 job listings detailing: Job Title, Company Name, Contact Email / Phone Number, Location / Place, Salary Range, and Application Link:'
                    : 'Summarize the input text into a concise, readable digest:',
                },
                fieldMapping: {
                  inputText: `{{${prevNodeId}.output.topSnippet || ${prevNodeId}.output.results || ${prevNodeId}.output.emails || ${prevNodeId}.output}}`,
                },
                position: { x: 250, y: 80 + (nextIdx - 1) * 180 },
              });
              edges.push({ id: `e_${prevNodeId}_${aiNodeId}`, source: prevNodeId, target: aiNodeId });
              nextIdx++;
            }

            if (needsSheets) {
              const prevNodeId = `node_${nodes.length}`;
              const sheetNodeId = `node_${nextIdx}`;
              const quotedMatch = lastUserMessage.match(/["']([A-Za-z0-9_\-\s]{2,60})["']/);
              const namedMatch = lastUserMessage.match(/named\s+["']?([A-Za-z0-9_\-]+)["']?/i) || lastUserMessage.match(/spreadsheet\s+["']?([A-Za-z0-9_\-]+)["']?/i);
              let spreadsheetId = hasWebSearch ? 'React_Developer_Jobs_Log' : 'Daily_Email_Summaries_Log';
              if (quotedMatch && quotedMatch[1] && quotedMatch[1].toLowerCase() !== 'named' && quotedMatch[1].length > 2) {
                spreadsheetId = quotedMatch[1].trim().replace(/\s+/g, '_');
              } else if (namedMatch && namedMatch[1] && namedMatch[1].toLowerCase() !== 'named') {
                spreadsheetId = namedMatch[1].trim();
              }

              const digestLabel = hasWebSearch ? 'React Developer Jobs Digest' : 'Email Summary Digest';
              const rowValueStr = `["{{trigger.output.triggeredAt}}", "${digestLabel}", "{{${prevNodeId}.output.summary || ${prevNodeId}.output.result}}"]`;

              nodes.push({
                id: sheetNodeId,
                type: 'action',
                connectorId: 'google-sheets',
                operationId: 'append_row',
                name: 'Google Sheets — Log Summary Row',
                config: { spreadsheetId, worksheet: 'Sheet1', values: rowValueStr },
                fieldMapping: { spreadsheetId, worksheet: 'Sheet1', values: rowValueStr },
                position: { x: 250, y: 80 + (nextIdx - 1) * 180 },
              });
              edges.push({ id: `e_${prevNodeId}_${sheetNodeId}`, source: prevNodeId, target: sheetNodeId });
            }
          }

          // Update workflowDraft definition
          parsed.workflowDraft.nodes = nodes;
          parsed.workflowDraft.edges = edges;

          // Fetch connected accounts in MongoDB
          let userConnections: any[] = [];
          try {
            userConnections = await ConnectionModel.find({ organizationId: orgId, status: 'connected' });
          } catch {}
          const connectedIds = new Set(userConnections.map((c) => c.connectorId));

          const connectorsList: string[] = Array.from(new Set(nodes.map((n: any) => n.connectorId)));
          const userConnectionsStatus = connectorsList.map((cid: string) => {
            const realCid = cid === 'gmail-read' ? 'gmail' : cid;
            return {
              connectorId: realCid,
              name:
                realCid === 'autoflow-schedule'
                  ? 'AutoFlow Schedule Trigger'
                  : realCid === 'ai-agent'
                  ? 'AI Processor Node'
                  : realCid === 'web-search'
                  ? 'Web Search & Scraper'
                  : realCid === 'google-sheets'
                  ? 'Google Sheets'
                  : realCid.charAt(0).toUpperCase() + realCid.slice(1),
              isConnected: realCid === 'autoflow-schedule' || realCid === 'ai-agent' || realCid === 'web-search' || connectedIds.has(realCid) || connectedIds.has('gmail') || connectedIds.has('google-sheets'),
            };
          });

          // Clean string escapes from LLM reply message
          const stepSummaryText = nodes.map((n: any, i: number) => `${i + 1}. **${n.name}** (${n.connectorId})`).join('\n');
          const replyMessage = `I've designed a **${nodes.length}-step** automated workflow for your request:\n\n${stepSummaryText}\n\nAll **${nodes.length} steps** have been auto-configured with field mappings and parameters. Click below to load onto your builder canvas!`;

          responseData = {
            replyMessage,
            isGreeting: false,
            workflowDraft: parsed.workflowDraft,
            suggestedConnectors: connectorsList,
            userConnectionsStatus,
          };
          logger.info(`[AIAgentService] Successfully compiled dynamic LLM DAG with ${nodes.length} steps!`);
        }
      } catch (parseErr) {
        logger.warn('[AIAgentService] Error parsing LLM JSON output, falling back to dynamic parser:', parseErr);
      }
    }

    // 2. Dynamic Fallback Builder if LLM call or JSON parsing fails
    if (!responseData) {
      responseData = await AIAgentService.buildDynamicFallbackWorkflow(lastUserMessage, lower, orgId);
    }

    // Persist chat message in MongoDB Atlas
    await AIAgentService.persistChat(messages, lastUserMessage, responseData, orgId, userId);

    return responseData;
  }

  /** Dynamic Fallback Generator without hardcoded restrictions */
  private static async buildDynamicFallbackWorkflow(lastUserMessage: string, lower: string, orgId: string) {
    const isWebSearch = lower.includes('search') || lower.includes('scraper') || lower.includes('job') || lower.includes('web');
    const isSlack = lower.includes('slack');
    const isGmail = (lower.includes('gmail') || lower.includes('inbox') || lower.includes('read email') || lower.includes('send email')) && !lower.includes('contact email');
    const isSheets = lower.includes('sheet') || lower.includes('excel') || lower.includes('spreadsheet');

    const limitMatch = lastUserMessage.match(/\b(\d+)\s*(?:jobs|results|listings)?\b/i);
    const maxResults = limitMatch ? Math.min(parseInt(limitMatch[1]), 25) : 20;

    const quotedMatch = lastUserMessage.match(/["']([A-Za-z0-9_\-\s]{2,60})["']/);
    const namedMatch = lastUserMessage.match(/named\s+["']?([A-Za-z0-9_\-]+)["']?/i) || lastUserMessage.match(/spreadsheet\s+["']?([A-Za-z0-9_\-]+)["']?/i);
    let spreadsheetId = isWebSearch ? 'React_Developer_Jobs_Log' : 'Daily_Email_Summaries_Log';
    if (quotedMatch && quotedMatch[1] && quotedMatch[1].toLowerCase() !== 'named' && quotedMatch[1].length > 2) {
      spreadsheetId = quotedMatch[1].trim().replace(/\s+/g, '_');
    } else if (namedMatch && namedMatch[1] && namedMatch[1].toLowerCase() !== 'named') {
      spreadsheetId = namedMatch[1].trim();
    }

    const suggestedConnectors: string[] = ['autoflow-schedule'];
    if (isWebSearch) suggestedConnectors.push('web-search');
    else if (isGmail) suggestedConnectors.push('gmail-read');
    suggestedConnectors.push('ai-agent');

    if (isSheets) suggestedConnectors.push('google-sheets');
    else if (isSlack) suggestedConnectors.push('slack');
    else suggestedConnectors.push('google-sheets');

    const nodes: any[] = [];
    const edges: any[] = [];

    suggestedConnectors.forEach((cid, idx) => {
      const nodeId = `node_${idx + 1}`;
      let operationId = 'execute';
      let name = `${cid.toUpperCase()} Step`;
      let config: Record<string, any> = {};
      let fieldMapping: Record<string, any> = {};

      if (cid === 'autoflow-schedule') {
        operationId = 'schedule_time';
        name = 'Schedule Trigger (Hourly)';
        config = { time: '09:00', frequency: 'daily' };
      } else if (cid === 'web-search') {
        operationId = 'search_web';
        name = 'Web Search & Scraper';
        const searchQuery = lower.includes('react') ? 'React developer jobs' : lastUserMessage;
        config = { query: searchQuery, maxResults };
        fieldMapping = { query: searchQuery, maxResults };
      } else if (cid === 'gmail-read') {
        operationId = 'read_emails';
        name = 'Gmail — Read Inbox Emails';
        config = { query: 'is:unread label:INBOX', maxResults: 5 };
      } else if (cid === 'ai-agent') {
        operationId = 'process_text';
        name = isWebSearch ? 'AI Job & Web Analyst' : 'AI Email Summarizer';
        config = { prompt: `Analyze output data and extract top ${maxResults} structured items with all relevant details:` };
        const prevId = `node_${idx}`;
        fieldMapping = { inputText: `{{${prevId}.output.topSnippet || ${prevId}.output.results || ${prevId}.output.emails || ${prevId}.output}}` };
      } else if (cid === 'google-sheets') {
        operationId = 'append_row';
        name = 'Google Sheets — Log Summary Row';
        const rowValueStr = `["{{trigger.output.triggeredAt}}", "Data Digest", "{{node_${idx}.output.summary || node_${idx}.output.result}}"]`;
        config = { spreadsheetId, worksheet: 'Sheet1', values: rowValueStr };
        fieldMapping = { spreadsheetId, worksheet: 'Sheet1', values: rowValueStr };
      }

      nodes.push({
        id: nodeId,
        type: idx === 0 ? 'trigger' : cid === 'ai-agent' ? 'ai-agent' : 'action',
        connectorId: cid === 'gmail-read' ? 'gmail' : cid,
        operationId,
        name,
        config,
        fieldMapping,
        position: { x: 250, y: 80 + idx * 180 },
      });

      if (idx > 0) {
        edges.push({ id: `e_node_${idx}_${nodeId}`, source: `node_${idx}`, target: nodeId });
      }
    });

    const stepSummaryText = nodes.map((n, i) => `${i + 1}. **${n.name}** (${n.connectorId})`).join('\n');
    return {
      replyMessage: `I've designed a **${nodes.length}-step** automated workflow for your request:\n\n${stepSummaryText}\n\nAll steps have been dynamically configured. Click below to open on canvas!`,
      isGreeting: false,
      workflowDraft: {
        name: `Workflow: ${lastUserMessage.slice(0, 40)}`,
        description: `AutoFlow ${nodes.length}-step pipeline for: "${lastUserMessage}"`,
        nodes,
        edges,
      },
      suggestedConnectors,
      userConnectionsStatus: [],
    };
  }

  private static async persistChat(messages: ChatMessage[], lastUserMessage: string, responseData: any, orgId: string, userId: string) {
    try {
      const userMessageObj = { id: `user_${Date.now()}`, role: 'user' as const, content: lastUserMessage };
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
        { $push: { messages: { $each: [userMessageObj, aiMessageObj] } } },
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      logger.error('[AIAgentService] Error persisting chat message to DB:', dbErr);
    }
  }

  /** Direct Gemini API call returning raw JSON */
  private static async callGeminiJSON(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: DYNAMIC_WORKFLOW_SYSTEM_PROMPT }] },
            ...messages.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );
    const data = await response.json();
    if (data.error) throw new Error(`Gemini API error: ${data.error.message}`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /** Direct Groq API call returning raw JSON */
  private static async callGroqJSON(messages: ChatMessage[]): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: DYNAMIC_WORKFLOW_SYSTEM_PROMPT },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(`Groq API error: ${data.error.message}`);
    return data.choices?.[0]?.message?.content || '';
  }
}
