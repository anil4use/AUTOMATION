import { manifestRegistry } from '@automation/connector-sdk';

/**
 * 4-Tier IO Field Matcher for AI Engine (Spec Compliant)
 *
 * Tier 1 (1.0): Exact key name + same type match
 * Tier 2 (0.8): Same type + Levenshtein distance <= 3
 * Tier 3 (0.65): Same type + shared root 4+ chars / semantic alias match
 * Tier 4 (0.0): No match (score 0.0, no mapping)
 */

export const FIELD_ALIASES: Record<string, string[]> = {
  email: ['emailAddress', 'mail', 'to', 'from', 'sender', 'recipient'],
  message: ['text', 'body', 'content', 'description', 'messageText', 'userMessage', 'snippet'],
  id: ['messageId', 'fileId', 'userId', 'itemId', 'recordId', 'threadId', 'draftId', 'channelId', 'pageId'],
  name: ['title', 'subject', 'label', 'displayName', 'summary', 'header', 'topic'],
};

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const lenA = a.length;
  const lenB = b.length;

  for (let i = 0; i <= lenB; i++) matrix[i] = [i];
  for (let j = 0; j <= lenA; j++) matrix[0][j] = j;

  for (let i = 1; i <= lenB; i++) {
    for (let j = 1; j <= lenA; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[lenB][lenA];
}

export interface MatchedField {
  sourceNodeId: string;
  sourceField: string;
  targetField: string;
  confidence: number;
  mappingExpression: string;
}

export function findBestFieldMatch(
  targetFieldKey: string,
  targetFieldType: string,
  upstreamOutputs: Array<{ nodeId: string; fields: Array<{ key: string; type: string }> }>
): MatchedField | null {
  let bestMatch: MatchedField | null = null;
  let maxScore = 0;

  const tKeyLower = targetFieldKey.toLowerCase();

  for (const upstream of upstreamOutputs) {
    for (const field of upstream.fields) {
      const fKeyLower = field.key.toLowerCase();
      const sameType = field.type === targetFieldType || field.type === 'string' || targetFieldType === 'string';
      let score = 0;

      // Tier 1: Exact Key + Same Type (1.0)
      if (fKeyLower === tKeyLower && sameType) {
        score = 1.0;
      }
      // Tier 2: Same Type + Levenshtein distance <= 3 (0.8)
      else if (sameType && levenshteinDistance(fKeyLower, tKeyLower) <= 3) {
        score = 0.8;
      }
      // Tier 3: Same Type + Shared Root (4+ chars) or Semantic Alias (0.65)
      else if (sameType) {
        const isAliasMatch = Object.entries(FIELD_ALIASES).some(([groupKey, aliases]) => {
          const inGroup = [groupKey, ...aliases].map((s) => s.toLowerCase());
          return inGroup.includes(fKeyLower) && inGroup.includes(tKeyLower);
        });

        const sharedRootLength = (a: string, b: string) => {
          let i = 0;
          while (i < a.length && i < b.length && a[i] === b[i]) i++;
          return i;
        };

        if (isAliasMatch || sharedRootLength(fKeyLower, tKeyLower) >= 4) {
          score = 0.65;
        }
      }

      // Tier 4: No Match (0.0) -> score remains 0

      if (score > maxScore && score > 0) {
        maxScore = score;
        bestMatch = {
          sourceNodeId: upstream.nodeId,
          sourceField: field.key,
          targetField: targetFieldKey,
          confidence: score,
          mappingExpression: `{{${upstream.nodeId}.output.${field.key}}}`,
        };
      }
    }
  }

  return bestMatch;
}

export interface IOMapResult {
  fieldMapping: Record<string, string>;
  fieldsNeedingReview: string[];
}

export function autoMapNodeInputs(
  targetNodeId: string,
  connectorId: string,
  operationId: string,
  upstreamNodes: Array<{ id: string; connectorId: string; operationId: string }>,
  existingConfig: Record<string, any> = {}
): IOMapResult {
  const targetManifest = manifestRegistry.getManifest(connectorId);
  if (!targetManifest) return { fieldMapping: {}, fieldsNeedingReview: [] };

  const operations = [...(targetManifest.triggers || []), ...(targetManifest.actions || [])];
  const targetOp = operations.find((o) => o.id === operationId);
  if (!targetOp) return { fieldMapping: {}, fieldsNeedingReview: [] };

  const upstreamOutputs = upstreamNodes.map((u) => {
    const manifest = manifestRegistry.getManifest(u.connectorId);
    const ops = [...(manifest?.triggers || []), ...(manifest?.actions || [])];
    const op = ops.find((o) => o.id === u.operationId);
    return {
      nodeId: u.id,
      fields: (op?.outputs || []).map((out) => ({ key: out.key, type: out.type })),
    };
  });

  const fieldMapping: Record<string, string> = {};
  const fieldsNeedingReview: string[] = [];

  for (const input of targetOp.inputs || []) {
    const existingVal = existingConfig[input.key] || '';
    // System variables guard: {{sys.*}} is always Tier 1 (1.0), never flag for review
    if (typeof existingVal === 'string' && existingVal.includes('{{sys.')) {
      continue;
    }

    const match = findBestFieldMatch(input.key, input.type, upstreamOutputs);
    if (match && match.confidence >= 0.65) {
      fieldMapping[input.key] = match.mappingExpression;

      // Tier 2 (0.8) & Tier 3 (0.65) require user review flag
      if (match.confidence < 1.0) {
        fieldsNeedingReview.push(`${targetNodeId}.${input.key}`);
      }
    } else {
      // Tier 4 (0.0): No match. Flag required empty fields for user review
      if (input.required && !existingVal) {
        fieldsNeedingReview.push(`${targetNodeId}.${input.key}`);
      }
    }
  }

  return { fieldMapping, fieldsNeedingReview };
}
