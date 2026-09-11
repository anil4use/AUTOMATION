export interface ValidationReport {
  valid: boolean;
  missingFields: string[];
  typeMismatches: Array<{
    field: string;
    expected: string;
    actual: string;
  }>;
  warnings: string[];
}

export class PostBridgeValidator {
  /**
   * Validate transformed input payload against target connector schema definitions
   */
  public static validate(payload: Record<string, any>, targetInputSchema: any[] = []): ValidationReport {
    const missingFields: string[] = [];
    const typeMismatches: Array<{ field: string; expected: string; actual: string }> = [];
    const warnings: string[] = [];

    for (const schemaField of targetInputSchema) {
      const key = schemaField.key || schemaField.name;
      const val = payload[key];

      // 1. Required Check
      if (schemaField.required) {
        if (val === undefined || val === null || val === '') {
          missingFields.push(key);
        }
      }

      // 2. Type Check
      if (val !== undefined && val !== null && schemaField.type) {
        const actualType = Array.isArray(val) ? 'array' : typeof val;
        const expectedType = schemaField.type.toLowerCase();

        // Allow loose matches for string/number conversions if valid
        if (expectedType === 'string' && actualType !== 'string') {
          typeMismatches.push({ field: key, expected: expectedType, actual: actualType });
        } else if (expectedType === 'number' && actualType !== 'number') {
          typeMismatches.push({ field: key, expected: expectedType, actual: actualType });
        } else if (expectedType === 'boolean' && actualType !== 'boolean') {
          typeMismatches.push({ field: key, expected: expectedType, actual: actualType });
        } else if (expectedType === 'array' && actualType !== 'array') {
          typeMismatches.push({ field: key, expected: expectedType, actual: actualType });
        }
      }
    }

    const valid = missingFields.length === 0 && typeMismatches.length === 0;

    return {
      valid,
      missingFields,
      typeMismatches,
      warnings
    };
  }
}
