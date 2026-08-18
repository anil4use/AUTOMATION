import { ConnectorManifest } from '@automation/shared-types';
import { IConnector, ExecutionContext, ConnectorExecutionOutput } from './types';

export abstract class BaseConnector implements IConnector {
  abstract manifest: ConnectorManifest;

  abstract executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput>;

  async handleTrigger(triggerId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    return { success: true, data: context.stepInput };
  }

  async refreshToken(credentials: Record<string, any>): Promise<Record<string, any>> {
    return credentials;
  }
}
