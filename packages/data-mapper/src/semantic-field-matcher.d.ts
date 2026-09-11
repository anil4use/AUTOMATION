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
export declare class SemanticFieldMatcher {
    /**
     * Automatically match output fields from source connector operation to input fields of target connector operation
     */
    static findMatches(sourceConnectorId: string, sourceOperationId: string, targetConnectorId: string, targetOperationId: string, sourceOutputs: FieldDefinition[], targetInputs: FieldDefinition[]): Promise<MatchCandidate[]>;
}
