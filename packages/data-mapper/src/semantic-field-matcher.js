"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticFieldMatcher = void 0;
const database_1 = require("@automation/database");
class SemanticFieldMatcher {
    /**
     * Automatically match output fields from source connector operation to input fields of target connector operation
     */
    static async findMatches(sourceConnectorId, sourceOperationId, targetConnectorId, targetOperationId, sourceOutputs, targetInputs) {
        const matches = [];
        // Fetch field catalog entries from DB if available
        let catalogEntries = [];
        let synonymGroups = [];
        try {
            catalogEntries = await database_1.ConnectorFieldCatalogModel.find({
                $or: [
                    { connectorId: sourceConnectorId, operationId: sourceOperationId, direction: 'output' },
                    { connectorId: targetConnectorId, operationId: targetOperationId, direction: 'input' }
                ]
            }).lean();
            synonymGroups = await database_1.ConnectorSynonymGroupsModel.find({ enabled: true }).lean();
        }
        catch (_) {
            // DB optional fallback
        }
        const catalogMap = new Map();
        for (const entry of catalogEntries) {
            catalogMap.set(`${entry.connectorId}:${entry.operationId}:${entry.fieldKey}`, entry);
        }
        const synonymMap = new Map(); // synonym -> canonicalRole
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
            let bestMatch = null;
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
exports.SemanticFieldMatcher = SemanticFieldMatcher;
