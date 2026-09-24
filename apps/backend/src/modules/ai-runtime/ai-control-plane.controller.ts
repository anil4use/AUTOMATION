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
      const models = await AIModelModel.find().sort({ providerId: 1, priority: -1 }).lean();
      res.json(models);
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
      
      const content = await AIRuntimeService.testPrompt(
        providerId,
        modelId,
        template,
        variables || {},
        userMessage
      );

      res.json({ content });
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
