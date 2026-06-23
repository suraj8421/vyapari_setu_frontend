// src/utils/dataCache.js
// Simple in‑memory cache with TTL for frontend data fetching.
// Provides getOrFetch(key, fetchFn, ttl?) and clearCache() helpers.

const cacheMap = new Map();

/**
 * Helper to get the user prefix for key scoping.
 */
function getUserPrefix() {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.id) return `${u.id}_`;
    } catch (_) {}
  }
  return '';
}

/**
 * Retrieve a value from cache or invoke fetchFn to obtain it.
 * @param {string} key Unique cache key.
 * @param {Function} fetchFn Async function that returns the data when cache miss.
 * @param {number} [ttl=300000] Time‑to‑live in ms (default 5 minutes).
 * @returns {Promise<any>} Cached or freshly fetched data.
 */
export async function getOrFetch(key, fetchFn, ttl = 300000) {
  const scopedKey = `${getUserPrefix()}${key}`;
  const now = Date.now();
  const entry = cacheMap.get(scopedKey);
  if (entry && now - entry.timestamp < ttl) {
    return entry.value;
  }
  const value = await fetchFn();
  cacheMap.set(scopedKey, { value, timestamp: now });
  return value;
}

/**
 * Invalidate a specific cache key.
 * @param {string} key 
 */
export function invalidate(key) {
  const scopedKey = `${getUserPrefix()}${key}`;
  cacheMap.delete(scopedKey);
}

/**
 * Invalidate all keys matching a prefix or a list of prefixes.
 * @param {string|string[]} prefixes 
 */
export function invalidateMany(prefixes) {
  const prefix = getUserPrefix();
  const prefixArray = Array.isArray(prefixes) ? prefixes : [prefixes];
  for (const key of cacheMap.keys()) {
    if (prefixArray.some(p => {
      const scopedPrefix = `${prefix}${p}`;
      return key.startsWith(scopedPrefix);
    })) {
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

