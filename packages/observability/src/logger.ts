export interface LogContext {
  traceId?: string;
  executionId?: string;
  workflowId?: string;
  connectorId?: string;
  organizationId?: string;
  [key: string]: any;
}

export class Logger {
  private scope: string;

  constructor(scope: string) {
    this.scope = scope;
  }

  info(message: string, context?: LogContext): void {
    console.log(`[INFO][${this.scope}] ${message}`, context ? JSON.stringify(context) : '');
  }

  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN][${this.scope}] ${message}`, context ? JSON.stringify(context) : '');
  }

  error(message: string, error?: any, context?: LogContext): void {
    console.error(`[ERROR][${this.scope}] ${message}`, error?.message || error || '', context ? JSON.stringify(context) : '');
  }
}

export function createLogger(scope: string): Logger {
  return new Logger(scope);
}
