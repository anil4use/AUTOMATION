export type SQLDialect = 'postgresql' | 'mysql' | 'mssql' | 'sqlite';

export interface ParameterizeResult {
  sql: string;
  params: any[];
}

/**
 * Extracts {{variable.path}} tokens from SQL strings and replaces them with dialect-appropriate placeholders.
 */
export function parameterizeQuery(sql: string, variables: Record<string, any> = {}, dialect: SQLDialect = 'postgresql'): ParameterizeResult {
  const params: any[] = [];
  let paramIndex = 1;

  // Match {{token.path}} inside SQL text
  const parameterizedSql = sql.replace(/\{\{\s*([\w\.-]+)\s*\}\}/g, (_match, tokenPath) => {
    let val: any = undefined;
    
    // Resolve value from variables dictionary
    if (variables && typeof variables === 'object') {
      const keys = tokenPath.split('.');
      let current: any = variables;
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          current = undefined;
          break;
        }
      }
      val = current;
    }

    params.push(val);

    switch (dialect) {
      case 'postgresql':
        return `$${paramIndex++}`;
      case 'mssql':
        return `@p${paramIndex++}`;
      case 'mysql':
      case 'sqlite':
      default:
        paramIndex++;
        return '?';
    }
  });

  return {
    sql: parameterizedSql,
    params,
  };
}

/**
 * Smart regex LIMIT enforcer.
 * - Respects process.env.TEST_RESULT_CAP override if defined.
 * - If no LIMIT clause is found, appends LIMIT <defaultCap>.
 * - If LIMIT <= ceiling (50,000), retains user's LIMIT.
 * - If LIMIT > ceiling (50,000), replaces with LIMIT 50000.
 */
export function enforceLimitCap(
  sql: string,
  maxDefault = 10000,
  maxCeiling = 50000
): { sql: string; limitApplied: number; isTruncatedCheckRequired: boolean } {
  const effectiveCap = process.env.TEST_RESULT_CAP
    ? parseInt(process.env.TEST_RESULT_CAP, 10)
    : maxDefault;

  const outerLimitRegex = /\bLIMIT\s+(\d+)\s*;?\s*$/i;
  const match = sql.match(outerLimitRegex);

  if (!match) {
    const trimmed = sql.trim().replace(/;$/, '');
    return {
      sql: `${trimmed} LIMIT ${effectiveCap}`,
      limitApplied: effectiveCap,
      isTruncatedCheckRequired: true,
    };
  }

  const existingLimit = parseInt(match[1], 10);
  if (existingLimit > maxCeiling) {
    return {
      sql: sql.replace(outerLimitRegex, `LIMIT ${maxCeiling}`),
      limitApplied: maxCeiling,
      isTruncatedCheckRequired: true,
    };
  }

  return {
    sql,
    limitApplied: Math.min(existingLimit, effectiveCap),
    isTruncatedCheckRequired: true,
  };
}

/**
 * Statement Guard: Verifies SQL statements against allowed statement permissions (e.g. ['SELECT']).
 */
export function checkAllowedStatements(sql: string, allowedStatements?: string[]): void {
  if (!allowedStatements || allowedStatements.length === 0) {
    return; // All statements allowed by default
  }

  const upperSql = sql.toUpperCase();
  const disallowedKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'EXEC', 'GRANT', 'REVOKE'];

  const allowedUpper = allowedStatements.map(s => s.toUpperCase());

  for (const keyword of disallowedKeywords) {
    if (!allowedUpper.includes(keyword) && new RegExp(`\\b${keyword}\\b`, 'i').test(upperSql)) {
      throw new Error(`Statement type '${keyword}' is not permitted on this connection (allowed: ${allowedStatements.join(', ')}).`);
    }
  }
}
