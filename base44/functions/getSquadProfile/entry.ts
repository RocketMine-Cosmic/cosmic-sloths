import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns a public read-only profile for any squad: squad record, member roster
// with per-member stats (weekly kills, all-time kills, this-week raid damage,
// war wins claimed). Used by the SquadProfileModal and the squad members panel.
//
// Stats sources:
//  - PlayerSave.save_data.weeklyKills / totalKills — per wallet aggregate
//  - GlobalBossContribution — sum of damage rows for current week_id, per user_id (wallet)
//  - SquadWar.rewarded_member_wallets — count of resolved wars where this wallet
//    appears, scoped to wars involving this squad (war wins claimed)

// In-memory response cache. Keyed by squadId — same squad opened within
// CACHE_TTL_MS skips ALL database reads (PlayerSave, RunScore, GlobalBossContribution,
// SquadWar) and serves the cached payload. This is the fix for the "modal doesn't
// load on many-to-many requests" bug: every open used to do a 1000-row RunScore
// scan + 4 other heavy filters, which rate-limited under load.
const PROFILE_CACHE_TTL_MS = 30_000;
const profileCache = new Map(); // squadId -> { expiresAt, payload }

function getCachedProfile(squadId) {
    const entry = profileCache.get(squadId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
        profileCache.delete(squadId);
        return null;
    }
    return entry.payload;
}

function setCachedProfile(squadId, payload) {
    profileCache.set(squadId, { expiresAt: Date.now() + PROFILE_CACHE_TTL_MS, payload });
    // Cheap GC: if cache gets oversized, drop the oldest entries.
    if (profileCache.size > 200) {
        const cutoff = Date.now();
        for (const [k, v] of profileCache) {
            if (v.expiresAt < cutoff) profileCache.delete(k);
        }
    }
}

function getCurrentWeekId() {
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${now.getUTCFullYear()}-W${String(isoWeek).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { squadId } = await req.json();
        if (!squadId) return Response.json({ error: 'squadId required' }, { status: 400 });

        // Serve from cache when we have a fresh entry — skips ALL db reads.
        const cached = getCachedProfile(squadId);
        if (cached) return Response.json(cached);

        // Squad record (public read)
        const squad = await base44.asServiceRole.entities.Squad.get(squadId);
        if (!squad) return Response.json({ error: 'Squad not found' }, { status: 404 });

        // Members
        const members = await base44.asServiceRole.entities.SquadMember.filter({ squad_id: squadId });
        const memberWallets = members.map(m => (m.wallet_address || '').toLowerCase()).filter(Boolean);

        // Per-member stats — fetch in parallel
        const weekId = getCurrentWeekId();
        const [saves, raidContribs, squadWars, weeklyRuns] = await Promise.all([
            // PlayerSave per-member (total kills live in save_data.totalKills)
            memberWallets.length
                ? base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: { $in: memberWallets } })
                : Promise.resolve([]),
            // Raid damage this week
            base44.asServiceRole.entities.GlobalBossContribution.filter({ week_id: weekId, squad_id: squadId }, '-damage', 500),
            // All resolved wars this squad participated in (for win counts)
            base44.asServiceRole.entities.SquadWar.filter({
                $or: [{ squad_a_id: squadId }, { squad_b_id: squadId }],
                is_resolved: true,
            }, '-created_date', 200),
            // Weekly kills come from RunScore — sum per wallet for this week.
            // PlayerSave has no weeklyKills field (squad weekly_kills is the
            // aggregate). RunScore.wallet_address is the canonical wallet
            // (user_id on RunScore is the Base44 user id, NOT the wallet).
            // 200 rows ≈ 40 runs/member × 5 members — covers normal play. Heavy
            // farmers' totals slightly truncate, but the squad-level weekly_kills
            // headline is always accurate (it's an aggregate on the Squad record).
            // Was 1000 — main cause of rate-limit storms when many users opened
            // the modal at once.
            memberWallets.length
                ? base44.asServiceRole.entities.RunScore.filter({ week_id: weekId, wallet_address: { $in: memberWallets } }, '-created_date', 200)
                : Promise.resolve([]),
        ]);

        // Index helpers
        const saveByWallet = new Map();
        for (const s of saves) {
            saveByWallet.set((s.wallet_address || '').toLowerCase(), s.save_data || {});
        }
        const raidByWallet = new Map();
        for (const c of raidContribs) {
            const w = (c.user_id || '').toLowerCase();
            if (!w) continue;
            raidByWallet.set(w, (raidByWallet.get(w) || 0) + (c.damage || 0));
        }
        const weeklyKillsByWallet = new Map();
        const dailyKillsByWallet = new Map();
        // "Today" = UTC calendar day, mirroring squad.daily_kills rollover in saveScore.
        const todayUtc = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC
        for (const r of weeklyRuns) {
            const w = (r.wallet_address || '').toLowerCase();
            if (!w) continue;
            const kills = r.kills || 0;
            weeklyKillsByWallet.set(w, (weeklyKillsByWallet.get(w) || 0) + kills);
            // Cheap daily aggregate from the same in-memory rows — no extra DB read.
            const runDate = (r.created_date || '').split('T')[0];
            if (runDate === todayUtc) {
                dailyKillsByWallet.set(w, (dailyKillsByWallet.get(w) || 0) + kills);
            }
        }
        const warWinsByWallet = new Map();
        for (const w of squadWars) {
            // Only count this squad's wins (not ties, not byes — matches the claim rules)
            const isWinner = w.winner_squad_id && w.winner_squad_id === squadId;
            if (!isWinner) continue;
            const wallets = Array.isArray(w.rewarded_member_wallets) ? w.rewarded_member_wallets : [];
            for (const ww of wallets) {
                const key = (ww || '').toLowerCase();
                if (!key) continue;
                warWinsByWallet.set(key, (warWinsByWallet.get(key) || 0) + 1);
            }
        }

        // Build enriched member list (no sensitive fields exposed)
        const enrichedMembers = members.map(m => {
            const wallet = (m.wallet_address || '').toLowerCase();
            const sd = saveByWallet.get(wallet) || {};
            return {
                id: m.id,
                wallet_address: wallet,
                player_name: m.player_name,
                player_title: m.player_title || '',
                role: m.role,
                weekly_kills: weeklyKillsByWallet.get(wallet) || 0,
                daily_kills: dailyKillsByWallet.get(wallet) || 0,
                total_kills: Number(sd.totalKills || 0),
                raid_damage_this_week: raidByWallet.get(wallet) || 0,
                war_wins_claimed: warWinsByWallet.get(wallet) || 0,
            };
        });

        // Sort: leader first, then by weekly kills desc
        enrichedMembers.sort((a, b) => {
            if (a.role === 'leader' && b.role !== 'leader') return -1;
            if (b.role === 'leader' && a.role !== 'leader') return 1;
            return b.weekly_kills - a.weekly_kills;
        });

        const payload = {
            success: true,
            squad: {
                id: squad.id,
                name: squad.name,
                tag: squad.tag,
                description: squad.description || '',
                icon: squad.icon || '',
                privacy: squad.privacy || 'open',
                xp: squad.xp || 0,
                level: squad.level || 1,
                weekly_kills: squad.weekly_kills || 0,
                daily_kills: squad.daily_kills || 0,
                member_count: squad.member_count || enrichedMembers.length,
                war_wins: squad.war_wins || 0,
                war_losses: squad.war_losses || 0,
                war_ties: squad.war_ties || 0,
                war_streak: squad.war_streak || 0,
                created_date: squad.created_date,
            },
            members: enrichedMembers,
            weekId,
        };
        setCachedProfile(squadId, payload);
        return Response.json(payload);
    } catch (error) {
        console.error('[getSquadProfile]', error.message);
        // Pass through rate-limit responses with the right status + a clear message
        // so the modal shows "Too many requests" instead of a confusing 500.
        const msg = error.message || '';
        if (/rate limit/i.test(msg) || error.status === 429) {
            return Response.json({ error: 'Too many requests — please wait a moment and try again.' }, { status: 429 });
        }
        return Response.json({ error: 'Couldn\'t load this squad\'s profile. Please try again.' }, { status: 500 });
    }
});