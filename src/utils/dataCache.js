// ============================================
// Shared Data Cache + Request Deduplicator
// ============================================
// Centralises all static-ish data caching so ANY component or hook
// can read from the same in-memory store without triggering duplicate
// network requests.
//
// Features:
//  • Time-to-live (TTL) per key — configurable, default 5 min
//  • In-flight deduplication — if two callers request the same key
//    at the same time, only ONE fetch fires; both get the same promise
//  • Manual invalidation — call invalidate(key) after a mutation
//    (e.g. after adding a new customer, invalidate 'customers')

const _store = new Map();           // key → { data, ts }
const _inflight = new Map();        // key → Promise (dedup in-flight requests)

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get or fetch data for a given key.
 *
 * @param {string} key       - Cache key (e.g. 'customers', 'products')
 * @param {Function} fetcher - Async function that fetches and returns the data
 * @param {number} [ttl]     - Time-to-live in ms (default 5 min)
 * @returns {Promise<any>}
 */
export async function getOrFetch(key, fetcher, ttl = DEFAULT_TTL) {
    // 1. Cache hit — return immediately without network call
    const cached = _store.get(key);
    if (cached && Date.now() - cached.ts < ttl) {
        return cached.data;
    }

    // 2. Dedup — if a fetch for this key is already in-flight, return the same promise
    if (_inflight.has(key)) {
        return _inflight.get(key);
    }

    // 3. Miss — fire the fetch, register it as in-flight, store result
    const promise = fetcher().then((data) => {
        _store.set(key, { data, ts: Date.now() });
        _inflight.delete(key);
        return data;
    }).catch((err) => {
        _inflight.delete(key);
        throw err;
    });

    _inflight.set(key, promise);
    return promise;
}

/**
 * Manually invalidate a cache entry (call after write mutations).
 * @param {string} key
 */
export function invalidate(key) {
    _store.delete(key);
}

/**
 * Invalidate multiple keys at once.
 * @param {string[]} keys
 */
export function invalidateMany(keys) {
    keys.forEach((k) => _store.delete(k));
}

/**
 * Clear the entire cache (e.g. on logout).
 */
export function clearCache() {
    _store.clear();
    _inflight.clear();
}
