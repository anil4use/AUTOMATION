import Handlebars from 'handlebars';
import { logger } from '../../config/logger';
import {
  AITaskConfigModel,
  AIPromptModel,
  AIProviderModel,
  AIExecutionLogModel,
} from '@automation/database';
import { BaseAIAdapter } from './adapters/base.adapter';
import { AIAdapterRegistry } from './adapters/adapter-registry';

export interface AIRuntimeExecutionArgs {
  feature: string;
  task: string;
  variables: Record<string, any>;
  userMessage?: string; // Optional direct user message if not part of variables
}

export class AIRuntimeService {
  /**
   * Universal execution interface for the AI Control Plane.
   */
  static async execute(args: AIRuntimeExecutionArgs): Promise<string> {
    const { feature, task, variables, userMessage } = args;

    // 1. Resolve Task Config
    const taskConfig = await AITaskConfigModel.findOne({ feature, task, enabled: true });
    if (!taskConfig) {
      throw new Error(`AI Control Plane: No active task config found for ${feature}/${task}`);
    }

    // 2. Resolve Active Prompt Template
    const promptDoc = await AIPromptModel.findOne({
      feature,
      promptKey: taskConfig.promptKey,
      status: 'active',
    }).sort({ version: -1 });

    if (!promptDoc) {
      throw new Error(`AI Control Plane: No active prompt found for key ${taskConfig.promptKey}`);
    }

    // 3. Inject Variables
    let systemPrompt = '';
    try {
      const compiled = Handlebars.compile(promptDoc.template);
      systemPrompt = compiled(variables);
    } catch (err: any) {
      logger.error(`[AIRuntime] Handlebars compilation failed: ${err.message}`);
      systemPrompt = promptDoc.template; // Fallback to raw string
    }

    // 4. Try Primary Model
    try {
      return await AIRuntimeService.executeWithProvider(
        taskConfig.primaryProvider,
        taskConfig.primaryModel,
        systemPrompt,
        taskConfig,
        promptDoc,
        false,
        userMessage
      );
    } catch (primaryErr: any) {
      logger.warn(`[AIRuntime] Primary execution failed (${taskConfig.primaryProvider}/${taskConfig.primaryModel}): ${primaryErr.message}`);

      // 5. Try Fallback Model if primary fails
      if (taskConfig.fallbackProvider && taskConfig.fallbackModel) {
        logger.info(`[AIRuntime] Attempting fallback execution with ${taskConfig.fallbackProvider}/${taskConfig.fallbackModel}`);
        return await AIRuntimeService.executeWithProvider(
          taskConfig.fallbackProvider,
          taskConfig.fallbackModel,
          systemPrompt,
          taskConfig,
          promptDoc,
          true,
          userMessage
        );
      } else {
        throw primaryErr; // No fallback configured
      }
    }
  }

  /**
   * Used strictly by the AI Control Plane Playground to test a prompt template live.
   * Writes to execution log tagged as a playground test and returns detailed metrics.
   */
  static async testPrompt(
    providerId: string,
    modelId: string,
    template: string,
    variables: Record<string, any>,
    userMessage?: string
  ): Promise<{
    content: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    tokensPerSec: number;
    success: boolean;
  }> {
    const startTime = Date.now();
    let systemPrompt = '';
    let success = false;
    let content = '';
    let errorMessage = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const compiled = Handlebars.compile(template);
      systemPrompt = compiled(variables);
    } catch (err: any) {
      systemPrompt = template;
    }

    try {
      const providerDoc = await AIProviderModel.findOne({ providerId, enabled: true });
      if (!providerDoc) throw new Error(`Provider ${providerId} not found or disabled.`);

      const adapter = AIRuntimeService.getAdapter(providerDoc);
      const result = await adapter.execute({
        model: modelId,
        systemPrompt,
        userMessage,
        temperature: 0.7,
      });

      content = result.content;
      inputTokens = result.inputTokens || 0;
      outputTokens = result.outputTokens || 0;
      success = true;

      const latencyMs = Date.now() - startTime;
      const seconds = Math.max(latencyMs / 1000, 0.1);
      const tokensPerSec = Math.round((outputTokens || (content.length / 4)) / seconds);

      return {
        content,
        latencyMs,
        inputTokens,
        outputTokens,
        tokensPerSec,
        success: true,
      };
    } catch (err: any) {
      errorMessage = err.message || 'Execution Error';
      throw err;
    } finally {
      const latencyMs = Date.now() - startTime;
      AIExecutionLogModel.create({
        feature: 'playground',
        task: 'quick-test',
        promptKey: 'manual',
        promptVersion: 0,
        provider: providerId,
        llmModel: modelId,
        success,
        isFallback: false,
        inputTokens,
        outputTokens,
        latencyMs,
        errorMessage: success ? undefined : errorMessage,
        rawPrompt: systemPrompt || template,
        rawResponse: success ? content : undefined,
      }).catch((logErr: any) => logger.error(`[AIRuntime] Failed to write playground log: ${logErr.message}`));
    }
  }

  private static async executeWithProvider(
    providerId: string,
    modelId: string,
    systemPrompt: string,
    taskConfig: any,
    promptDoc: any,
    isFallback: boolean,
    userMessage?: string
  ): Promise<string> {
    const startTime = Date.now();
    let success = false;
    let inputTokens = 0;
    let outputTokens = 0;
    let content = '';
    let errorMessage = '';

    try {
      const providerDoc = await AIProviderModel.findOne({ providerId, enabled: true });
      if (!providerDoc) {
        throw new Error(`Provider ${providerId} not found or disabled.`);
      }

      const adapter = AIRuntimeService.getAdapter(providerDoc);

      const result = await adapter.execute({
        model: modelId,
        systemPrompt,
        userMessage,
        temperature: taskConfig.parameters?.temperature,
        maxTokens: taskConfig.parameters?.maxTokens,
        structuredOutput: taskConfig.requirements?.structuredOutput,
      });

      content = result.content;
      inputTokens = result.inputTokens || 0;
      outputTokens = result.outputTokens || 0;
      success = true;

      return content;
    } catch (err: any) {
      errorMessage = err.message || 'Execution Error';
      throw err;
    } finally {
      const latencyMs = Date.now() - startTime;
      
      // Async fire-and-forget log
      AIExecutionLogModel.create({
        feature: taskConfig.feature,
        task: taskConfig.task,
        promptKey: taskConfig.promptKey,
        promptVersion: promptDoc.version,
        provider: providerId,
        llmModel: modelId,
        success,
        isFallback,
        inputTokens,
        outputTokens,
        latencyMs,
        errorMessage: success ? undefined : errorMessage,
        rawPrompt: systemPrompt,
        rawResponse: success ? content : undefined,
      }).catch((logErr: any) => logger.error(`[AIRuntime] Failed to write execution log: ${logErr.message}`));
    }
  }

  private static getAdapter(providerDoc: any): BaseAIAdapter {
    return AIAdapterRegistry.getAdapter(providerDoc);
  }
}
