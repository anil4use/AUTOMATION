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

      // 1. Fetch active user connections and all enabled DB connectors
      const [userConns, dbConnectors] = await Promise.all([
        ConnectorService.getUserConnections(orgId).catch(() => []),
        ConnectorModel.find({ enabled: true }).lean().catch(() => []),
      ]);

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
        targetConnectors.map((c: any) => ({
          id: c.connectorId || c._id,
          name: c.displayName || c.name || c.connectorId,
          status: 'connected',
          authStatus: authedUserConnIds.has(c.connectorId) ? 'user_authenticated' : 'system_configured',
          actions: (c.actions || []).map((a: any) => a.id || a.actionId || 'execute'),
        })),
        null,
        2
      );

      // 2. Use AI to generate contextually perfect test payload for all requested variables
      const systemPrompt = `You are a test payload generation engine for the AutoFlow AI Platform.
Given a prompt template and expected variable names, generate a JSON object containing realistic, contextually matching test values for each variable.

Rules:
- If a variable name is "connectorContext", return the provided real connector JSON array string: ${JSON.stringify(realConnectorContextStr)}
- If a variable name is "historyContext", return a realistic 2-3 sentence execution history log of previous automated steps.
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
        parsedPayload.historyContext = 'User previously executed: "Fetch unread emails". Last step: Gmail search retrieved 3 sales lead messages.';
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
}
