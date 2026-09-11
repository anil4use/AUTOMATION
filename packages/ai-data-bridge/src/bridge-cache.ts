export interface CacheEntry {
  key: string;
  fieldMapping: Record<string, any>;
  coercions: any[];
  confidence: number;
  hitCount: number;
  createdAt: Date;
}

export class BridgeCache {
  private static cache: Map<string, CacheEntry> = new Map();
  private static ttlMs = 24 * 60 * 60 * 1000; // 24 hours default TTL

  /**
   * Compute deterministic cache key from source and target operation details
   */
  public static computeKey(
    sourceConnectorId: string,
    sourceOpId: string,
    targetConnectorId: string,
    targetOpId: string,
    sourceKeys: string[]
  ): string {
    const sortedKeys = [...sourceKeys].sort().join(',');
    return `${sourceConnectorId}:${sourceOpId}__${targetConnectorId}:${targetOpId}__[${sortedKeys}]`;
  }

  /**
   * Get cached mapping entry
   */
  public static get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.createdAt.getTime() > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry;
  }

  /**
   * Store mapping entry in cache
   */
  public static set(key: string, fieldMapping: Record<string, any>, coercions: any[], confidence: number): void {
    this.cache.set(key, {
      key,
      fieldMapping,
      coercions,
      confidence,
      hitCount: 0,
      createdAt: new Date()
    });
  }

  /**
   * Clear cache
   */
  public static clear(): void {
    this.cache.clear();
  }
}
