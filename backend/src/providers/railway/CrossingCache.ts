import { BoundingBox, RailwayCrossingRecord } from '@railway-gate/shared';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

export class CrossingCache {
  private idCache = new Map<string, CacheEntry<RailwayCrossingRecord>>();
  private bboxCache = new Map<string, CacheEntry<RailwayCrossingRecord[]>>();
  private defaultTtlMs: number;

  constructor(ttlHours = 168) { // Default 7 days (168 hours)
    this.defaultTtlMs = ttlHours * 60 * 60 * 1000;
  }

  public getById(id: string): RailwayCrossingRecord | null {
    const entry = this.idCache.get(id);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.idCache.delete(id);
      return null;
    }
    return entry.data;
  }

  public setById(id: string, record: RailwayCrossingRecord, ttlMs?: number): void {
    const now = Date.now();
    this.idCache.set(id, {
      data: record,
      cachedAt: now,
      expiresAt: now + (ttlMs || this.defaultTtlMs)
    });
  }

  public getByBBox(bbox: BoundingBox): RailwayCrossingRecord[] | null {
    const key = this.formatBBoxKey(bbox);
    const entry = this.bboxCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.bboxCache.delete(key);
      return null;
    }
    return entry.data;
  }

  public setByBBox(
    bbox: BoundingBox,
    records: RailwayCrossingRecord[],
    ttlMs?: number
  ): void {
    const key = this.formatBBoxKey(bbox);
    const now = Date.now();
    this.bboxCache.set(key, {
      data: records,
      cachedAt: now,
      expiresAt: now + (ttlMs || this.defaultTtlMs)
    });

    // Also prime individual ID cache
    for (const r of records) {
      this.setById(r.id, r, ttlMs);
    }
  }

  public getAllCached(): RailwayCrossingRecord[] {
    const now = Date.now();
    const results: RailwayCrossingRecord[] = [];
    const seen = new Set<string>();

    for (const [id, entry] of this.idCache.entries()) {
      if (now <= entry.expiresAt && !seen.has(id)) {
        seen.add(id);
        results.push(entry.data);
      }
    }
    return results;
  }

  public clear(): void {
    this.idCache.clear();
    this.bboxCache.clear();
  }

  private formatBBoxKey(bbox: BoundingBox): string {
    // Quantize bounding box to ~0.02 deg precision for optimal cache hit ratio
    const minLat = (Math.floor(bbox.minLat * 50) / 50).toFixed(2);
    const maxLat = (Math.ceil(bbox.maxLat * 50) / 50).toFixed(2);
    const minLng = (Math.floor(bbox.minLng * 50) / 50).toFixed(2);
    const maxLng = (Math.ceil(bbox.maxLng * 50) / 50).toFixed(2);
    return `${minLat},${minLng}_${maxLat},${maxLng}`;
  }
}
