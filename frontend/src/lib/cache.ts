/**
 * Smart Client-Side SWR (Stale-While-Revalidate) Cache & Request Deduplicator
 * Designed for low-latency, zero-flicker transitions across SkillGraph.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time-to-live in ms
}

// In-memory memory cache for ultra-fast 0ms sync lookups
const memoryCache = new Map<string, CacheEntry<any>>();

// In-flight request deduplication map to prevent multiple concurrent identical requests
const inflightPromises = new Map<string, Promise<any>>();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default

/**
 * Retrieve cached data from memory or localStorage
 */
export function getCachedData<T>(key: string): T | null {
  // 1. Check in-memory cache first (0ms)
  const mem = memoryCache.get(key);
  if (mem) {
    return mem.data as T;
  }

  // 2. Fall back to localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`sg_cache_${key}`);
      if (raw) {
        const parsed: CacheEntry<T> = JSON.parse(raw);
        // Put in memory for faster subsequent reads
        memoryCache.set(key, parsed);
        return parsed.data;
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }

  return null;
}

/**
 * Store data into memory and localStorage
 */
export function setCachedData<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl
  };

  memoryCache.set(key, entry);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`sg_cache_${key}`, JSON.stringify(entry));
    } catch {
      // LocalStorage quota may be exceeded; memory cache still works
    }
  }
}

/**
 * Check if a cache entry is still within its fresh TTL
 */
export function isCacheFresh(key: string): boolean {
  const mem = memoryCache.get(key);
  if (mem) {
    return Date.now() - mem.timestamp < mem.ttl;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`sg_cache_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Date.now() - parsed.timestamp < parsed.ttl;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Invalidate cached items matching a prefix, or clear all
 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('sg_cache_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}
    }
    return;
  }

  // Prefix match
  for (const k of Array.from(memoryCache.keys())) {
    if (k.startsWith(prefix)) {
      memoryCache.delete(k);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      const storagePrefix = `sg_cache_${prefix}`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(storagePrefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
}

/**
 * SWR (Stale-While-Revalidate) Smart Fetcher
 *
 * 1. Returns cached data immediately if present (0ms UI render).
 * 2. Deduplicates concurrent requests for the exact same key.
 * 3. Triggers background revalidation if the data is stale or missing.
 * 4. Calls onFresh callback when updated fresh data arrives from network.
 */
export async function smartFetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    forceRefresh?: boolean;
    onFresh?: (freshData: T) => void;
  }
): Promise<T> {
  const ttl = options?.ttl ?? DEFAULT_TTL;
  const cached = getCachedData<T>(key);
  const isFresh = isCacheFresh(key);

  // If we have cached data and not forcing refresh
  if (cached !== null && !options?.forceRefresh) {
    // If it's still fresh, return directly without background network call
    if (isFresh) {
      return cached;
    }

    // Stale: Return cached immediately, trigger background revalidation
    executeDeduplicatedFetch(key, fetcher, ttl)
      .then(freshData => {
        if (options?.onFresh && JSON.stringify(cached) !== JSON.stringify(freshData)) {
          options.onFresh(freshData);
        }
      })
      .catch(err => {
        console.warn(`[SmartCache] Background revalidation failed for ${key}:`, err);
      });

    return cached;
  }

  // No cache or forceRefresh: await the network fetch
  return executeDeduplicatedFetch(key, fetcher, ttl);
}

/**
 * Deduplicates in-flight promises so multiple components requesting the same key
 * only trigger one active network request.
 */
function executeDeduplicatedFetch<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
  if (inflightPromises.has(key)) {
    return inflightPromises.get(key) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const result = await fetcher();
      if (result !== undefined && result !== null) {
        setCachedData(key, result, ttl);
      }
      return result;
    } finally {
      inflightPromises.delete(key);
    }
  })();

  inflightPromises.set(key, promise);
  return promise;
}
