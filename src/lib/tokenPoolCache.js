import { base44 } from '@/api/base44Client';

const tokenPoolCache = new Map();

export async function getTokenPool(periodId, periodType) {
    const cacheKey = `${periodId}:${periodType}`;
    
    // Return cached result if available
    if (tokenPoolCache.has(cacheKey)) {
        return tokenPoolCache.get(cacheKey);
    }
    
    try {
        const results = await base44.entities.TokenPool.filter({
            period_id: periodId,
            period_type: periodType
        });
        
        const pool = results[0] || null;
        tokenPoolCache.set(cacheKey, pool);
        return pool;
    } catch (err) {
        console.error('[tokenPoolCache] Failed to fetch TokenPool:', err);
        return null;
    }
}

export function clearTokenPoolCache(periodId, periodType) {
    if (periodId && periodType) {
        tokenPoolCache.delete(`${periodId}:${periodType}`);
    } else {
        tokenPoolCache.clear();
    }
}

export function getTokenPoolCacheSize() {
    return tokenPoolCache.size;
}