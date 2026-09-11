export interface BridgePromptInput {
  sourceConnectorId: string;
  sourceOperationId: string;
  sourceOutputs: Record<string, any>;
  targetConnectorId: string;
  targetOperationId: string;
  targetInputSchema: any[];
  userConfiguredMapping?: Record<string, any>;
  catalogHints?: any[];
}

export class BridgePromptBuilder {
  /**
   * Build LLM System Prompt with strict formatting rules
   */
  public static buildSystemPrompt(): string {
    return `You are AutoFlow AI Data Bridge, an enterprise data transformation intelligence engine.
Your sole job is to take output data from a Source Connector Node (Step A) and transform/map/coerce/sanitize it into the exact Input Schema required by a Target Connector Node (Step B).

STRICT RULES:
1. Respond ONLY with valid, raw JSON (no markdown formatting, no code block backticks like \`\`\`json).
2. The JSON MUST follow this exact schema:
{
  "fieldMapping": {
    "targetFieldKey": "mapped_value_or_string"
  },
  "coercions": [
    {
      "field": "targetFieldKey",
      "ruleId": "coercion_rule_name",
      "from": "original_format",
      "to": "target_format"
    }
  ],
  "confidence": 0.95,
  "reasoning": "Short explanation of mapping logic"
}
3. Honor all required fields in the Target Input Schema.
4. Apply correct data formatting (e.g. phone E.164, currency conversion, date formatting).
5. If userConfiguredMapping is provided, treat it as an explicit override.`;
  }

  /**
   * Build User Prompt containing source data, target schema, catalog hints
   */
  public static buildUserPrompt(input: BridgePromptInput): string {
    return JSON.stringify({
      context: "AUTOMATIC_STEP_DATA_BRIDGE",
      source: {
        connectorId: input.sourceConnectorId,
        operationId: input.sourceOperationId,
        outputData: input.sourceOutputs
      },
      target: {
        connectorId: input.targetConnectorId,
        operationId: input.targetOperationId,
        inputSchema: input.targetInputSchema
      },
      userOverrides: input.userConfiguredMapping || {},
      catalogHints: input.catalogHints || []
    }, null, 2);
  }
}
