import { ConnectorManifest } from '@automation/shared-types';

export interface ExecutionContext {
  connectionCredentials?: Record<string, any>;
  connectionConfig?: Record<string, any>;
  stepInput: Record<string, any>;
  workflowVariables?: Record<string, any>;
  sessionId?: string;
}

export interface ConnectorExecutionOutput {
  success: boolean;
  data: Record<string, any>;
  error?: string;
}

export interface IConnector {
  manifest: ConnectorManifest;
  executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput>;
  handleTrigger?(triggerId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput>;
  refreshToken?(credentials: Record<string, any>): Promise<Record<string, any>>;
}
