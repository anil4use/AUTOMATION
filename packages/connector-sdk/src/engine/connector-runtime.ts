import { connectorRegistry, StepExecutor } from './step-executor';
import { safeRequire } from '../utils/safe-require';

export interface ConnectorRuntimeExecutionParams {
  connectorId: string;
  actionId: string;
  input: Record<string, any>;
  organizationId?: string;
  userId?: string;
  connectionId?: string;
}

export interface ConnectorRuntimeResult {
  success: boolean;
  executionTimeMs: number;
  data?: any;
  outputSchemaDetected?: Record<string, any>;
  error?: {
    code: 'AUTHENTICATION_FAILED' | 'RATE_LIMITED' | 'INVALID_INPUT' | 'PROVIDER_ERROR' | 'NETWORK_TIMEOUT' | 'NOT_FOUND';
    message: string;
    details?: any;
  };
}

export class ConnectorRuntime {
  /**
   * Executes a connector action dynamically. Uses MongoDB V2 metadata if available,
   * with automatic V1 backward compatibility fallback.
   */
  public static async execute(params: ConnectorRuntimeExecutionParams): Promise<ConnectorRuntimeResult> {
    const startTime = Date.now();
    const { connectorId, actionId, input, organizationId, connectionId } = params;

    try {
      // 1. Resolve connection credentials (AES-256 decrypted)
      const credentials = await StepExecutor.resolveCredentials(connectorId, organizationId, connectionId);

      // 2. Check for V2 DB metadata (if database is accessible)
      let dbConnector: any = null;
      let dbAction: any = null;

      try {
        const dbMod = safeRequire('@automation/database');
        if (dbMod?.ConnectorModel && dbMod?.ConnectorActionModel) {
          dbConnector = await dbMod.ConnectorModel.findOne({ connectorId, enabled: true });
          if (dbConnector) {
            dbAction = await dbMod.ConnectorActionModel.findOne({ connectorId, actionId, enabled: true });
          }
        }
      } catch (dbErr) {
        // Database not reachable or models not seeded yet — graceful fallback to V1
      }

      let data: any = null;

      // 3. Execution Dispatcher
      if (dbConnector && dbAction) {
        // V2 Strategy Execution
        data = await ConnectorRuntime.executeV2Strategy(dbConnector, dbAction, input, credentials);
      } else {
        // V1 Adapter Execution Fallback
        const v1Connector = connectorRegistry[connectorId];
        if (v1Connector && typeof v1Connector.executeAction === 'function') {
          let result = await v1Connector.executeAction(actionId, {
            connectionCredentials: credentials,
            stepInput: input,
          });

          if ((!result || !result.success || (typeof result.error === 'string' && result.error.includes('Unsupported'))) && (actionId === 'get_all' || actionId === 'list_all')) {
            const primaryListAction = v1Connector.manifest?.actions?.find((a: any) => {
              const id = a.id.toLowerCase();
              return (id.startsWith('list_') || id.startsWith('read_') || id.startsWith('search_') || id.startsWith('get_')) && id !== 'get_all';
            });
            if (primaryListAction) {
              result = await v1Connector.executeAction(primaryListAction.id, {
                connectionCredentials: credentials,
                stepInput: input,
              });
            }
          }

          if (!result || !result.success) {
            return {
              success: false,
              executionTimeMs: Date.now() - startTime,
              error: {
                code: result?.error?.code || 'PROVIDER_ERROR',
                message: result?.error?.message || result?.error || 'V1 Action execution failed',
                details: result?.error,
              },
            };
          }
          data = result.data;
        } else {
          throw new Error(`No execution engine registered for connector '${connectorId}', action '${actionId}'`);
        }
      }

      // 4. Return Normalized Success Payload
      return {
        success: true,
        executionTimeMs: Date.now() - startTime,
        data,
        outputSchemaDetected: ConnectorRuntime.detectOutputSchema(data),
      };
    } catch (err: any) {
      const message = err?.message || String(err);
      let code: 'AUTHENTICATION_FAILED' | 'RATE_LIMITED' | 'INVALID_INPUT' | 'PROVIDER_ERROR' | 'NETWORK_TIMEOUT' | 'NOT_FOUND' = 'PROVIDER_ERROR';

      if (message.includes('not connected') || message.includes('401') || message.includes('Unauthorized')) {
        code = 'AUTHENTICATION_FAILED';
      } else if (message.includes('429') || message.includes('rate limit')) {
        code = 'RATE_LIMITED';
      } else if (message.includes('404') || message.includes('Not Found')) {
        code = 'NOT_FOUND';
      } else if (message.includes('validation') || message.includes('invalid')) {
        code = 'INVALID_INPUT';
      }

      return {
        success: false,
        executionTimeMs: Date.now() - startTime,
        error: {
          code,
          message,
          details: err?.stack || err,
        },
      };
    }
  }

  private static async executeV2Strategy(
    connector: any,
    action: any,
    input: Record<string, any>,
    credentials: Record<string, any>
  ): Promise<any> {
    const v1Connector = connectorRegistry[connector.connectorId];
    if (v1Connector && typeof v1Connector.executeAction === 'function') {
      let result = await v1Connector.executeAction(action.actionId, {
        connectionCredentials: credentials,
        stepInput: input,
      });

      if ((!result || !result.success || (typeof result.error === 'string' && result.error.includes('Unsupported'))) && (action.actionId === 'get_all' || action.actionId === 'list_all')) {
        const primaryListAction = v1Connector.manifest?.actions?.find((a: any) => {
          const id = a.id.toLowerCase();
          return (id.startsWith('list_') || id.startsWith('read_') || id.startsWith('search_') || id.startsWith('get_')) && id !== 'get_all';
        });
        if (primaryListAction) {
          result = await v1Connector.executeAction(primaryListAction.id, {
            connectionCredentials: credentials,
            stepInput: input,
          });
        }
      }

      if (!result || !result.success) {
        throw new Error(result?.error?.message || result?.error || `Execution failed for ${action.actionId}`);
      }
      return result.data;
    }

    throw new Error(`Strategy execution for ${action.executionType} not implemented for ${connector.connectorId}`);
  }

  public static detectOutputSchema(data: any): Record<string, any> {
    if (data === null || data === undefined) {
      return { type: 'null' };
    }

    if (Array.isArray(data)) {
      return {
        type: 'array',
        itemType: data.length > 0 ? typeof data[0] : 'any',
        sampleItemKeys: data.length > 0 && typeof data[0] === 'object' ? Object.keys(data[0]) : [],
      };
    }

    if (typeof data === 'object') {
      const properties: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        properties[k] = { type: Array.isArray(v) ? 'array' : typeof v };
      }
      return { type: 'object', properties };
    }

    return { type: typeof data };
  }
}
