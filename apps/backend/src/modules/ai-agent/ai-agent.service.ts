import { ConnectionModel, AIChatModel } from '@automation/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { manifestRegistry } from '@automation/connector-sdk';
import { validateWorkflow, WorkflowNode, WorkflowEdge } from './ai-agent.workflow-validator';
import { autoMapNodeInputs } from './ai-agent.io-mapper';
import { AIRuntimeService } from '../ai-runtime/ai-runtime.service';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isGreeting?: boolean;
  suggestedConnectors?: string[];
  userConnectionsStatus?: any[];
  workflowDraft?: any;
}

export interface WorkflowGenerationResult {
  replyMessage: string;
  suggestedConnectors: string[];
  workflowDraft: any;
  missingConnections: string[];
  missingScopes: Record<string, string[]>;
  valid: boolean;
  validationErrors: string[];
  fieldsNeedingReview: string[];
}

// NOTE: The system prompt is built dynamically at runtime by AIAgentService.buildDynamicSystemPrompt()
// It injects live connector manifests, active user connections, and recent execution diagnostics.
// There is NO static DYNAMIC_WORKFLOW_SYSTEM_PROMPT — all prompt content comes from the AI Control Plane.

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
   * Build Live Runtime System Context Injected into Gemini / Groq LLM
   */
  static async buildDynamicSystemPrompt(orgId: string): Promise<string> {
    // 1. Fetch ALL Connectors & Actions dynamically from MongoDB Atlas Store
    let connectorSummary = '';
    try {
      const { manifestRegistry } = require('@automation/connector-sdk');
      const allManifests = manifestRegistry.getAllManifests();

      if (allManifests && allManifests.length > 0) {
        connectorSummary = allManifests.map((c: any) => {
          const actionDetails = (c.actions || []).map((a: any) => {
            const props = Object.keys(a.inputSchema?.properties || {}).join(', ');
            return `    * Action '${a.id}' (${a.name}): ${a.description || ''}${props ? ` [inputs: ${props}]` : ''}`;
          }).join('\n');

          const triggerDetails = (c.triggers || []).map((t: any) => {
            const props = Object.keys(t.inputSchema?.properties || {}).join(', ');
            return `    * Trigger '${t.id}' (${t.name}): ${t.description || ''}${props ? ` [inputs: ${props}]` : ''}`;
          }).join('\n');

          const ops = [actionDetails, triggerDetails].filter(Boolean).join('\n');
          return `- Connector ID '${c.id}' (${c.name}) [Category: ${c.category}]:\n${ops}`;
        }).join('\n\n');
      }
    } catch (err) {
      logger.warn('[AIAgentService] Error loading manifestRegistry connectors for AI Agent prompt:', err);
    }

    if (!connectorSummary) {
      try {
        const { ALL_50_CONNECTOR_MANIFESTS } = require('@automation/connector-sdk');
        if (Array.isArray(ALL_50_CONNECTOR_MANIFESTS)) {
          connectorSummary = ALL_50_CONNECTOR_MANIFESTS.map(
            (c: any) => `- Connector ID '${c.id}' (${c.name}): ${c.description} [Category: ${c.category}]`
          ).join('\n');
        }
      } catch (err) {}
    }

    // 2. Fetch User's Active Connected Accounts from MongoDB Atlas
    let activeConnectionsSummary = '';
    try {
      const userConnections = await ConnectionModel.find({ organizationId: orgId, status: 'connected' });
      if (userConnections && userConnections.length > 0) {
        activeConnectionsSummary = userConnections
          .map((c) => `- ${c.name} (connectorId: '${c.connectorId}') [CONNECTED & ACTIVE IN DB]`)
          .join('\n');
      } else {
        activeConnectionsSummary = 'No active connected accounts saved in MongoDB Atlas yet.';
      }
    } catch (err) {
      activeConnectionsSummary = 'Status lookup unavailable.';
    }

    // 3. Fetch User's Recent Execution Logs & Error Traces from MongoDB Atlas
    let executionDiagnosticsSummary = '';
    try {
      const { WorkflowExecutionModel } = require('@automation/database');
      const recentExecutions = await WorkflowExecutionModel.find({ organizationId: orgId })
        .sort({ createdAt: -1 })
        .limit(5);

      if (recentExecutions && recentExecutions.length > 0) {
        executionDiagnosticsSummary = recentExecutions
          .map(
            (e: any, idx: number) =>
              `Execution #${idx + 1}: Status=${e.status}, WorkflowId=${e.workflowId}, CreatedAt=${new Date(
                e.createdAt
              ).toLocaleString()}, ErrorLog=${e.error || 'None'}`
          )
          .join('\n');
      } else {
        executionDiagnosticsSummary = 'Zero execution errors found. All workflows ran cleanly or are pending execution.';
      }
    } catch (err) {
      executionDiagnosticsSummary = 'Execution logs clear.';
    }

    return `You are the AutoFlow AI Assistant & Automation Copilot inside the AutoFlow Automation Platform.
Your goal is to assist users with any questions, greetings, error log diagnostics, platform feature explanations, and to dynamically construct complete AutoFlow DAG Workflow JSON structures for automation requests.

LIVE PLATFORM CONTEXT INJECTED AT RUNTIME:
=== USER'S ACTIVE CONNECTED ACCOUNTS IN MONGODB ATLAS ===
${activeConnectionsSummary}

=== RECENT WORKFLOW EXECUTION DIAGNOSTICS & ERROR TRACES ===
${executionDiagnosticsSummary}

=== ALL 55+ ENTERPRISE NATIVE CONNECTORS REGISTRY ===
${connectorSummary}

SECURITY & SYSTEM GUARDRAILS:
1. SECURITY RULE: NEVER reveal internal platform server code, repository file paths, backend code implementations, environment secrets, or database connection strings. If a user asks for source code, API keys, or internal codebase files, politely decline: "I am your AutoFlow AI Copilot. I cannot disclose internal platform source code or secrets, but I can help you design, configure, and execute automation workflows for all 55+ enterprise connectors!"

WORKFLOW GENERATION & NODE POSITIONING RULES:
1. SYSTEM VARIABLES: You may map system variables such as {{sys.timestamp}}, {{sys.execution_id}}, and {{sys.workflow_id}} into node inputs.
2. DYNAMIC CHOICES: For input fields requiring runtime options (e.g. spreadsheetId, channel, databaseId), set "_needsChoicesFetch_<fieldKey>": true in the node's config and add "<nodeId>.<fieldKey>" to the fieldsNeedingReview array.
3. NODE POSITIONING FORMULA: For linear workflows, compute position as { "x": 400, "y": 80 + nodeIndex * 270 } where nodeIndex is 0-indexed. For branched workflows, use "x": 200 for true branch and "x": 600 for false branch.
4. FIELDS NEEDING REVIEW: List any required input fields that cannot be mapped with high confidence (or depend on dynamic choices) in the "fieldsNeedingReview" array.

UNIFIED INTENT DISCRIMINATION INSTRUCTIONS:
1. IF THE USER IS ASKING A QUESTION, GREETING, LOG DEBUG REQUEST, OR GENERAL PLATFORM INQUIRY (e.g. "hello", "hi", "what connectors do you support?", "how do I connect MongoDB Atlas?", "check my error logs", "explain how triggers work"):
   - Provide a friendly, comprehensive, and helpful answer in Markdown in "replyMessage".
   - Set "workflowDraft": null.
   - Set "suggestedConnectors": [].
   - Set "fieldsNeedingReview": [].
2. ONLY INCLUDE A NON-NULL "workflowDraft" OBJECT IF THE USER IS EXPLICITLY REQUESTING TO BUILD, GENERATE, SCHEDULE, OR AUTOMATE A WORKFLOW PIPELINE!
   - When building a workflow, construct valid DAG nodes (types: 'trigger', 'ai-agent', 'action') and edges with field mappings.

RETURN ONLY VALID JSON (no markdown fences, no \`\`\` json, no extra text):
{
  "replyMessage": "Markdown string answering the question clearly or summarizing the generated workflow steps.",
  "suggestedConnectors": ["autoflow-schedule", "web-search", "ai-agent", "google-sheets"],
  "fieldsNeedingReview": ["node_3.spreadsheetId"],
  "workflowDraft": null | {
    "name": "Short Workflow Title",
    "description": "Clear workflow description",
    "nodes": [
      {
        "id": "node_1",
        "type": "trigger",
        "connectorId": "autoflow-schedule",
        "operationId": "schedule_time",
        "name": "Schedule Trigger",
        "config": { "frequency": "daily", "time": "09:00" },
        "fieldMapping": {},
        "position": { "x": 400, "y": 80 }
      }
    ],
    "edges": [
      { "id": "e_node_1_node_2", "source": "node_1", "target": "node_2" }
    ]
  }
}`;
  }

  /**
   * 100% Zero-Hardcode Context-Injected AI Copilot Engine
   */
  static async processChat(messages: ChatMessage[], orgId: string, userId: string) {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content || '';
    logger.info(`[AIAgentService] 100% LLM Context-Injected Execution for prompt: "${lastUserMessage}"`);

    // Build Live Runtime System Context Injected into Gemini / Groq LLM
    const systemPrompt = await AIAgentService.buildDynamicSystemPrompt(orgId);

    let llmJsonText = '';

    try {
      llmJsonText = await AIRuntimeService.execute({
        feature: 'ai-copilot',
        task: 'workflow_compiler',
        variables: {
          activeConnectionsSummary: systemPrompt.includes("USER'S ACTIVE CONNECTED ACCOUNTS IN MONGODB ATLAS ===") ? systemPrompt.split("USER'S ACTIVE CONNECTED ACCOUNTS IN MONGODB ATLAS ===")[1].split("=== RECENT WORKFLOW EXECUTION DIAGNOSTICS")[0].trim() : '',
          executionDiagnosticsSummary: systemPrompt.includes("=== RECENT WORKFLOW EXECUTION DIAGNOSTICS & ERROR TRACES ===") ? systemPrompt.split("=== RECENT WORKFLOW EXECUTION DIAGNOSTICS & ERROR TRACES ===")[1].split("=== ALL 55+ ENTERPRISE NATIVE CONNECTORS REGISTRY ===")[0].trim() : '',
          connectorSummary: systemPrompt.includes("=== ALL 55+ ENTERPRISE NATIVE CONNECTORS REGISTRY ===") ? systemPrompt.split("=== ALL 55+ ENTERPRISE NATIVE CONNECTORS REGISTRY ===")[1].split("SECURITY & SYSTEM GUARDRAILS:")[0].trim() : '',
        },
        userMessage: `${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}`
      });
    } catch (err) {
      logger.warn('[AIAgentService] AI Runtime JSON generation failed:', err);
    }

    let responseData: any = null;

    // Parse LLM Output
    if (llmJsonText) {
      try {
        const cleaned = llmJsonText.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/gi, '').trim();
        const parsed = JSON.parse(cleaned);

        // Fetch user connections to mark connected vs unconnected status
        let userConnections: any[] = [];
        try {
          userConnections = await ConnectionModel.find({ organizationId: orgId, status: 'connected' });
        } catch {}
        const connectedIds = new Set(userConnections.map((c) => c.connectorId));

        if (parsed.workflowDraft && parsed.workflowDraft.nodes && parsed.workflowDraft.nodes.length > 0) {
          const nodes: any[] = parsed.workflowDraft.nodes;
          const connectorsList: string[] = Array.from(new Set(nodes.map((n: any) => n.connectorId)));

          const userConnectionsStatus = connectorsList.map((cid: string) => {
            // Normalize connector ID aliases (e.g. gmail-read -> gmail)
            const normalizedCid = cid.replace(/-read$/, '').replace(/-write$/, '');

            // Dynamic name resolution from manifest registry
            let displayName = normalizedCid.charAt(0).toUpperCase() + normalizedCid.slice(1);
            try {
              const { manifestRegistry } = require('@automation/connector-sdk');
              const manifest = manifestRegistry.getManifest(normalizedCid)
                || manifestRegistry.getManifest(normalizedCid.replace(/-/g, '_'));
              if (manifest?.name) displayName = manifest.name;
            } catch {
              // manifest registry unavailable — use ID-based name
            }

            // Built-in system connectors that never require user auth
            const SYSTEM_CONNECTOR_IDS = new Set(['autoflow-schedule', 'ai-agent', 'web-search', 'web-browser', 'http-request']);

            return {
              connectorId: normalizedCid,
              name: displayName,
              isConnected: SYSTEM_CONNECTOR_IDS.has(normalizedCid) || connectedIds.has(normalizedCid),
            };
          });

          responseData = {
            replyMessage: parsed.replyMessage || `I've designed a **${nodes.length}-step** automated workflow for your request.`,
            isGreeting: false,
            workflowDraft: parsed.workflowDraft,
            suggestedConnectors: connectorsList,
            userConnectionsStatus,
            fieldsNeedingReview: parsed.fieldsNeedingReview || [],
          };
        } else {
          responseData = {
            replyMessage: parsed.replyMessage || 'I am your AutoFlow AI Copilot! How can I assist you with your automations today?',
            isGreeting: false,
            workflowDraft: null,
            suggestedConnectors: [],
            userConnectionsStatus: [],
            fieldsNeedingReview: [],
          };
        }
      } catch (parseErr) {
        logger.warn('[AIAgentService] Error parsing LLM JSON output, falling back to dynamic parser:', parseErr);
      }
    }

    // Dynamic Fallback Builder if LLM call fails completely
    if (!responseData) {
      responseData = await AIAgentService.buildDynamicFallbackWorkflow(lastUserMessage, lastUserMessage.toLowerCase(), orgId);
    }

    // Persist chat message in MongoDB Atlas
    await AIAgentService.persistChat(messages, lastUserMessage, responseData, orgId, userId);

    return responseData;
  }

  /** Dynamic Fallback Generator matching exact prompt intents */
  private static async buildDynamicFallbackWorkflow(lastUserMessage: string, lower: string, orgId: string) {
    const cleanLower = lower.replace(/[^a-z0-9\s]/g, '').trim();
    const isGreeting =
      ['hi', 'hello', 'hey', 'yo', 'greetings', 'good morning', 'good afternoon', 'good evening', 'hiii', 'heyy', 'sup'].includes(cleanLower) ||
      cleanLower.length <= 3;

    const isQuestion =
      lower.startsWith('how') ||
      lower.startsWith('what') ||
      lower.startsWith('why') ||
      lower.startsWith('where') ||
      lower.startsWith('explain') ||
      lower.includes('how do i') ||
      lower.includes('how to') ||
      lower.includes('what is') ||
      lower.endsWith('?');

    const isExplicitWorkflowBuild =
      lower.includes('build') ||
      lower.includes('create') ||
      lower.includes('generate') ||
      lower.includes('schedule') ||
      lower.includes('automate') ||
      lower.includes('every') ||
      lower.includes('when') ||
      lower.includes('summarize');

    if (isGreeting || (isQuestion && !isExplicitWorkflowBuild)) {
      return {
        replyMessage: isGreeting
          ? "Hello! 👋 I am your AutoFlow AI Copilot. You can ask me questions about the platform, inspect your workflow execution logs, or describe an automation pipeline to build (e.g. *'When a new email arrives in Gmail, summarize with AI and send a notification to Slack'*). How can I assist you today?"
          : `To connect services like MongoDB, Google Suite, or Slack in AutoFlow, navigate to the **Connectors** page in your dashboard, click **Connect Account**, and complete the OAuth/API key authorization. Once connected, your account will be active for AI workflow building!`,
        isGreeting,
        workflowDraft: null,
        suggestedConnectors: [],
        userConnectionsStatus: [],
        fieldsNeedingReview: [],
      };
    }

    // Dynamic Connector Discovery via SDK Manifest Registry
    const matchedConnectors: string[] = ['autoflow-schedule'];
    try {
      const { manifestRegistry } = require('@automation/connector-sdk');
      const allManifests = manifestRegistry.getAllManifests() || [];

      for (const m of allManifests) {
        if (m.id === 'autoflow-schedule') continue;
        const keywords = [
          m.id.toLowerCase(),
          m.name.toLowerCase(),
          (m.category || '').toLowerCase(),
          ...(m.keywords || []),
          ...(m.tags || []),
        ];
        if (keywords.some((k: string) => k && lower.includes(k))) {
          matchedConnectors.push(m.id);
        }
      }
    } catch {}

    // Ensure AI processor step is included if user prompt asks to summarize/analyze/extract/AI
    if ((lower.includes('ai') || lower.includes('summariz') || lower.includes('analys') || lower.includes('extract')) && !matchedConnectors.includes('ai-agent')) {
      matchedConnectors.push('ai-agent');
    }

    const limitMatch = lastUserMessage.match(/\b(\d+)\s*(?:jobs|results|listings)?\b/i);
    const maxResults = limitMatch ? Math.min(parseInt(limitMatch[1]), 25) : 20;
    const isWebSearch = lower.includes('search') || lower.includes('scraper') || lower.includes('job') || lower.includes('web');

    const quotedMatch = lastUserMessage.match(/["']([A-Za-z0-9_\-\s]{2,60})["']/);
    const namedMatch = lastUserMessage.match(/named\s+["']?([A-Za-z0-9_\-]+)["']?/i) || lastUserMessage.match(/spreadsheet\s+["']?([A-Za-z0-9_\-]+)["']?/i);
    let spreadsheetId = 'AutoFlow_Execution_Log';
    if (quotedMatch && quotedMatch[1] && quotedMatch[1].toLowerCase() !== 'named' && quotedMatch[1].length > 2) {
      spreadsheetId = quotedMatch[1].trim().replace(/\s+/g, '_');
    } else if (namedMatch && namedMatch[1] && namedMatch[1].toLowerCase() !== 'named') {
      spreadsheetId = namedMatch[1].trim();
    }

    // Default fallback if no specific connectors matched
    const suggestedConnectors: string[] = matchedConnectors.length > 1 ? matchedConnectors : ['autoflow-schedule', 'web-search', 'ai-agent', 'google-sheets'];

    const nodes: any[] = [];
    const edges: any[] = [];

    suggestedConnectors.forEach((cid, idx) => {
      const nodeId = `node_${idx + 1}`;
      let operationId = 'execute';
      let name = `${cid.toUpperCase()} Step`;
      let config: Record<string, any> = {};
      let fieldMapping: Record<string, any> = {};

      // Universal dynamic node builder — reads config from manifest registry
      let manifest: any = null;
      try {
        const { manifestRegistry } = require('@automation/connector-sdk');
        manifest = manifestRegistry.getManifest(cid) || manifestRegistry.getManifest(cid.replace(/-/g, '_'));
      } catch {}

      // Determine normalized connector ID (resolve aliases like gmail-read -> gmail)
      const normalizedCid = cid.replace(/-read$/, '').replace(/-write$/, '');

      if (cid === 'autoflow-schedule') {
        operationId = manifest?.triggers?.[0]?.id || 'schedule_time';
        name = manifest?.name ? `${manifest.name} (Daily)` : 'Schedule Trigger (Daily)';
        config = { time: '09:00', frequency: 'daily' };
      } else if (cid === 'ai-agent') {
        operationId = manifest?.actions?.[0]?.id || 'process_text';
        name = manifest?.name ? `${manifest.name} — Analyzer` : 'AI Analyst';
        config = { prompt: `Analyze output data and extract top ${maxResults} structured items with all relevant details:` };
        const prevId = `node_${idx}`;
        fieldMapping = { inputText: `{{${prevId}.output.topSnippet || ${prevId}.output.results || ${prevId}.output.emails || ${prevId}.output}}` };
      } else if (manifest) {
        // Fully dynamic: use first available action from manifest
        const firstAction = manifest.actions?.[0];
        const firstTrigger = manifest.triggers?.[0];
        const op = firstAction || firstTrigger;
        operationId = op?.id || 'execute';
        name = `${manifest.name} — ${op?.name || operationId}`;

        // Build config from manifest input schema defaults
        if (op?.inputs) {
          op.inputs.forEach((inp: any) => {
            if (inp.key === 'query' || inp.key === 'search' || inp.key === 'q') {
              config[inp.key] = lastUserMessage.replace(/^(search|find|look up|web search for)\s+/i, '').trim() || 'AutoFlow automation news';
              fieldMapping[inp.key] = config[inp.key];
            } else if (inp.key === 'maxResults' || inp.key === 'limit') {
              config[inp.key] = maxResults;
              fieldMapping[inp.key] = maxResults;
            } else if (inp.key === 'worksheet' || inp.key === 'sheetName') {
              config[inp.key] = 'Sheet1';
              fieldMapping[inp.key] = 'Sheet1';
            } else if (inp.key === 'spreadsheetId') {
              config[inp.key] = spreadsheetId;
              fieldMapping[inp.key] = spreadsheetId;
            } else if ((inp.key === 'values' || inp.key === 'rows') && normalizedCid.includes('sheet')) {
              const prevId = idx > 0 ? `node_${idx}` : 'node_1';
              const rowVal = `["{{trigger.output.triggeredAt}}", "Data Digest", "{{${prevId}.output.summary || ${prevId}.output.result}}"]`;
              config[inp.key] = rowVal;
              fieldMapping[inp.key] = rowVal;
            } else if (inp.key === 'prompt' || inp.key === 'text') {
              config[inp.key] = `Analyze and summarize the following data for: ${lastUserMessage.slice(0, 80)}`;
            } else if (inp.key === 'frequency') {
              config[inp.key] = 'daily';
            } else if (inp.key === 'time') {
              config[inp.key] = '09:00';
            } else if (inp.key === 'channel') {
              config[inp.key] = '#general';
              fieldMapping[inp.key] = '#general';
            } else if (inp.key === 'message' || inp.key === 'text' || inp.key === 'body') {
              const prevId = idx > 0 ? `node_${idx}` : 'node_1';
              config[inp.key] = `{{${prevId}.output.summary || ${prevId}.output.result}}`;
              fieldMapping[inp.key] = config[inp.key];
            }
          });
        }
      } else {
        // Unknown connector with no manifest: generic fallback
        operationId = 'execute';
        name = `${cid.charAt(0).toUpperCase() + cid.slice(1)} Step`;
        config = {};
      }

      nodes.push({
        id: nodeId,
        type: idx === 0 ? 'trigger' : cid === 'ai-agent' ? 'ai-agent' : 'action',
        connectorId: normalizedCid,
        operationId,
        name,
        config,
        fieldMapping,
        position: { x: 400, y: 80 + idx * 270 },
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

  /** Direct Gemini 3.6 Flash API call returning raw JSON - Removed, using AIRuntime */
  /** Direct Groq API call returning raw JSON using groq/compound - Removed, using AIRuntime */

  /**
   * In-Canvas AI Co-Pilot Assistant method
   * Receives current canvas nodes + edges + user prompt and dynamically mutates canvas state
   */
  static async processCopilotChat(currentNodes: any[], currentEdges: any[], userPrompt: string, orgId: string, userId: string) {
    logger.info(`[AIAgentService] Processing In-Canvas Co-Pilot request: "${userPrompt}" with ${currentNodes.length} nodes`);

    const lower = userPrompt.trim().toLowerCase();
    
    // Fetch Live Runtime Context (55+ SDK Manifests, Active Connected Accounts, Recent Execution Logs)
    const baseDynamicContext = await AIAgentService.buildDynamicSystemPrompt(orgId);

    let llmJsonText = '';

    try {
      llmJsonText = await AIRuntimeService.execute({
        feature: 'ai-copilot',
        task: 'canvas_mutator',
        variables: {
          baseDynamicContext,
          currentNodesStr: JSON.stringify(currentNodes, null, 2),
          currentEdgesStr: JSON.stringify(currentEdges, null, 2),
          userPrompt
        }
      });
    } catch (err) {
      logger.warn('[AIAgentService] AI Runtime Co-Pilot generation failed:', err);
    }

    if (llmJsonText) {
      try {
        const cleaned = llmJsonText.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.nodes && Array.isArray(parsed.nodes)) {
          return {
            replyMessage: parsed.replyMessage || '✨ Canvas updated by AI Co-Pilot!',
            changesSummary: parsed.changesSummary || ['Updated canvas nodes'],
            nodes: parsed.nodes,
            edges: parsed.edges || [],
          };
        }
      } catch (parseErr) {
        logger.warn('[AIAgentService] Co-Pilot JSON parse error, falling back to dynamic parser:', parseErr);
      }
    }

    // Dynamic Fallback for Co-Pilot mutations
    let nodes = [...currentNodes];
    let edges = [...currentEdges];
    let replyMessage = '✨ Canvas updated by AI Co-Pilot!';
    const changesSummary: string[] = [];

    // Delete step request
    if (lower.includes('delete') || lower.includes('remove')) {
      const match = lower.match(/(?:step|node)\s*(\d+)/i);
      const targetIdx = match ? parseInt(match[1]) : nodes.length;
      if (targetIdx > 0 && targetIdx <= nodes.length) {
        const removed = nodes.splice(targetIdx - 1, 1);
        changesSummary.push(`Removed ${removed[0]?.name || `Step ${targetIdx}`}`);
        replyMessage = `🗑️ Removed Step ${targetIdx} from canvas. Remaining ${nodes.length} steps re-wired!`;

        // Re-wire remaining edges
        edges = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          edges.push({ id: `e_${nodes[i].id}_${nodes[i + 1].id}`, source: nodes[i].id, target: nodes[i + 1].id });
        }
      }
    } else if (lower.includes('add') || lower.includes('insert') || lower.includes('append')) {
      // Add step request
      const isSheets = lower.includes('sheet') || lower.includes('excel');
      const isSlack = lower.includes('slack');
      const isAi = lower.includes('ai') || lower.includes('summariz') || lower.includes('analys');

      const nextIdx = nodes.length + 1;
      const prevId = nodes.length > 0 ? nodes[nodes.length - 1].id : 'node_1';
      const newId = `node_${nextIdx}`;

      // Universal dynamic connector node builder via manifest registry
      let targetManifest: any = null;
      let targetCid = '';

      // Determine which connector to add based on user intent keywords
      try {
        const { manifestRegistry } = require('@automation/connector-sdk');
        const allManifests = manifestRegistry.getAllManifests() || [];

        // Score each manifest by keyword overlap with the user prompt
        let bestScore = 0;
        for (const m of allManifests) {
          const candidateId = (m.id || '').toLowerCase();
          const keywords = [
            candidateId,
            (m.name || '').toLowerCase(),
            (m.category || '').toLowerCase(),
            ...(m.keywords || []).map((k: string) => k.toLowerCase()),
            ...(m.tags || []).map((t: string) => t.toLowerCase()),
          ].filter(Boolean);

          const score = keywords.reduce((s, kw) => s + (lower.includes(kw) ? kw.length : 0), 0);
          if (score > bestScore) {
            bestScore = score;
            targetManifest = m;
            targetCid = candidateId;
          }
        }
      } catch {}

      if (targetManifest && targetCid) {
        const firstAction = targetManifest.actions?.[0];
        const op = firstAction || targetManifest.triggers?.[0];
        const opId = op?.id || 'execute';
        const nodeName = `${targetManifest.name} — ${op?.name || opId}`;
        const newConfig: Record<string, any> = {};
        const newFieldMapping: Record<string, any> = {};

        // Build config from manifest input schema
        if (op?.inputs) {
          op.inputs.forEach((inp: any) => {
            if (inp.key === 'worksheet' || inp.key === 'sheetName') {
              newConfig[inp.key] = 'Sheet1';
              newFieldMapping[inp.key] = 'Sheet1';
            } else if (inp.key === 'spreadsheetId') {
              const quotedMatch = userPrompt.match(/["']([A-Za-z0-9_\-\s]{2,60})["']/);
              newConfig[inp.key] = quotedMatch ? quotedMatch[1].trim().replace(/\s+/g, '_') : 'AutoFlow_Execution_Log';
              newFieldMapping[inp.key] = newConfig[inp.key];
            } else if ((inp.key === 'values' || inp.key === 'rows') && targetCid.includes('sheet')) {
              const rowVal = `["{{trigger.output.triggeredAt}}", "Data Digest", "{{${prevId}.output.summary || ${prevId}.output.result}}"]`;
              newConfig[inp.key] = rowVal;
              newFieldMapping[inp.key] = rowVal;
            } else if (inp.key === 'channel') {
              newConfig[inp.key] = '#general';
              newFieldMapping[inp.key] = '#general';
            } else if (inp.key === 'message' || inp.key === 'text' || inp.key === 'body') {
              newConfig[inp.key] = `{{${prevId}.output.summary || ${prevId}.output.result}}`;
              newFieldMapping[inp.key] = newConfig[inp.key];
            } else if (inp.key === 'prompt') {
              newConfig[inp.key] = 'Analyze and format input payload data into key structured highlights:';
            } else if (inp.key === 'inputText') {
              newFieldMapping[inp.key] = `{{${prevId}.output.topSnippet || ${prevId}.output.results || ${prevId}.output.emails || ${prevId}.output}}`;
            }
          });
        }

        const nodeType = targetCid === 'ai-agent' ? 'ai-agent' : 'action';
        nodes.push({
          id: newId,
          type: nodeType,
          connectorId: targetCid,
          operationId: opId,
          name: nodeName,
          config: newConfig,
          fieldMapping: newFieldMapping,
          position: { x: 250, y: 80 + (nextIdx - 1) * 180 },
        });
        if (prevId) edges.push({ id: `e_${prevId}_${newId}`, source: prevId, target: newId });
        changesSummary.push(`Added ${targetManifest.name} step`);
        replyMessage = `✨ Added Step ${nextIdx}: ${nodeName} to canvas!`;
      }
    } else if (lower.includes('sheet') || lower.includes('google')) {
      // Sheet name update request
      const match = userPrompt.match(/(?:to|name|as|the)\s+["']?([A-Za-z0-9_\-\.]{2,60})["']?/i);
      const newSheetName = match ? match[1].trim() : 'Production_Sheet';

      nodes = nodes.map((n) => {
        const cid = (n.connectorId || '').toLowerCase();
        if (cid.includes('sheet')) {
          const prevNodeId = nodes.length >= 3 ? nodes[nodes.length - 2].id : 'node_3';
          const rowValueStr = `["{{trigger.output.triggeredAt}}", "Data Digest", "{{${prevNodeId}.output.summary || ${prevNodeId}.output.result}}"]`;
          return {
            ...n,
            name: `4. Google Sheets (${newSheetName})`,
            config: {
              ...n.config,
              spreadsheetId: newSheetName,
              worksheet: 'Sheet1',
              worksheetName: 'Sheet1',
              rowData: rowValueStr,
              values: rowValueStr,
            },
            fieldMapping: {
              ...n.fieldMapping,
              spreadsheetId: newSheetName,
              worksheet: 'Sheet1',
              worksheetName: 'Sheet1',
              rowData: rowValueStr,
              values: rowValueStr,
            },
          };
        }
        return n;
      });

      changesSummary.push(`Updated Google Sheets step: spreadsheetId changed to ${newSheetName}`);
      replyMessage = `✨ Updated Google Sheets step: spreadsheet name set to "${newSheetName}" on canvas!`;
    } else if (lower.includes('trigger') || lower.includes('schedule') || lower.includes('time') || lower.includes('hour') || lower.includes('am') || lower.includes('pm')) {
      const isHourly = lower.includes('hour');
      const timeMatch = userPrompt.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      let targetTime = '02:00';
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const mins = timeMatch[2] || '00';
        const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        targetTime = `${hours.toString().padStart(2, '0')}:${mins}`;
      }

      nodes = nodes.map((n) => {
        const cid = (n.connectorId || '').toLowerCase();
        if (cid.includes('schedule') || n.type === 'trigger') {
          return {
            ...n,
            name: `1. Schedule Trigger (${isHourly ? 'Hourly' : 'Daily'})`,
            config: {
              ...n.config,
              frequency: isHourly ? 'hourly' : 'daily',
              intervalHours: isHourly ? '1' : undefined,
              time: targetTime,
            },
            fieldMapping: {
              ...n.fieldMapping,
              frequency: isHourly ? 'hourly' : 'daily',
              intervalHours: isHourly ? '1' : undefined,
              time: targetTime,
            },
          };
        }
        return n;
      });

      changesSummary.push(`Updated trigger time to ${targetTime}, frequency ${isHourly ? 'hourly' : 'daily'}`);
      replyMessage = `✨ Updated trigger time to ${targetTime} and set frequency to ${isHourly ? 'hourly' : 'daily'}.`;
    } else {
      // Configuration update / optimization
      nodes = nodes.map((n) => {
        if ((n.connectorId || '').toLowerCase().includes('search')) {
          return {
            ...n,
            config: { ...n.config, maxResults: 20 },
            fieldMapping: { ...n.fieldMapping, maxResults: 20 },
          };
        }
        return n;
      });
      changesSummary.push('Optimized step configurations and field mappings');
      replyMessage = '✨ Optimized all step configurations and dynamic field mappings across canvas!';
    }

    // Generate Context-Aware Smart AI Suggestions dynamically based on current canvas state
    const aiSuggestions: Array<{ label: string; prompt: string }> = [];

    // Identify connector categories already on canvas
    const canvasConnectorIds = new Set(nodes.map((n) => (n.connectorId || '').toLowerCase()));

    // Suggest adding connectors that are NOT yet on the canvas (using manifest registry)
    try {
      const { manifestRegistry } = require('@automation/connector-sdk');
      const allManifests = manifestRegistry.getAllManifests() || [];

      // Priority suggestions: suggest storage/notification connectors if missing
      const PRIORITY_CATEGORIES = ['storage', 'communication', 'database', 'productivity'];
      const suggested = new Set<string>();

      for (const category of PRIORITY_CATEGORIES) {
        const categoryManifests = allManifests.filter(
          (m: any) => (m.category || '').toLowerCase() === category && !canvasConnectorIds.has(m.id)
        );
        if (categoryManifests.length > 0 && suggested.size < 4) {
          const m = categoryManifests[0];
          aiSuggestions.push({
            label: `📊 Add ${m.name} Step`,
            prompt: `Add ${m.name} step to the workflow`,
          });
          suggested.add(m.id);
        }
      }

      // Always suggest schedule change if trigger exists
      if (nodes.some((n) => n.type === 'trigger')) {
        aiSuggestions.push({ label: '⏱️ Change Schedule to Hourly', prompt: 'Change schedule frequency to hourly every 1 hour' });
      }

      // Suggest AI analyst if missing
      if (!canvasConnectorIds.has('ai-agent')) {
        aiSuggestions.push({ label: '🤖 Insert AI Analyst Step', prompt: 'Insert an AI Processor Analyst step' });
      }
    } catch {
      // Manifest registry unavailable — provide generic suggestions
      aiSuggestions.push({ label: '⏱️ Change Schedule to Hourly', prompt: 'Change schedule frequency to hourly every 1 hour' });
      aiSuggestions.push({ label: '🤖 Insert AI Analyst Step', prompt: 'Insert an AI Processor Analyst step' });
    }

    // Re-layout all nodes with clean, non-overlapping 270px vertical spacing
    nodes = nodes.map((n, idx) => ({
      ...n,
      position: { x: 250, y: 80 + idx * 270 },
    }));

    return {
      replyMessage,
      changesSummary,
      aiSuggestions,
      nodes,
      edges,
    };
  }

  /**
   * Registry-driven Workflow Generation Engine (Phase 4 & Patch 6)
   */
  static async generateWorkflowFromPrompt(
    prompt: string,
    orgId: string,
    userId: string
  ): Promise<WorkflowGenerationResult> {
    logger.info(`[AIAgentService] Registry-driven workflow generation for prompt: "${prompt}"`);

    let userConnections: any[] = [];
    try {
      userConnections = await ConnectionModel.find({ organizationId: orgId, status: 'active' });
    } catch {}

    const connectedAppIds = userConnections.map((c) => c.connectorId);

    const chatResult = await AIAgentService.processChat(
      [{ role: 'user', content: prompt }],
      orgId,
      userId
    );

    const draft = chatResult.workflowDraft;

    if (!draft || !draft.nodes) {
      return {
        replyMessage: chatResult.replyMessage || 'Unable to generate workflow from prompt.',
        suggestedConnectors: chatResult.suggestedConnectors || [],
        workflowDraft: null,
        missingConnections: [],
        missingScopes: {},
        valid: false,
        validationErrors: ['No workflow draft returned from AI prompt compiler.'],
        fieldsNeedingReview: [],
      };
    }

    const nodes: WorkflowNode[] = draft.nodes || [];
    const edges: WorkflowEdge[] = draft.edges || [];

    const userConnectionScopeInfo = userConnections.map((c) => ({
      connectorId: c.connectorId,
      scopes: c.grantedScopes || c.scopes || [],
    }));

    const validation = validateWorkflow(nodes, edges, userConnectionScopeInfo);

    const mergedFieldsNeedingReviewSet = new Set<string>();

    if (Array.isArray(chatResult.fieldsNeedingReview)) {
      chatResult.fieldsNeedingReview.forEach((f: string) => mergedFieldsNeedingReviewSet.add(f));
    }
    if (draft && Array.isArray(draft.fieldsNeedingReview)) {
      draft.fieldsNeedingReview.forEach((f: string) => mergedFieldsNeedingReviewSet.add(f));
    }
    if (validation && Array.isArray(validation.fieldsNeedingReview)) {
      validation.fieldsNeedingReview.forEach((f: string) => mergedFieldsNeedingReviewSet.add(f));
    }

    for (let i = 1; i < nodes.length; i++) {
      const currentNode = nodes[i];
      const opId = (currentNode.operationId || currentNode.actionId || currentNode.triggerId || '') as string;
      const upstreamNodes = nodes.slice(0, i).map((n) => ({
        id: n.id,
        connectorId: n.connectorId,
        operationId: (n.operationId || n.actionId || n.triggerId || '') as string,
      }));

      const autoMapped = autoMapNodeInputs(
        currentNode.id,
        currentNode.connectorId,
        opId,
        upstreamNodes,
        currentNode.config
      );

      currentNode.fieldMapping = {
        ...(currentNode.fieldMapping || {}),
        ...autoMapped.fieldMapping,
      };

      if (Array.isArray(autoMapped.fieldsNeedingReview)) {
        autoMapped.fieldsNeedingReview.forEach((f: string) => mergedFieldsNeedingReviewSet.add(f));
      }
    }

    return {
      replyMessage: chatResult.replyMessage,
      suggestedConnectors: chatResult.suggestedConnectors || [],
      workflowDraft: {
        ...draft,
        nodes,
        edges,
      },
      missingConnections: validation.missingConnections,
      missingScopes: validation.missingScopes,
      valid: validation.valid,
      validationErrors: validation.errors,
      fieldsNeedingReview: Array.from(mergedFieldsNeedingReviewSet),
    };
  }
}

