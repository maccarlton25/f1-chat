/**
 * F1 Cache — session-lifecycle-aware TTL cache.
 *
 * F1 data has three lifecycle states with opposite freshness needs:
 *
 *   Upcoming  → race hasn't started, schedule is stable (cache 1h)
 *   LIVE      → race in progress, positions updating (cache 15-30s)
 *   Completed → data is immutable forever (cache 24h)
 *
 * The cache uses a plain in-memory Map — no external dependency.
 * Works identically locally and on Vercel. For production at scale,
 * swap the Map for Vercel Runtime Cache (getCache from @vercel/functions)
 * — same interface, one file change.
 */

interface CacheEntry<T> {
  readonly data: T;
  readonly expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Returns cached data if it exists and hasn't expired, otherwise undefined. */
export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (entry === undefined) return undefined;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }

  return entry.data as T;
}

/** Stores data with a TTL in seconds. After TTL expires, the next read misses. */
export function setCached<T>(key: string, data: T, ttlSeconds: number): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Computes the correct TTL based on where we are in the session's lifecycle.
 *
 * @param sessionStart ISO date string for session start
 * @param sessionEnd   ISO date string for session end
 * @param liveTtl      TTL in seconds to use while the session is LIVE
 * @returns TTL in seconds for the current moment
 */
export function sessionTtl(
  sessionStart: string | undefined,
  sessionEnd: string | undefined,
  liveTtl: number,
): number {
  if (!sessionStart || !sessionEnd) return 3600;

  const now = Date.now();
  const start = new Date(sessionStart).getTime();
  const end = new Date(sessionEnd).getTime();

  if (now < start) return 3600;
  if (now >= start && now <= end) return liveTtl;
  return 86400;
}

/** Clears all cached entries — useful for testing or manual refresh. */
export function clearCache(): void {
  store.clear();
}
