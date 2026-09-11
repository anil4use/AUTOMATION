import { ExecutionLogModel, IExecutionLog } from '@automation/database';
import { Sanitizer } from '@automation/ai-data-bridge';
import { SocketService } from './socket.service';

export interface StepLogOptions {
  executionId: string;
  stepId: string;
  stepName: string;
  connectorId: string;
  operationId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  rawInput?: Record<string, any>;
  resolvedInput?: Record<string, any>;
  aiBridgeDetails?: {
    sourceConnectorId?: string;
    sourceOperationId?: string;
    decisionSource?: 'USER_OVERRIDE' | 'DETERMINISTIC' | 'CACHE_HIT' | 'AI_GENERATED' | 'FALLBACK';
    coercionsApplied?: any[];
    confidence?: number;
    reasoning?: string;
    fieldMapping?: Record<string, any>;
  };
  outputPayload?: Record<string, any>;
  errorDetails?: {
    message: string;
    code?: string;
    stack?: string;
  };
  timingMs?: number;
}

export class ExecutionLoggerService {
  /**
   * Start a new workflow execution audit log
   */
  public static async startExecution(
    executionId: string,
    workflowId: string,
    organizationId: string,
    triggerType: string,
    triggerPayload?: Record<string, any>
  ): Promise<IExecutionLog> {
    const maskedTrigger = Sanitizer.maskSensitiveValues(triggerPayload || {});

    const log = await ExecutionLogModel.create({
      executionId,
      workflowId,
      organizationId,
      triggerType,
      triggerPayload: maskedTrigger,
      status: 'RUNNING',
      startedAt: new Date(),
      steps: [],
      metrics: {
        totalSteps: 0,
        completedSteps: 0,
        failedSteps: 0,
        skippedSteps: 0,
        aiBridgeInvocations: 0,
        totalCoercionsCount: 0
      }
    });

    SocketService.emitToOrg(organizationId, 'execution:start', { executionId, workflowId, startedAt: log.startedAt });

    return log;
  }

  /**
   * Log individual step execution (including 11-phase breakdown & AI Bridge events)
   */
  public static async logStep(options: StepLogOptions): Promise<void> {
    const { executionId, stepId, stepName, connectorId, operationId, status, rawInput, resolvedInput, aiBridgeDetails, outputPayload, errorDetails, timingMs } = options;

    const maskedRawInput = Sanitizer.maskSensitiveValues(rawInput || {});
    const maskedResolvedInput = Sanitizer.maskSensitiveValues(resolvedInput || {});
    const maskedOutputPayload = Sanitizer.maskSensitiveValues(outputPayload || {});

    const stepDoc = {
      stepId,
      stepName,
      connectorId,
      operationId,
      status,
      startedAt: new Date(Date.now() - (timingMs || 0)),
      completedAt: new Date(),
      durationMs: timingMs || 0,
      rawInput: maskedRawInput,
      resolvedInput: maskedResolvedInput,
      aiBridge: aiBridgeDetails ? {
        sourceConnectorId: aiBridgeDetails.sourceConnectorId,
        sourceOperationId: aiBridgeDetails.sourceOperationId,
        decisionSource: aiBridgeDetails.decisionSource || 'DETERMINISTIC',
        coercionsApplied: aiBridgeDetails.coercionsApplied || [],
        confidence: aiBridgeDetails.confidence || 1.0,
        reasoning: aiBridgeDetails.reasoning || '',
        fieldMapping: aiBridgeDetails.fieldMapping || {}
      } : undefined,
      outputPayload: maskedOutputPayload,
      errorDetails: errorDetails ? {
        message: errorDetails.message,
        code: errorDetails.code,
        stack: errorDetails.stack
      } : undefined
    };

    const updateObj: any = {
      $push: { steps: stepDoc }
    };

    if (status === 'COMPLETED') {
      updateObj.$inc = { 'metrics.completedSteps': 1, 'metrics.totalSteps': 1 };
      if (aiBridgeDetails) {
        updateObj.$inc['metrics.aiBridgeInvocations'] = 1;
        if (aiBridgeDetails.coercionsApplied?.length) {
          updateObj.$inc['metrics.totalCoercionsCount'] = aiBridgeDetails.coercionsApplied.length;
        }
      }
    } else if (status === 'FAILED') {
      updateObj.$inc = { 'metrics.failedSteps': 1, 'metrics.totalSteps': 1 };
    } else if (status === 'SKIPPED') {
      updateObj.$inc = { 'metrics.skippedSteps': 1, 'metrics.totalSteps': 1 };
    }

    await ExecutionLogModel.findOneAndUpdate({ executionId }, updateObj, { new: true });

    SocketService.emitToOrg('global', 'execution:step', { executionId, stepId, stepName, status, durationMs: timingMs });
  }

  /**
   * Finalize a workflow execution audit log
   */
  public static async finalizeExecution(
    executionId: string,
    status: 'COMPLETED' | 'FAILED',
    totalDurationMs: number,
    finalOutput?: Record<string, any>,
    error?: Error
  ): Promise<void> {
    const update: any = {
      status,
      completedAt: new Date(),
      durationMs: totalDurationMs,
      finalOutputPayload: Sanitizer.maskSensitiveValues(finalOutput || {})
    };

    if (error) {
      update.executionError = {
        message: error.message,
        stack: error.stack
      };
    }

    const log = await ExecutionLogModel.findOneAndUpdate({ executionId }, { $set: update }, { new: true });

    if (log) {
      SocketService.emitToOrg(log.organizationId?.toString() || 'global', 'execution:complete', {
        executionId,
        status,
        durationMs: totalDurationMs,
        completedAt: log.completedAt
      });
    }
  }
}
