import { SemanticFieldMatcher, TypeCoercer } from '@automation/data-mapper';
import { BridgePromptBuilder } from './bridge-prompt-builder';
import { BridgeResponseParser } from './bridge-response-parser';
import { BridgeCache } from './bridge-cache';
import { PostBridgeValidator, ValidationReport } from './post-bridge-validator';
import { Sanitizer } from './sanitizer';

export interface BridgeExecuteOptions {
  sourceConnectorId: string;
  sourceOperationId: string;
  sourceOutputs: Record<string, any>;
  targetConnectorId: string;
  targetOperationId: string;
  targetInputSchema: any[];
  userConfiguredMapping?: Record<string, any>;
  llmProvider?: (systemPrompt: string, userPrompt: string) => Promise<string>;
}

export interface BridgeExecutionResult {
  inputPayload: Record<string, any>;
  source: 'USER_OVERRIDE' | 'DETERMINISTIC' | 'CACHE_HIT' | 'AI_GENERATED' | 'FALLBACK';
  coercions: Array<{
    field: string;
    ruleId?: string;
    originalValue: any;
    coercedValue: any;
  }>;
  confidence: number;
  reasoning: string;
  validationReport: ValidationReport;
  cacheHit: boolean;
}

export class AIDataBridge {
  /**
   * Main entry point to bridge output from Step A to input for Step B automatically
   */
  public async execute(options: BridgeExecuteOptions): Promise<BridgeExecutionResult> {
    const {
      sourceConnectorId,
      sourceOperationId,
      sourceOutputs,
      targetConnectorId,
      targetOperationId,
      targetInputSchema,
      userConfiguredMapping,
      llmProvider
    } = options;

    const coercions: any[] = [];
    const sourceKeys = Object.keys(sourceOutputs || {});

    // 0. User Configured Overrides Priority
    if (userConfiguredMapping && Object.keys(userConfiguredMapping).length > 0) {
      const payload: Record<string, any> = { ...userConfiguredMapping };
      const report = PostBridgeValidator.validate(payload, targetInputSchema);
      return {
        inputPayload: payload,
        source: 'USER_OVERRIDE',
        coercions: [],
        confidence: 1.0,
        reasoning: 'Explicit user-configured template mapping used.',
        validationReport: report,
        cacheHit: false
      };
    }

    // 1. Check Deterministic Field Matcher & Type Coercer First
    const sourceFieldDefs = sourceKeys.map(k => ({ key: k, type: typeof sourceOutputs[k] }));
    const targetFieldDefs = targetInputSchema.map(s => ({
      key: s.key || s.name,
      label: s.label,
      type: s.type,
      semanticRole: s.semanticRole
    }));

    const matches = await SemanticFieldMatcher.findMatches(
      sourceConnectorId,
      sourceOperationId,
      targetConnectorId,
      targetOperationId,
      sourceFieldDefs,
      targetFieldDefs
    );

    const requiredTargetKeys = targetInputSchema.filter(s => s.required).map(s => s.key || s.name);
    const matchedTargetKeys = matches.map((m: any) => m.targetKey);
    const allRequiredMatched = requiredTargetKeys.every(req => matchedTargetKeys.includes(req));

    if (matches.length > 0 && allRequiredMatched) {
      const payload: Record<string, any> = {};

      for (const match of matches) {
        const rawValue = sourceOutputs[match.sourceKey];
        const targetSchemaDef = targetInputSchema.find(s => (s.key || s.name) === match.targetKey);
        
        // Coerce types/formats
        const coerced = TypeCoercer.coerce(
          rawValue,
          match.sourceKey.includes('date') ? 'iso_date' : null,
          targetSchemaDef?.format,
          targetSchemaDef?.type
        );

        if (coerced.coerced) {
          coercions.push({
            field: match.targetKey,
            ruleId: coerced.ruleId,
            originalValue: rawValue,
            coercedValue: coerced.value
          });
        }

        // Sanitize value
        const sanitized = Sanitizer.sanitizeValue(coerced.value, targetSchemaDef?.transformHints || []);
        payload[match.targetKey] = sanitized;
      }

      const report = PostBridgeValidator.validate(payload, targetInputSchema);

      if (report.valid) {
        return {
          inputPayload: payload,
          source: 'DETERMINISTIC',
          coercions,
          confidence: 0.98,
          reasoning: 'High-confidence deterministic schema matching & type coercion.',
          validationReport: report,
          cacheHit: false
        };
      }
    }

    // 2. Check Cache
    const cacheKey = BridgeCache.computeKey(sourceConnectorId, sourceOperationId, targetConnectorId, targetOperationId, sourceKeys);
    const cached = BridgeCache.get(cacheKey);

    if (cached) {
      const payload: Record<string, any> = {};
      for (const [targetKey, sourceKeyExpr] of Object.entries(cached.fieldMapping)) {
        if (typeof sourceKeyExpr === 'string' && sourceOutputs[sourceKeyExpr] !== undefined) {
          payload[targetKey] = sourceOutputs[sourceKeyExpr];
        } else {
          payload[targetKey] = sourceKeyExpr;
        }
      }
      const report = PostBridgeValidator.validate(payload, targetInputSchema);

      return {
        inputPayload: payload,
        source: 'CACHE_HIT',
        coercions: (cached.coercions || []).map((c: any) => ({
          field: c.field,
          ruleId: c.ruleId,
          originalValue: c.from,
          coercedValue: c.to
        })),
        confidence: cached.confidence,
        reasoning: 'Retrieved from AI Data Bridge execution cache.',
        validationReport: report,
        cacheHit: true
      };
    }

    // 3. Fallback to AI LLM Provider if available
    if (llmProvider) {
      try {
        const sysPrompt = BridgePromptBuilder.buildSystemPrompt();
        const usrPrompt = BridgePromptBuilder.buildUserPrompt({
          sourceConnectorId,
          sourceOperationId,
          sourceOutputs,
          targetConnectorId,
          targetOperationId,
          targetInputSchema
        });

        const rawLlmResponse = await llmProvider(sysPrompt, usrPrompt);
        const parsed = BridgeResponseParser.parse(rawLlmResponse);

        if (parsed.fieldMapping && Object.keys(parsed.fieldMapping).length > 0) {
          const payload: Record<string, any> = {};
          for (const [targetKey, expr] of Object.entries(parsed.fieldMapping)) {
            if (typeof expr === 'string' && sourceOutputs[expr] !== undefined) {
              payload[targetKey] = sourceOutputs[expr];
            } else {
              payload[targetKey] = expr;
            }
          }

          // Cache the successful AI mapping
          BridgeCache.set(cacheKey, parsed.fieldMapping, parsed.coercions, parsed.confidence);

          const report = PostBridgeValidator.validate(payload, targetInputSchema);

          return {
            inputPayload: payload,
            source: 'AI_GENERATED',
            coercions: (parsed.coercions || []).map((c: any) => ({
              field: c.field,
              ruleId: c.ruleId,
              originalValue: c.from,
              coercedValue: c.to
            })),
            confidence: parsed.confidence,
            reasoning: parsed.reasoning,
            validationReport: report,
            cacheHit: false
          };
        }
      } catch (err: any) {
        console.warn('AIDataBridge: LLM call failed, dropping to basic fallback mapping:', err.message);
      }
    }

    // 4. Basic Key Fallback (Best effort)
    const fallbackPayload: Record<string, any> = {};
    for (const schemaField of targetInputSchema) {
      const key = schemaField.key || schemaField.name;
      if (sourceOutputs[key] !== undefined) {
        fallbackPayload[key] = sourceOutputs[key];
      }
    }

    const report = PostBridgeValidator.validate(fallbackPayload, targetInputSchema);

    return {
      inputPayload: fallbackPayload,
      source: 'FALLBACK',
      coercions,
      confidence: 0.5,
      reasoning: 'Basic direct key matching fallback.',
      validationReport: report,
      cacheHit: false
    };
  }
}
