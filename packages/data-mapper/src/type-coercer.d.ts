export interface CoercionResult {
    value: any;
    coerced: boolean;
    ruleId?: string;
    originalValue: any;
}
export declare class TypeCoercer {
    private static ruleCache;
    private static cacheLoaded;
    /**
     * Load coercion rules into in-memory cache for ultra-fast runtime execution
     */
    static loadRules(): Promise<void>;
    /**
     * Coerce a value based on source format/role and target format/role
     */
    static coerce(value: any, sourceFormat?: string | null, targetFormat?: string | null, targetType?: string): CoercionResult;
}
