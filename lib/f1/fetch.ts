/**
 * F1 Fetch — fetch wrapper with caching + retry with exponential backoff.
 *
 * Every tool calls f1Fetch instead of raw fetch. It:
 *   1. Checks the in-memory cache first — cache hits skip the API entirely
 *   2. On cache miss, fetches from OpenF1 with retry on 429 (rate limit)
 *   3. Caches the result with a TTL (static or session-lifecycle-aware)
 *
 * The retry handles intermittent 429s. The cache prevents redundant calls
 * when the agent chains multiple tools for a single question.
 */

import { getCached, setCached, sessionTtl } from "./cache";

export interface F1FetchOptions {
  /** Unique cache key — typically derived from the URL + params. */
  readonly cacheKey: string;
  /**
   * Function that computes TTL from the fetched data.
   * Use this for session-aware caching (e.g. shorter TTL during live races).
   * The function receives the parsed JSON response.
   */
  readonly computeTtl?: (data: unknown) => number;
  /** Static TTL in seconds. Used when computeTtl is not provided. */
  readonly ttlSeconds?: number;
  /** Max retry attempts on failure (default 3). */
  readonly retries?: number;
}

const OPENF1_BASE = "https://api.openf1.org/v1";

export async function f1Fetch<T>(path: string, options: F1FetchOptions): Promise<T> {
  const cached = getCached<T>(options.cacheKey);
  if (cached !== undefined) return cached;

  const url = path.startsWith("http") ? path : `${OPENF1_BASE}${path}`;
  const maxRetries = options.retries ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        const waitMs = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (response.status === 404) {
        const empty = [] as unknown as T;
        setCached(options.cacheKey, empty, options.ttlSeconds ?? 300);
        return empty;
      }

      if (!response.ok) {
        throw new Error(`OpenF1 API returned ${response.status} for ${path}`);
      }

      const data = (await response.json()) as T;

      const ttl = options.computeTtl
        ? options.computeTtl(data)
        : (options.ttlSeconds ?? 3600);

      setCached(options.cacheKey, data, ttl);
      return data;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const waitMs = Math.pow(2, attempt) * 500;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  throw lastError ?? new Error(`Failed after ${maxRetries} retries: ${path}`);
}
