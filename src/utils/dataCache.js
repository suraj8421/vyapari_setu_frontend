// src/utils/dataCache.js
// Simple in‑memory cache with TTL for frontend data fetching.
// Provides getOrFetch(key, fetchFn, ttl?) and clearCache() helpers.

const cacheMap = new Map();

/**
 * Retrieve a value from cache or invoke fetchFn to obtain it.
 * @param {string} key Unique cache key.
 * @param {Function} fetchFn Async function that returns the data when cache miss.
 * @param {number} [ttl=300000] Time‑to‑live in ms (default 5 minutes).
 * @returns {Promise<any>} Cached or freshly fetched data.
 */
export async function getOrFetch(key, fetchFn, ttl = 300000) {
  const now = Date.now();
  const entry = cacheMap.get(key);
  if (entry && now - entry.timestamp < ttl) {
    return entry.value;
  }
  const value = await fetchFn();
  cacheMap.set(key, { value, timestamp: now });
  return value;
}

/**
 * Invalidate a specific cache key.
 * @param {string} key 
 */
export function invalidate(key) {
  cacheMap.delete(key);
}

/**
 * Invalidate all keys matching a prefix or a list of prefixes.
 * @param {string|string[]} prefixes 
 */
export function invalidateMany(prefixes) {
  const prefixArray = Array.isArray(prefixes) ? prefixes : [prefixes];
  for (const key of cacheMap.keys()) {
    if (prefixArray.some(p => key.startsWith(p))) {
      cacheMap.delete(key);
    }
  }
}

/**
 * Clear all cached entries.
 */
export function clearCache() {
  cacheMap.clear();
}

export default { getOrFetch, invalidate, invalidateMany, clearCache };

