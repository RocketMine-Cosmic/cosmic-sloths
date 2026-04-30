import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Returns the current ISO week id (Mon-based) for UTC, e.g. "2026-W18".
export function getCurrentWeekId() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${year}-W${String(isoWeek).padStart(2, '0')}`;
}

// Derives the season id (4-week buckets) from a week id, e.g. "2026-W18" -> "2026-S5".
export function seasonIdFromWeekId(weekId) {
    if (!weekId || !weekId.includes('-W')) return '';
    const [year, weekPart] = weekId.split('-W');
    const week = Number(weekPart);
    if (!Number.isFinite(week)) return '';
    const seasonNum = Math.floor((week - 1) / 4) + 1;
    return `${year}-S${seasonNum}`;
}

export function getCurrentSeasonId() {
    return seasonIdFromWeekId(getCurrentWeekId());
}

/**
 * Loads available period IDs from existing TokenPools, so admin tools can
 * offer a dropdown instead of free-text input. Always includes the current
 * week and season at the top, even if no pool exists yet.
 *
 * Returns:
 *   { weeks: ['2026-W18', '2026-W17', …], seasons: ['2026-S5', '2026-S4', …], isLoading }
 */
export function useAvailablePeriods(walletAddress) {
    const { data: pools = [], isLoading } = useQuery({
        queryKey: ['adminPoolsForPeriods', walletAddress],
        queryFn: () => base44.functions.invoke('getAdminData', { type: 'pools' })
            .then(r => r.data?.pools || []),
        enabled: !!walletAddress,
        staleTime: 60_000,
    });

    const currentWeek = getCurrentWeekId();
    const currentSeason = getCurrentSeasonId();

    const weekSet = new Set([currentWeek]);
    const seasonSet = new Set([currentSeason]);
    pools.forEach(p => {
        if (p.period_type === 'weekly' && p.period_id) weekSet.add(p.period_id);
        if (p.period_type === 'seasonal' && p.period_id) seasonSet.add(p.period_id);
    });

    const weeks = Array.from(weekSet).sort((a, b) => b.localeCompare(a));
    const seasons = Array.from(seasonSet).sort((a, b) => b.localeCompare(a));

    return { weeks, seasons, currentWeek, currentSeason, isLoading };
}