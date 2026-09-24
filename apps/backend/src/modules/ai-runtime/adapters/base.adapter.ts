export interface ExecutionOptions {
  model: string;
  systemPrompt: string;
  userMessage?: string;
  temperature?: number;
  maxTokens?: number;
  structuredOutput?: boolean;
}

export interface ExecutionResult {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
}

export abstract class BaseAIAdapter {
  protected providerId: string;
  protected baseUrl: string;
  protected credentials: Record<string, any>;

  constructor(providerId: string, baseUrl: string, credentials: Record<string, any>) {
    this.providerId = providerId;
    this.baseUrl = baseUrl;
    this.credentials = credentials;
  }

  abstract execute(options: ExecutionOptions): Promise<ExecutionResult>;
}
