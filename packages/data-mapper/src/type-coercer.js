"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeCoercer = void 0;
const database_1 = require("@automation/database");
class TypeCoercer {
    static ruleCache = new Map();
    static cacheLoaded = false;
    /**
     * Load coercion rules into in-memory cache for ultra-fast runtime execution
     */
    static async loadRules() {
        try {
            const rules = await database_1.ConnectorCoercionRulesModel.find({ enabled: true }).lean();
            this.ruleCache.clear();
            for (const rule of rules) {
                if (rule.ruleId) {
                    this.ruleCache.set(rule.ruleId, rule);
                }
            }
            this.cacheLoaded = true;
        }
        catch (err) {
            console.warn('TypeCoercer: DB unavailable, using built-in fallback rules.');
        }
    }
    /**
     * Coerce a value based on source format/role and target format/role
     */
    static coerce(value, sourceFormat, targetFormat, targetType) {
        const original = value;
        if (value === undefined || value === null) {
            return { value, coerced: false, originalValue: original };
        }
        // 1. Check Cents -> Dollars
        if (sourceFormat === 'currency_cents' && targetFormat === 'currency_dollars') {
            const num = Number(value);
            if (!isNaN(num)) {
                return { value: Number((num / 100).toFixed(2)), coerced: true, ruleId: 'cents_to_dollars', originalValue: original };
            }
        }
        // 2. Check Dollars -> Cents
        if (sourceFormat === 'currency_dollars' && targetFormat === 'currency_cents') {
            const num = Number(value);
            if (!isNaN(num)) {
                return { value: Math.round(num * 100), coerced: true, ruleId: 'dollars_to_cents', originalValue: original };
            }
        }
        // 3. Unix Timestamp -> ISO Date
        if (sourceFormat === 'unix_timestamp' && targetFormat === 'iso_date') {
            let num = Number(value);
            if (!isNaN(num)) {
                // Handle seconds vs milliseconds
                if (num < 1e11)
                    num *= 1000;
                return { value: new Date(num).toISOString(), coerced: true, ruleId: 'unix_to_iso', originalValue: original };
            }
        }
        // 4. ISO Date -> Unix Timestamp
        if (sourceFormat === 'iso_date' && targetFormat === 'unix_timestamp') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return { value: Math.floor(date.getTime() / 1000), coerced: true, ruleId: 'iso_to_unix', originalValue: original };
            }
        }
        // 5. Target Type Conversions
        if (targetType) {
            const currentType = Array.isArray(value) ? 'array' : typeof value;
            if (targetType === 'string' && currentType !== 'string') {
                if (currentType === 'array') {
                    return { value: value.join(', '), coerced: true, ruleId: 'array_to_string', originalValue: original };
                }
                if (currentType === 'object') {
                    return { value: JSON.stringify(value), coerced: true, ruleId: 'object_to_json_string', originalValue: original };
                }
                return { value: String(value), coerced: true, ruleId: 'number_to_string', originalValue: original };
            }
            if (targetType === 'number' && currentType === 'string') {
                const parsed = Number(value);
                if (!isNaN(parsed)) {
                    return { value: parsed, coerced: true, ruleId: 'string_to_number', originalValue: original };
                }
            }
            if (targetType === 'boolean' && currentType === 'string') {
                const lower = String(value).trim().toLowerCase();
                const boolVal = ['true', '1', 'yes'].includes(lower);
                return { value: boolVal, coerced: true, ruleId: 'string_to_boolean', originalValue: original };
            }
            if (targetType === 'array' && currentType === 'string') {
                const arr = String(value).split(',').map(s => s.trim()).filter(Boolean);
                return { value: arr, coerced: true, ruleId: 'string_to_array', originalValue: original };
            }
            if (targetType === 'object' && currentType === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (typeof parsed === 'object' && parsed !== null) {
                        return { value: parsed, coerced: true, ruleId: 'json_string_to_object', originalValue: original };
                    }
                }
                catch (_) { }
            }
        }
        return { value, coerced: false, originalValue: original };
    }
}
exports.TypeCoercer = TypeCoercer;
