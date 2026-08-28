interface CacheItem<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

export class TrainDataCache {
  private cache = new Map<string, CacheItem<any>>();
  private rateLimitWindow = new Map<string, number>();

  /**
   * Retrieves an unexpired item from cache, or null if missing/expired.
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Stores an item in cache with a specific TTL in seconds.
   */
  public set<T>(key: string, data: T, ttlSeconds: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      cachedAt: now,
      expiresAt: now + ttlSeconds * 1000
    });
  }

  /**
   * Checks if an external API key/endpoint is currently rate-limited (e.g. after receiving a 429).
   */
  public isRateLimited(endpointKey: string): boolean {
    const blockedUntil = this.rateLimitWindow.get(endpointKey);
    if (!blockedUntil) return false;

    if (Date.now() > blockedUntil) {
      this.rateLimitWindow.delete(endpointKey);
      return false;
    }
    return true;
  }

  /**
   * Records a rate-limit block for a given duration in seconds.
   */
  public markRateLimited(endpointKey: string, cooldownSeconds = 60): void {
    this.rateLimitWindow.set(endpointKey, Date.now() + cooldownSeconds * 1000);
  }

  /**
   * Clears all cache entries.
   */
  public clear(): void {
    this.cache.clear();
    this.rateLimitWindow.clear();
  }
}
