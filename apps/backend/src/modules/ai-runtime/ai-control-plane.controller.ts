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
