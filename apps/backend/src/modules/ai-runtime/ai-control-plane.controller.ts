import { Request, Response } from 'express';
import {
  AIProviderModel,
  AIModelModel,
  AIPromptModel,
  AITaskConfigModel,
  AIExecutionLogModel,
} from '@automation/database';

export class AIControlPlaneController {
  // --- Providers & Models ---

  public static async listProviders(req: Request, res: Response) {
    try {
      const providers = await AIProviderModel.find().lean();
      res.json(providers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async createProvider(req: Request, res: Response) {
    try {
      const provider = await AIProviderModel.create(req.body);
      res.status(201).json(provider);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async syncProviders(req: Request, res: Response) {
    try {
      const { AIControlPlaneSeeder } = require('./ai-control-plane.seeder');
      await AIControlPlaneSeeder.seed();
      const providers = await AIProviderModel.find().lean();
      res.json({ success: true, providers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async deleteProvider(req: Request, res: Response) {
    try {
      const { providerId } = req.params;
      await AIProviderModel.findOneAndDelete({ providerId });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async updateProvider(req: Request, res: Response) {
    try {
      const { providerId } = req.params;
      const updated = await AIProviderModel.findOneAndUpdate(
        { providerId },
        { $set: req.body },
        { new: true }
      );
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async listModels(req: Request, res: Response) {
    try {
      const rawModels = await AIModelModel.find().sort({ providerId: 1, priority: -1 }).lean();

      const enrichedModels = await Promise.all(
        rawModels.map(async (m: any) => {
          const logs = await AIExecutionLogModel.find({
            provider: m.providerId,
            llmModel: m.modelId,
          })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

          let avgLatencyMs = 0;
          let successRate = 100;
          let totalExecutions = logs.length;

          if (logs.length > 0) {
            const sumLatency = logs.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0);
            avgLatencyMs = Math.round(sumLatency / logs.length);

            const successCount = logs.filter((l) => l.success).length;
            successRate = Math.round((successCount / logs.length) * 100);
          }

          // Dynamic App-Fit Use-Case Recommendation Tag
          let recommendedUseCase = 'General Intent Parsing';
          if (m.modelId.includes('code') || m.modelId.includes('coder')) recommendedUseCase = 'TypeScript & Code Automation';
          else if (m.modelId.includes('reasoning') || m.supportsReasoning) recommendedUseCase = 'Complex Logic & Reasoning';
          else if (m.modelId.includes('nemotron-3-super')) recommendedUseCase = 'Workflow Intent Planner (Best Fit)';
          else if (m.modelId.includes('lightning') || m.contextWindow >= 1000000) recommendedUseCase = 'Large Context & Document Parsing';
          else if (m.providerId === 'groq') recommendedUseCase = 'Ultra-Fast Realtime Response';
          else if (m.providerId === 'gemini') recommendedUseCase = 'Multimodal & Vision Tasks';

          return {
            ...m,
            avgLatencyMs,
            successRate,
            totalExecutions,
            recommendedUseCase,
          };
        })
      );

      res.json(enrichedModels);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async getModelsByProvider(req: Request, res: Response) {
    try {
      const { providerId } = req.params;
      const models = await AIModelModel.find({ providerId }).sort({ priority: -1 }).lean();
      res.json(models);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async createModel(req: Request, res: Response) {
    try {
      const model = await AIModelModel.create(req.body);
      res.status(201).json(model);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async updateModel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await AIModelModel.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true }
      );
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async deleteModel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await AIModelModel.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // --- Prompts ---

  public static async listPrompts(req: Request, res: Response) {
    try {
      // Group by feature
      const { feature } = req.query;
      const filter = feature ? { feature } : {};
      const prompts = await AIPromptModel.find(filter).sort({ feature: 1, promptKey: 1, version: -1 }).lean();
      res.json(prompts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async getPrompt(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const prompt = await AIPromptModel.findById(id).lean();
      if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
      res.json(prompt);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async getActivePromptVersions(req: Request, res: Response) {
    try {
      const { feature, promptKey } = req.params;
      const prompt = await AIPromptModel.findOne({ feature, promptKey, status: 'active' }).sort({ version: -1 }).lean();
      if (!prompt) return res.status(404).json({ error: 'No active prompt found' });
      res.json(prompt);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async createPromptVersion(req: Request, res: Response) {
    try {
      const { feature, promptKey, name, description, type, template, variables, rules, status } = req.body;
      
      const lastVersion = await AIPromptModel.findOne({ feature, promptKey }).sort({ version: -1 });
      const version = lastVersion ? lastVersion.version + 1 : 1;

      // If new one is active, archive old ones
      if (status === 'active') {
        await AIPromptModel.updateMany(
          { feature, promptKey, status: 'active' },
          { $set: { status: 'archived' } }
        );
      }

      const newPrompt = await AIPromptModel.create({
        feature,
        promptKey,
        name,
        description,
        type,
        template,
        variables,
        rules,
        status: status || 'draft',
        version,
      });

      res.status(201).json(newPrompt);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async testPrompt(req: Request, res: Response) {
    try {
      const { providerId, modelId, template, variables, userMessage } = req.body;
      const { AIRuntimeService } = require('./ai-runtime.service');
      
      const result = await AIRuntimeService.testPrompt(
        providerId,
        modelId,
        template,
        variables || {},
        userMessage
      );

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Execution Error' });
    }
  }

  public static async generateTestPayload(req: Request, res: Response) {
    try {
      const { template, promptKey, variables, providerId, modelId, selectedConnectorIds } = req.body;
      const { AIRuntimeService } = require('./ai-runtime.service');
      const { ConnectorModel } = require('@automation/database');
      const { ConnectorService } = require('../connectors/connector.service');

      const orgId = (req as any).user?.organizationId || 'default-org';

      // 1. Fetch active user connections, enabled DB connectors, DB actions, and SDK manifests
      const { ConnectorActionModel } = require('@automation/database');
      let manifestRegistry: any = null;
      try {
        manifestRegistry = require('@automation/connector-sdk').manifestRegistry;
      } catch {}

      const [userConns, dbConnectors, dbActions] = await Promise.all([
        ConnectorService.getUserConnections(orgId).catch(() => []),
        ConnectorModel.find({ enabled: true }).lean().catch(() => []),
        ConnectorActionModel.find({ enabled: true }).lean().catch(() => []),
      ]);

      const dbActionsMap: Record<string, string[]> = {};
      for (const act of dbActions || []) {
        if (!dbActionsMap[act.connectorId]) dbActionsMap[act.connectorId] = [];
        if (act.actionId && !dbActionsMap[act.connectorId].includes(act.actionId)) {
          dbActionsMap[act.connectorId].push(act.actionId);
        }
      }

      const defaultActionsMap: Record<string, string[]> = {
        'gmail': ['search_messages', 'get_unread_emails', 'read_message_details', 'send_email'],
        'data-vault': ['save_document', 'append_csv_dataset', 'create_version_snapshot'],
        'slack': ['post_message', 'list_channels', 'read_message_history'],
        'google-sheets': ['read_rows', 'append_row', 'update_cell'],
        'google-drive': ['list_files', 'upload_file', 'download_file'],
        'web-search': ['search_query', 'get_web_page'],
        'web-browser': ['navigate', 'click_element', 'scrape_text'],
        'google-calendar': ['list_events', 'create_event'],
        'google-docs': ['read_document', 'append_text'],
        'http-request': ['execute_request'],
        'autoflow-schedule': ['trigger_schedule'],
        'ai-agent': ['analyze_data', 'synthesize_text'],
      };

      const systemConfiguredIds = new Set([
        'data-vault',
        'local-storage',
        'web-search',
        'web-browser',
        'http-request',
        'autoflow-schedule',
        'autoflow-condition',
        'ai-agent',
      ]);

      const authedUserConnIds = new Set((userConns || []).map((c: any) => c.connectorId));

      // Strictly filter ONLY SDK connectors that are authenticated by user OR system-configured
      const validAuthedOrSystemConnectors = dbConnectors.filter((c: any) =>
        authedUserConnIds.has(c.connectorId) || systemConfiguredIds.has(c.connectorId)
      );

      // Append any active user connections not present in dbConnectors list
      for (const uc of userConns || []) {
        if (!validAuthedOrSystemConnectors.some((c: any) => c.connectorId === uc.connectorId)) {
          validAuthedOrSystemConnectors.push({
            connectorId: uc.connectorId,
            name: uc.name || uc.connectorId,
            displayName: uc.name || uc.connectorId,
            actions: uc.actions || ['execute'],
          });
        }
      }

      let targetConnectors: any[] = [];

      if (Array.isArray(selectedConnectorIds) && selectedConnectorIds.length > 0) {
        // Filter ONLY valid authed or system-configured connectors matching user's selection
        targetConnectors = validAuthedOrSystemConnectors.filter((c: any) => selectedConnectorIds.includes(c.connectorId));
      }

      if (targetConnectors.length === 0) {
        // Use ALL valid authed or system configured connectors
        targetConnectors = validAuthedOrSystemConnectors;
      }

      const realConnectorContextStr = JSON.stringify(
        targetConnectors.map((c: any) => {
          const connId = c.connectorId || c._id;
          let actionsList: string[] = [];

          // 1. Check SDK Manifest
          if (manifestRegistry) {
            try {
              const manifest = manifestRegistry.getManifest(connId);
              if (manifest && Array.isArray(manifest.actions) && manifest.actions.length > 0) {
                actionsList = manifest.actions.map((a: any) => a.id || a.actionId || a.name);
              }
            } catch {}
          }

          // 2. Check DB Actions
          if (actionsList.length === 0 && dbActionsMap[connId] && dbActionsMap[connId].length > 0) {
            actionsList = dbActionsMap[connId];
          }

          // 3. Fallback map
          if (actionsList.length === 0 && defaultActionsMap[connId]) {
            actionsList = defaultActionsMap[connId];
          }

          // 4. Default fallback
          if (actionsList.length === 0) {
            actionsList = Array.isArray(c.actions) && c.actions.length > 0
              ? c.actions.map((a: any) => (typeof a === 'string' ? a : a.id || a.actionId || 'execute'))
              : ['execute'];
          }

          return {
            id: connId,
            name: c.displayName || c.name || connId,
            status: 'connected',
            authStatus: authedUserConnIds.has(connId) ? 'user_authenticated' : 'system_configured',
            actions: actionsList,
          };
        }),
        null,
        2
      );

      // 2. Use AI to generate contextually perfect test payload for all requested variables
      // Rules for test payload generator
      const systemPrompt = `You are a test payload generation engine for the AutoFlow AI Platform.
Given a prompt template and expected variable names, generate a JSON object containing realistic, contextually matching test values for each variable.

Rules:
- If a variable name is "connectorContext", return the provided real connector JSON array string: ${JSON.stringify(realConnectorContextStr)}
- If a variable name is "historyContext", return a clean session initialization string indicating a fresh session (e.g. "Session initialized. No steps executed yet in current turn.") unless the prompt explicitly asks for previous context.
- For any other variable (e.g. userMessage, sourceData, targetSchema, agentPersonality, etc.), produce realistic sample data that fits the prompt context.
- Also include a key "userMessage" with a realistic, clear user instruction prompt matching the prompt key.

Return ONLY a valid JSON object matching key-value pairs for variables, plus "userMessage". No markdown, no commentary.`;

      const userPrompt = `Prompt Key: ${promptKey}\nVariables requested: ${JSON.stringify(variables)}\nTemplate snippet: ${template.slice(0, 500)}`;

      let generatedJsonStr = '';
      try {
        const prov = providerId || 'groq';
        const mod = modelId || 'openai/gpt-oss-120b';
        const aiResult = await AIRuntimeService.testPrompt(prov, mod, systemPrompt, {}, userPrompt);
        generatedJsonStr = aiResult.content;
      } catch {
        try {
          const aiResult = await AIRuntimeService.testPrompt('gemini', 'gemini-3.5-flash-lite', systemPrompt, {}, userPrompt);
          generatedJsonStr = aiResult.content;
        } catch {}
      }

      let parsedPayload: Record<string, any> = {};
      if (generatedJsonStr) {
        try {
          let cleaned = generatedJsonStr.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          if (match) cleaned = match[1].trim();
          const start = cleaned.indexOf('{');
          const end = cleaned.lastIndexOf('}');
          if (start !== -1 && end > start) cleaned = cleaned.substring(start, end + 1);
          parsedPayload = JSON.parse(cleaned);
        } catch {}
      }

      // Ensure connectorContext and historyContext are populated even if LLM omitted them
      if (!parsedPayload.connectorContext || parsedPayload.connectorContext === '[]' || parsedPayload.connectorContext === '""') {
        parsedPayload.connectorContext = realConnectorContextStr;
      }
      if (!parsedPayload.historyContext) {
        parsedPayload.historyContext = 'Session initialized for user. No previous actions taken yet.';
      }
      if (!parsedPayload.userMessage) {
        parsedPayload.userMessage = 'Read unread lead emails from Gmail, insert into Google Sheets, and send a Slack notification';
      }

      const formattedVariables: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsedPayload)) {
        if (k === 'userMessage') continue;
        formattedVariables[k] = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
      }

      res.json({
        success: true,
        variables: formattedVariables,
        userMessage: parsedPayload.userMessage || '',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AI Generation Failed' });
    }
  }

  public static async formatResponse(req: Request, res: Response) {
    try {
      const { rawResponse, userInstruction, requestedFormat, providerId, modelId } = req.body;
      const { AIResponseFormatterService } = require('./ai-response-formatter.service');

      const result = await AIResponseFormatterService.format({
        rawResponse,
        userInstruction,
        requestedFormat,
        providerId,
        modelId,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Response formatting failed' });
    }
  }

  public static async saveToVault(req: Request, res: Response) {
    try {
      const { title, promptKey, content, userInstruction, requestedFormat, type, providerId, modelId } = req.body;
      const { VaultController } = require('../vault/vault.controller');
      const { AIResponseFormatterService } = require('./ai-response-formatter.service');

      // Sanitize, normalize, and format AI response according to user requested output format
      const formattedResult = await AIResponseFormatterService.format({
        rawResponse: content,
        userInstruction: userInstruction || title || promptKey,
        requestedFormat: requestedFormat || (type === 'json' ? 'json' : 'auto'),
        providerId,
        modelId,
      });

      const timestamp = Date.now();
      const safeKey = (promptKey || 'ai_output').replace(/[:/]/g, '_');
      const targetExt =
        formattedResult.formatType === 'json'
          ? 'json'
          : formattedResult.formatType === 'csv'
          ? 'csv'
          : formattedResult.formatType === 'pdf'
          ? 'pdf'
          : 'md';

      const fileName = `ai_response_${safeKey}_${timestamp}.${targetExt}`;

      let filePayload: any = formattedResult.formattedContent;
      if (formattedResult.formatType === 'json') {
        try {
          filePayload = JSON.parse(formattedResult.formattedContent);
        } catch {
          filePayload = formattedResult.formattedContent;
        }
      }

      const uploadReq = {
        body: {
          fileName,
          subfolder: 'ai-playground-outputs',
          content: filePayload,
        },
      } as any;

      let savedResult: any = null;
      const mockRes = {
        status: () => mockRes,
        json: (data: any) => {
          savedResult = data;
          return mockRes;
        },
      } as any;

      await VaultController.uploadFile(uploadReq, mockRes);
      res.json({
        success: true,
        fileName,
        subfolder: 'ai-playground-outputs',
        vaultPath: `storage/data-vault/ai-playground-outputs/${fileName}`,
        formatted: formattedResult,
        savedResult,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save to Data Vault' });
    }
  }

  public static async getPromptHistory(req: Request, res: Response) {
    try {
      const { feature, promptKey } = req.params;
      const history = await AIPromptModel.find({ feature, promptKey })
        .sort({ version: -1 })
        .lean();
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async activatePromptVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const targetPrompt = await AIPromptModel.findById(id);
      if (!targetPrompt) return res.status(404).json({ error: 'Prompt version not found' });

      // Archive current active versions for this feature + key
      await AIPromptModel.updateMany(
        { feature: targetPrompt.feature, promptKey: targetPrompt.promptKey },
        { $set: { status: 'archived' } }
      );

      // Activate selected version
      targetPrompt.status = 'active';
      await targetPrompt.save();

      res.json({ success: true, prompt: targetPrompt });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // --- Task Configs ---

  public static async listTaskConfigs(req: Request, res: Response) {
    try {
      const configs = await AITaskConfigModel.find().lean();
      res.json(configs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async getTaskConfig(req: Request, res: Response) {
    try {
      const { feature, task } = req.params;
      const config = await AITaskConfigModel.findOne({ feature, task }).lean();
      if (!config) return res.status(404).json({ error: 'Task config not found' });
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async updateTaskConfig(req: Request, res: Response) {
    try {
      const { feature, task } = req.params;
      const updates = req.body;

      const updated = await AITaskConfigModel.findOneAndUpdate(
        { feature, task },
        { $set: updates },
        { new: true, upsert: true }
      );
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async simulateTaskRoute(req: Request, res: Response) {
    try {
      const { feature, task, testPrompt } = req.body;
      const config: any = await AITaskConfigModel.findOne({ feature, task }).lean();
      if (!config) return res.status(404).json({ error: 'Task config not found' });

      const { AIRuntimeService } = require('./ai-runtime.service');
      const startTime = Date.now();

      let activeProvider = config.primaryProvider;
      let activeModel = config.primaryModel;
      let usedFallback = false;
      let result = null;

      try {
        result = await AIRuntimeService.testPrompt(
          config.primaryProvider,
          config.primaryModel,
          testPrompt || 'Routing test verification prompt',
          {},
          'Test execution'
        );
      } catch (primaryErr: any) {
        if (config.fallbackProvider && config.fallbackModel) {
          usedFallback = true;
          activeProvider = config.fallbackProvider;
          activeModel = config.fallbackModel;
          result = await AIRuntimeService.testPrompt(
            config.fallbackProvider,
            config.fallbackModel,
            testPrompt || 'Routing test verification prompt',
            {},
            'Test execution'
          );
        } else {
          throw primaryErr;
        }
      }

      res.json({
        success: true,
        feature,
        task,
        routingStrategy: config.routingStrategy,
        selectedProvider: activeProvider,
        selectedModel: activeModel,
        usedFallback,
        result,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Routing Simulation Failed' });
    }
  }

  // --- Execution Logs ---

  public static async listExecutionLogs(req: Request, res: Response) {
    try {
      const logs = await AIExecutionLogModel.find().sort({ createdAt: -1 }).limit(100).lean();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // --- Live Plan Executor ---
  // Takes a generated execution plan and runs it against real connectors.
  // Step outputs are chained via {{stepId.path}} template resolution.

  public static async executePlan(req: Request, res: Response) {
    try {
      const {
        plan,
        userMessage,
        requestedFormat,
        sessionId,
      } = req.body;

      if (!plan || !Array.isArray(plan) || plan.length === 0) {
        return res.status(400).json({ error: 'plan must be a non-empty array of execution steps' });
      }

      const orgId: string = (req as any).user?.organizationId || (req as any).organizationId || '';
      if (!orgId) {
        return res.status(401).json({ error: 'Organization context required to execute plan' });
      }

      const { PlanExecutorService } = require('./plan-executor.service');
      const executionResult = await PlanExecutorService.executePlan({
        plan,
        orgId,
        userMessage: userMessage || '',
        sessionId: sessionId || `playground_${Date.now()}`,
      });

      // Auto-format the final output for human readability using LLM (primary) + deterministic fallback
      let formattedContent: string | null = null;
      if (executionResult.finalOutput) {
        try {
          const { AIResponseFormatterService } = require('./ai-response-formatter.service');
          // Use the full format() path — LLM understands user intent, formats email data as CSV, etc.
          const primaryResult = executionResult.finalOutput?.primaryResult ?? executionResult.finalOutput;
          const fmt = await AIResponseFormatterService.format({
            rawResponse: primaryResult,
            userInstruction: userMessage || 'Format this execution output',
            requestedFormat: requestedFormat || 'auto',
          });
          formattedContent = fmt.formattedContent || null;
        } catch {
          // Format failure is non-fatal — raw output still returned
        }
      }

      res.json({
        success: executionResult.success,
        stepResults: executionResult.stepResults,
        finalOutput: executionResult.finalOutput,
        formattedContent,
        totalDurationMs: executionResult.totalDurationMs,
        stepsCompleted: executionResult.stepsCompleted,
        stepsTotal: executionResult.stepsTotal,
        error: executionResult.error,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Plan execution failed' });
    }
  }
}
