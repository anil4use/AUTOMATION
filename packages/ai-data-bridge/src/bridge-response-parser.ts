export interface ParsedBridgeResponse {
  fieldMapping: Record<string, any>;
  coercions: Array<{
    field: string;
    ruleId: string;
    from: string;
    to: string;
  }>;
  confidence: number;
  reasoning: string;
  rawResponse: string;
}

export class BridgeResponseParser {
  /**
   * Parse raw LLM output text into a structured ParsedBridgeResponse
   */
  public static parse(rawOutput: string): ParsedBridgeResponse {
    let cleanText = rawOutput.trim();

    // Strip markdown JSON fences if present
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleanText);

      return {
        fieldMapping: typeof parsed.fieldMapping === 'object' && parsed.fieldMapping !== null ? parsed.fieldMapping : {},
        coercions: Array.isArray(parsed.coercions) ? parsed.coercions : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'AI generated mapping',
        rawResponse: rawOutput
      };
    } catch (err: any) {
      console.error('BridgeResponseParser: Failed to parse LLM response as JSON:', err.message);
      return {
        fieldMapping: {},
        coercions: [],
        confidence: 0,
        reasoning: `JSON Parse Failure: ${err.message}`,
        rawResponse: rawOutput
      };
    }
  }
}
