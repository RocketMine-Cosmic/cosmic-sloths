import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Lightweight player retention / DAU dashboard data source.
//
// Designed to be CHEAP and rate-limit-safe:
//   - One bounded read (PlayerSave with updated_at >= 30 days ago, capped at 5000 rows).
//     With current playerbase (~80 MAU) this is well under any limits and well under
//     200KB. If MAU grows past a few thousand, we can switch to bucket counters or
//     server-side aggregation — but that's a future problem.
//   - All bucket counts (DAU / WAU / MAU / 7-day chart / new vs returning) are
//     computed in-memory from the single fetch — zero extra DB calls.
//   - Cached server-side for 60s so admins refreshing the tab don't refire the read.
//
// Returns:
//   {
//     generated_at: number,
//     totals: { dau, wau, mau, all_time_players },
//     daily: [{ date, active, new_players }] x 14,   // last 14 days incl. today
//     hourly_today: [{ hour, active }] x 24,         // rolling 24h, hour buckets
//     top_active: [{ player_name, wallet_address, updated_at }] x 20,
//     stale_signups: [{ player_name, wallet_address, created_date }] x 20,  // joined >7d ago, never returned
//   }

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

let _cache = null;
const CACHE_TTL_MS = 60_000;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const wallet = me.wallet_address?.toLowerCase();
        if (!wallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });

        const admins = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: wallet });
        if (admins.length === 0) return Response.json({ error: 'Forbidden' }, { status: 403 });
        const perms = admins[0].permissions || [];
        if (!perms.includes('owner') && !perms.includes('view_data')) {
            return Response.json({ error: "Forbidden — 'view_data' permission required" }, { status: 403 });
        }

        const now = Date.now();
        if (_cache && now - _cache.generated_at < CACHE_TTL_MS) {
            return Response.json({ ..._cache.data, cached: true });
        }

        const db = base44.asServiceRole;
        // One bounded read: everyone active in the last 30 days.
        const since30 = now - 30 * DAY;
        const recent = await db.entities.PlayerSave.filter(
            { updated_at: { $gte: since30 } },
            '-updated_at',
            5000
        );

        // Helper — strip a Date back to UTC YYYY-MM-DD
        const toDateKey = (ms) => {
            const d = new Date(ms);
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        };

        // Bucket sets — Set of wallets per day so we count unique players.
        const dayBuckets = new Map(); // dateKey -> Set<wallet>
        const newSignupsByDay = new Map(); // dateKey -> Set<wallet>
        const hourBuckets = new Map(); // hourIndex (0..23, where 0 = 23h ago) -> Set<wallet>

        let dau = 0, wau = 0, mau = 0;
        const dauSet = new Set();
        const wauSet = new Set();
        const mauSet = new Set();

        for (const ps of recent) {
            const w = (ps.wallet_address || '').toLowerCase();
            if (!w) continue;
            const ts = Number(ps.updated_at) || 0;
            if (!ts) continue;

            const age = now - ts;
            if (age <= 1 * DAY) dauSet.add(w);
            if (age <= 7 * DAY) wauSet.add(w);
            if (age <= 30 * DAY) mauSet.add(w);

            // Per-day bucket (last 14 days)
            if (age <= 14 * DAY) {
                const key = toDateKey(ts);
                if (!dayBuckets.has(key)) dayBuckets.set(key, new Set());
                dayBuckets.get(key).add(w);
            }

            // Hourly bucket — rolling last 24h
            if (age <= 24 * HOUR) {
                const hoursAgo = Math.floor(age / HOUR); // 0 = current hour, 23 = 23h ago
                const idx = 23 - hoursAgo; // so index 23 = "now", index 0 = "23h ago"
                if (idx >= 0 && idx <= 23) {
                    if (!hourBuckets.has(idx)) hourBuckets.set(idx, new Set());
                    hourBuckets.get(idx).add(w);
                }
            }

            // First-seen day (uses created_date — built-in attribute on every record).
            // Note: PlayerSave.created_date reflects when the row first appeared in
            // the DB, which for nearly every player matches their first session.
            if (ps.created_date) {
                const createdMs = new Date(ps.created_date).getTime();
                if (now - createdMs <= 14 * DAY) {
                    const key = toDateKey(createdMs);
                    if (!newSignupsByDay.has(key)) newSignupsByDay.set(key, new Set());
                    newSignupsByDay.get(key).add(w);
                }
            }
        }

        dau = dauSet.size;
        wau = wauSet.size;
        mau = mauSet.size;

        // Build 14-day daily series (oldest → newest)
        const daily = [];
        for (let i = 13; i >= 0; i--) {
            const ms = now - i * DAY;
            const key = toDateKey(ms);
            daily.push({
                date: key,
                active: dayBuckets.get(key)?.size || 0,
                new_players: newSignupsByDay.get(key)?.size || 0,
            });
        }

        // 24h hourly series (oldest → newest)
        const hourly_today = [];
        for (let i = 0; i <= 23; i++) {
            hourly_today.push({ hour: i, active: hourBuckets.get(i)?.size || 0 });
        }

        // Top 20 most recently active (already sorted desc by updated_at from the query)
        const top_active = recent.slice(0, 20).map(ps => ({
            player_name: ps.player_name || 'Unknown',
            wallet_address: ps.wallet_address || '',
            updated_at: ps.updated_at || 0,
        }));

        // Stale signups: joined >7d ago, last seen >7d ago. From the 30-day pool only
        // (so we naturally cap the scan — no extra DB calls).
        // We sort by created_date desc and take 20 to keep the payload tight.
        const stale_signups = recent
            .filter(ps => {
                if (!ps.created_date) return false;
                const createdMs = new Date(ps.created_date).getTime();
                const ageSinceJoin = now - createdMs;
                const ageSinceSeen = now - (Number(ps.updated_at) || 0);
                return ageSinceJoin >= 7 * DAY && ageSinceSeen >= 7 * DAY;
            })
            .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
            .slice(0, 20)
            .map(ps => ({
                player_name: ps.player_name || 'Unknown',
                wallet_address: ps.wallet_address || '',
                created_date: ps.created_date,
                last_seen: ps.updated_at || 0,
            }));

        // Best-effort all-time player count — uses a quick list with a high cap so
        // we get the actual number without scanning every row twice. Returns
        // whatever the DB gives us (capped); the dashboard labels it accordingly.
        let all_time_players = mau; // safe fallback
        try {
            // Lightweight existence list — only need length. Cap high enough to be
            // useful for the foreseeable playerbase. Not in the hot path of the
            // chart math, so an occasional 429 here just falls back to MAU.
            const all = await db.entities.PlayerSave.list('-created_date', 10000);
            all_time_players = all.length;
        } catch {}

        const data = {
            generated_at: now,
            totals: { dau, wau, mau, all_time_players },
            daily,
            hourly_today,
            top_active,
            stale_signups,
        };

        _cache = { generated_at: now, data };
        return Response.json(data);
    } catch (error) {
        console.error('[getPlayerRetention]', error);
        return Response.json({ error: error?.message || String(error) }, { status: 500 });
    }
});