import { ConnectorFieldCatalogModel, ConnectorSynonymGroupsModel } from '@automation/database';

export interface FieldDefinition {
  key: string;
  label?: string;
  type?: string;
  semanticRole?: string;
  format?: string;
}

export interface MatchCandidate {
  targetKey: string;
  sourceKey: string;
  confidence: number;
  matchType: 'exact_key' | 'exact_label' | 'synonym' | 'semantic_role';
  coercionNeeded?: boolean;
}

export class SemanticFieldMatcher {
  /**
   * Automatically match output fields from source connector operation to input fields of target connector operation
   */
  public static async findMatches(
    sourceConnectorId: string,
    sourceOperationId: string,
    targetConnectorId: string,
    targetOperationId: string,
    sourceOutputs: FieldDefinition[],
    targetInputs: FieldDefinition[]
  ): Promise<MatchCandidate[]> {
    const matches: MatchCandidate[] = [];

    // Fetch field catalog entries from DB if available
    let catalogEntries: any[] = [];
    let synonymGroups: any[] = [];
    try {
      catalogEntries = await ConnectorFieldCatalogModel.find({
        $or: [
          { connectorId: sourceConnectorId, operationId: sourceOperationId, direction: 'output' },
          { connectorId: targetConnectorId, operationId: targetOperationId, direction: 'input' }
        ]
      }).lean();

      synonymGroups = await ConnectorSynonymGroupsModel.find({ enabled: true }).lean();
    } catch (_) {
      // DB optional fallback
    }

    const catalogMap = new Map<string, any>();
    for (const entry of catalogEntries) {
      catalogMap.set(`${entry.connectorId}:${entry.operationId}:${entry.fieldKey}`, entry);
    }

    const synonymMap = new Map<string, string>(); // synonym -> canonicalRole
    for (const group of synonymGroups) {
      for (const syn of group.synonyms) {
        synonymMap.set(syn.toLowerCase(), group.canonicalRole);
      }
    }

    for (const targetField of targetInputs) {
      const targetKeyLower = targetField.key.toLowerCase();
      const targetLabelLower = (targetField.label || '').toLowerCase();
      const targetCatalog = catalogMap.get(`${targetConnectorId}:${targetOperationId}:${targetField.key}`);
      const targetRole = targetField.semanticRole || targetCatalog?.semanticRole;

      let bestMatch: MatchCandidate | null = null;

      for (const sourceField of sourceOutputs) {
        const sourceKeyLower = sourceField.key.toLowerCase();
        const sourceLabelLower = (sourceField.label || '').toLowerCase();
        const sourceCatalog = catalogMap.get(`${sourceConnectorId}:${sourceOperationId}:${sourceField.key}`);
        const sourceRole = sourceField.semanticRole || sourceCatalog?.semanticRole;

        // 1. Exact Key Match
        if (sourceKeyLower === targetKeyLower) {
          bestMatch = {
            targetKey: targetField.key,
            sourceKey: sourceField.key,
            confidence: 1.0,
            matchType: 'exact_key'
          };
          break;
        }

        // 2. Exact Label Match
        if (sourceLabelLower && targetLabelLower && sourceLabelLower === targetLabelLower) {
          if (!bestMatch || bestMatch.confidence < 0.95) {
            bestMatch = {
              targetKey: targetField.key,
              sourceKey: sourceField.key,
              confidence: 0.95,
              matchType: 'exact_label'
            };
          }
        }

        // 3. Semantic Role Match
        if (sourceRole && targetRole && sourceRole === targetRole) {
          if (!bestMatch || bestMatch.confidence < 0.90) {
            bestMatch = {
              targetKey: targetField.key,
              sourceKey: sourceField.key,
              confidence: 0.90,
              matchType: 'semantic_role'
            };
          }
        }

        // 4. Synonym Match
        const sourceCanonical = synonymMap.get(sourceKeyLower) || synonymMap.get(sourceLabelLower);
        const targetCanonical = synonymMap.get(targetKeyLower) || synonymMap.get(targetLabelLower);

        if (sourceCanonical && targetCanonical && sourceCanonical === targetCanonical) {
          if (!bestMatch || bestMatch.confidence < 0.85) {
            bestMatch = {
              targetKey: targetField.key,
              sourceKey: sourceField.key,
              confidence: 0.85,
              matchType: 'synonym'
            };
          }
        }
      }

      if (bestMatch && bestMatch.confidence >= 0.80) {
        matches.push(bestMatch);
      }
    }

    return matches;
  }
}
