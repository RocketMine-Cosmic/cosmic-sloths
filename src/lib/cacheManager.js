/**
 * Centralized caching layer using sessionStorage
 * For non-sensitive, frequently-accessed data with TTL support
 */

const CACHE_PREFIX = 'cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data if valid
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if expired/missing
 */
export function getCache(key) {
  try {
    const item = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;
    
    const { data, expiresAt } = JSON.parse(item);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Set cache data with TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - TTL in milliseconds (default: 5 min)
 */
export function setCache(key, data, ttl = DEFAULT_TTL) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      expiresAt: Date.now() + ttl
    }));
  } catch {
    // Fail silently if sessionStorage is unavailable
  }
}

/**
 * Clear specific cache entry
 * @param {string} key - Cache key
 */
export function clearCache(key) {
  try {
    sessionStorage.removeItem(CACHE_PREFIX + key);
  } catch {}
}

/**
 * Clear all app cache entries
 */
export function clearAllCache() {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

/**
 * Fetch with automatic caching
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function that returns a promise
 * @param {number} ttl - TTL in milliseconds
 * @returns {Promise} - Cached or fresh data
 */
export async function cacheOrFetch(key, fetchFn, ttl = DEFAULT_TTL) {
  const cached = getCache(key);
  if (cached !== null) return cached;
  
  const data = await fetchFn();
  setCache(key, data, ttl);
  return data;
}