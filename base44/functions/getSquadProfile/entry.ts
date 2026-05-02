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
            memberWallets.length
                ? base44.asServiceRole.entities.RunScore.filter({ week_id: weekId, wallet_address: { $in: memberWallets } }, '-created_date', 1000)
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
        for (const r of weeklyRuns) {
            const w = (r.wallet_address || '').toLowerCase();
            if (!w) continue;
            weeklyKillsByWallet.set(w, (weeklyKillsByWallet.get(w) || 0) + (r.kills || 0));
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

        return Response.json({
            success: true,
            squad: {
                id: squad.id,
                name: squad.name,
                tag: squad.tag,
                description: squad.description || '',
                icon: squad.icon || '',
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
        });
    } catch (error) {
        console.error('[getSquadProfile]', error.message);
        return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
});