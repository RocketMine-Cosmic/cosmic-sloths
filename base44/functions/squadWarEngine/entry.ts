import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session.
// Single endpoint for Squad Wars: viewing current war, history, and admin pairing/resolution.
// Server is the sole writer for kills/scores/winners — all updates server-authoritative.
//
// Actions:
//  - 'getCurrent'  : returns the current week's war for a given squad (or null)
//  - 'getHistory'  : returns recent wars for a given squad (last ~12)
//  - 'getRoster'   : returns all wars for the current week (for the global "Wars Board")
//  - 'pairAndResolve' : ADMIN-ONLY — pair squads for new week + resolve previous week wars
//  - 'claimWinBonus'  : member of winning squad collects per-member bonus (idempotent)

const WAR_WIN_GOLD_PER_MEMBER = 3500;
const WAR_WIN_FRAGMENTS_PER_MEMBER = 5;
const WAR_TIE_GOLD_PER_MEMBER = 1500;
const WAR_TIE_FRAGMENTS_PER_MEMBER = 1;
const WAR_LOSS_GOLD_PER_MEMBER = 750;

function getCurrentWeekId() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${year}-W${String(isoWeek).padStart(2, '0')}`;
}

function getPreviousWeekId(currentWeekId) {
    // Parse YYYY-Www format and subtract one week
    const m = /^(\d{4})-W(\d{2})$/.exec(currentWeekId);
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const week = parseInt(m[2], 10);
    if (week > 1) return `${year}-W${String(week - 1).padStart(2, '0')}`;
    // Roll over to last week of previous year (approx — week 52)
    return `${year - 1}-W52`;
}

async function grantToPlayerSave(base44, walletAddress, gold, fragments) {
    const walletLower = walletAddress.toLowerCase();
    const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower });
    if (records.length === 0) throw new Error('PlayerSave not found');
    const record = records[0];
    const saveData = typeof record.save_data === 'string' ? JSON.parse(record.save_data) : record.save_data;
    saveData.gold = (saveData.gold || 0) + gold;
    if (fragments > 0) saveData.relicFragments = (saveData.relicFragments || 0) + fragments;
    saveData.updated_at = Date.now();
    await base44.asServiceRole.entities.PlayerSave.update(record.id, {
        save_data: saveData,
        updated_at: Date.now()
    });
    return { gold: saveData.gold, relicFragments: saveData.relicFragments || 0 };
}

// Pair eligible squads for a given week. Idempotent — if a war already exists
// for a squad in that week, we skip it. Squads with at least 1 member are eligible.
async function pairSquadsForWeek(base44, weekId) {
    const allSquads = await base44.asServiceRole.entities.Squad.list('-level', 500);
    const eligible = allSquads.filter(s => (s.member_count || 0) >= 1);
    if (eligible.length === 0) return { paired: 0, byes: 0 };

    // Find existing wars for this week so we don't double-pair
    const existingWars = await base44.asServiceRole.entities.SquadWar.filter({ week_id: weekId });
    const alreadyPaired = new Set();
    existingWars.forEach(w => {
        if (w.squad_a_id) alreadyPaired.add(w.squad_a_id);
        if (w.squad_b_id) alreadyPaired.add(w.squad_b_id);
    });

    const toPair = eligible.filter(s => !alreadyPaired.has(s.id));
    // Sort by level desc so similar-tier squads pair together
    toPair.sort((a, b) => (b.level || 1) - (a.level || 1));

    let paired = 0, byes = 0;
    for (let i = 0; i < toPair.length; i += 2) {
        const a = toPair[i];
        const b = toPair[i + 1];
        if (b) {
            await base44.asServiceRole.entities.SquadWar.create({
                week_id: weekId,
                squad_a_id: a.id, squad_a_name: a.name, squad_a_tag: a.tag, squad_a_icon: a.icon || '🛡️', squad_a_level: a.level || 1,
                squad_b_id: b.id, squad_b_name: b.name, squad_b_tag: b.tag, squad_b_icon: b.icon || '🛡️', squad_b_level: b.level || 1,
                kills_a: 0, kills_b: 0,
                is_resolved: false,
                rewarded_member_wallets: [],
            });
            paired++;
        } else {
            // Odd squad out — bye week (auto-win, no opponent)
            await base44.asServiceRole.entities.SquadWar.create({
                week_id: weekId,
                squad_a_id: a.id, squad_a_name: a.name, squad_a_tag: a.tag, squad_a_icon: a.icon || '🛡️', squad_a_level: a.level || 1,
                squad_b_id: '', squad_b_name: 'No Opponent', squad_b_tag: '---', squad_b_icon: '👻', squad_b_level: 0,
                kills_a: 0, kills_b: 0,
                is_resolved: false, // resolves on next pairing run
                result_kind: 'bye',
                rewarded_member_wallets: [],
            });
            byes++;
        }
    }
    return { paired, byes };
}

// Resolve all unresolved wars for a given week. Updates squad win/loss/tie counts
// and tags the war with a winner. Players claim per-member bonuses separately
// via 'claimWinBonus' so we don't write to PlayerSave for absent players.
async function resolveWarsForWeek(base44, weekId) {
    const wars = await base44.asServiceRole.entities.SquadWar.filter({ week_id: weekId, is_resolved: false });
    let resolved = 0;
    for (const war of wars) {
        const isBye = war.result_kind === 'bye' || !war.squad_b_id;
        let winnerId = '';
        let resultKind = 'tie';
        if (isBye) {
            winnerId = war.squad_a_id;
            resultKind = 'bye';
        } else if ((war.kills_a || 0) > (war.kills_b || 0)) {
            winnerId = war.squad_a_id;
            resultKind = 'win_a';
        } else if ((war.kills_b || 0) > (war.kills_a || 0)) {
            winnerId = war.squad_b_id;
            resultKind = 'win_b';
        } else {
            winnerId = '';
            resultKind = 'tie';
        }

        await base44.asServiceRole.entities.SquadWar.update(war.id, {
            is_resolved: true,
            winner_squad_id: winnerId,
            result_kind: resultKind,
        });

        // Update lifetime squad stats
        const updateSquadStats = async (squadId, didWin, didTie) => {
            if (!squadId) return;
            try {
                const sq = await base44.asServiceRole.entities.Squad.get(squadId);
                if (!sq) return;
                const patch = {};
                if (didWin) {
                    patch.war_wins = (sq.war_wins || 0) + 1;
                    patch.war_streak = (sq.war_streak || 0) + 1;
                } else if (didTie) {
                    patch.war_ties = (sq.war_ties || 0) + 1;
                    patch.war_streak = 0;
                } else {
                    patch.war_losses = (sq.war_losses || 0) + 1;
                    patch.war_streak = 0;
                }
                await base44.asServiceRole.entities.Squad.update(squadId, patch);
            } catch (e) {
                console.error('[squadWarEngine] failed to update squad stats:', e.message);
            }
        };

        if (resultKind === 'tie') {
            await updateSquadStats(war.squad_a_id, false, true);
            await updateSquadStats(war.squad_b_id, false, true);
        } else if (resultKind === 'bye' || resultKind === 'win_a') {
            await updateSquadStats(war.squad_a_id, true, false);
            if (war.squad_b_id) await updateSquadStats(war.squad_b_id, false, false);
        } else if (resultKind === 'win_b') {
            await updateSquadStats(war.squad_a_id, false, false);
            await updateSquadStats(war.squad_b_id, true, false);
        }
        resolved++;
    }
    return resolved;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Please sign in to continue.' }, { status: 401 });

        const walletAddress = me.wallet_address;
        const body = await req.json();
        const { action } = body;

        // ---- Public read actions ----
        if (action === 'getCurrent') {
            const { squadId } = body;
            if (!squadId) return Response.json({ war: null });
            const weekId = getCurrentWeekId();
            const wars = await base44.asServiceRole.entities.SquadWar.filter({ week_id: weekId });
            const war = wars.find(w => w.squad_a_id === squadId || w.squad_b_id === squadId) || null;
            return Response.json({ war, weekId });
        }

        if (action === 'getHistory') {
            const { squadId, limit } = body;
            if (!squadId) return Response.json({ wars: [] });
            // Pull recent wars from SquadWar entity, then filter to those involving the squad
            const all = await base44.asServiceRole.entities.SquadWar.list('-created_date', 200);
            const mine = all.filter(w => w.squad_a_id === squadId || w.squad_b_id === squadId).slice(0, Math.min(limit || 12, 50));
            return Response.json({ wars: mine });
        }

        if (action === 'getRoster') {
            // All wars for the current week (global "Wars Board")
            const weekId = getCurrentWeekId();
            const wars = await base44.asServiceRole.entities.SquadWar.filter({ week_id: weekId });
            // Sort by total kills desc (most exciting first)
            wars.sort((a, b) => ((b.kills_a || 0) + (b.kills_b || 0)) - ((a.kills_a || 0) + (a.kills_b || 0)));
            return Response.json({ wars, weekId });
        }

        // ---- Member action: claim per-member bonus from a resolved war ----
        if (action === 'claimWinBonus') {
            const { warId } = body;
            if (!walletAddress) return Response.json({ error: 'Your wallet isn\'t linked yet.' }, { status: 400 });
            if (!warId) return Response.json({ error: 'Missing war id.' }, { status: 400 });

            const war = await base44.asServiceRole.entities.SquadWar.get(warId);
            if (!war) return Response.json({ error: 'War not found.' }, { status: 404 });
            if (!war.is_resolved) return Response.json({ error: 'This war hasn\'t finished yet.' }, { status: 400 });

            const already = (war.rewarded_member_wallets || []).map(w => w.toLowerCase());
            if (already.includes(walletAddress.toLowerCase())) {
                return Response.json({ error: 'You\'ve already claimed your war bonus.', alreadyClaimed: true }, { status: 409 });
            }

            // Verify the caller was a member of one of the warring squads at claim time
            const memberRecords = await base44.asServiceRole.entities.SquadMember.filter({ wallet_address: walletAddress });
            if (memberRecords.length === 0) {
                return Response.json({ error: 'You\'re not in a squad.' }, { status: 403 });
            }
            const mySquadId = memberRecords[0].squad_id;
            const inWar = mySquadId === war.squad_a_id || mySquadId === war.squad_b_id;
            if (!inWar) {
                return Response.json({ error: 'You weren\'t part of this war\'s squads.' }, { status: 403 });
            }

            // Determine reward tier
            const isWinner = war.winner_squad_id && war.winner_squad_id === mySquadId;
            const isTie = !war.winner_squad_id && war.result_kind === 'tie';
            let gold, fragments, label;
            if (isWinner) {
                gold = WAR_WIN_GOLD_PER_MEMBER;
                fragments = WAR_WIN_FRAGMENTS_PER_MEMBER;
                label = 'win';
            } else if (isTie) {
                gold = WAR_TIE_GOLD_PER_MEMBER;
                fragments = WAR_TIE_FRAGMENTS_PER_MEMBER;
                label = 'tie';
            } else {
                gold = WAR_LOSS_GOLD_PER_MEMBER;
                fragments = 0;
                label = 'loss';
            }

            // Mark claimed FIRST so concurrent calls fail
            const updatedClaimList = [...(war.rewarded_member_wallets || []), walletAddress.toLowerCase()];
            await base44.asServiceRole.entities.SquadWar.update(warId, {
                rewarded_member_wallets: updatedClaimList,
            });

            const totals = await grantToPlayerSave(base44, walletAddress, gold, fragments);
            return Response.json({
                success: true,
                reward: { gold, fragments, label },
                saveData: totals,
            });
        }

        // ---- Admin: pair + resolve. Idempotent: safe to call repeatedly. ----
        if (action === 'pairAndResolve') {
            // Allow scheduled calls (no user) OR admin user
            if (me && me.role !== 'admin' && me.role !== 'owner') {
                // Scheduled automation runs without a user; if a user IS set, require admin
                return Response.json({ error: 'Forbidden.' }, { status: 403 });
            }
            const currentWeek = getCurrentWeekId();
            const prevWeek = getPreviousWeekId(currentWeek);

            // 1. Resolve previous week first (so winners are tagged before new pairings show)
            const resolvedCount = prevWeek ? await resolveWarsForWeek(base44, prevWeek) : 0;
            // 2. Pair this week's squads
            const pairResult = await pairSquadsForWeek(base44, currentWeek);

            return Response.json({
                success: true,
                resolvedPreviousWeek: prevWeek,
                resolvedCount,
                paired: pairResult.paired,
                byes: pairResult.byes,
                currentWeek,
            });
        }

        return Response.json({ error: 'Unknown action.' }, { status: 400 });
    } catch (error) {
        console.error('[squadWarEngine]', error.message);
        return Response.json({ error: 'Something went wrong with Squad Wars. Please try again.' }, { status: 500 });
    }
});