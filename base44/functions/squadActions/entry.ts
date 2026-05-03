import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// No OmenX token needed — wallet was linked at first login.

const MAX_SQUAD_MEMBERS = 5;

// Server-authoritative bounty reward tables (must mirror pages/Squads.jsx for UI display)
const WEEKLY_BOUNTY_TIERS = [
    { minLevel: 1, target: 2000,  gold: 500,   fragments: 1 },
    { minLevel: 2, target: 5000,  gold: 1200,  fragments: 2 },
    { minLevel: 3, target: 10000, gold: 2500,  fragments: 3 },
    { minLevel: 4, target: 18000, gold: 4000,  fragments: 4 },
    { minLevel: 5, target: 30000, gold: 6500,  fragments: 5 },
    { minLevel: 6, target: 50000, gold: 10000, fragments: 7 },
    { minLevel: 7, target: 75000, gold: 15000, fragments: 10 },
];
const DAILY_BOUNTY_TIERS = [
    { minLevel: 1, target: 300,   gold: 150,  fragments: 0 },
    { minLevel: 2, target: 800,   gold: 300,  fragments: 0 },
    { minLevel: 3, target: 1500,  gold: 600,  fragments: 1 },
    { minLevel: 4, target: 2500,  gold: 1000, fragments: 1 },
    { minLevel: 5, target: 4500,  gold: 1500, fragments: 2 },
    { minLevel: 6, target: 7500,  gold: 2500, fragments: 2 },
    { minLevel: 7, target: 12000, gold: 4000, fragments: 3 },
];
function getTier(level, table) {
    let tier = table[0];
    for (const t of table) if (level >= t.minLevel) tier = t;
    return tier;
}

// Verify the caller is the leader of the given squad. Returns true if so,
// otherwise false. Used to gate squad-management actions (kick, settings,
// transfer leadership) so any random member can't mess with the squad.
async function isCallerLeader(base44, walletAddress, squadId) {
    if (!walletAddress || !squadId) return false;
    const records = await base44.asServiceRole.entities.SquadMember.filter({
        squad_id: squadId,
        wallet_address: walletAddress,
    });
    return records.length > 0 && records[0].role === 'leader';
}

// Grants gold/fragments directly to the player's cloud PlayerSave so the
// reward grant is server-authoritative and can't be tampered with by the client.
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

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Please sign in to continue.' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const body = await req.json();
        const { action } = body;

        // Authoritative pilot name from PlayerSave (set via Profile page).
        // We look it up once here so all writes (join/leave/message/system events)
        // use the same source of truth — never trust the client-submitted name.
        const fallbackName = `Pilot_${walletAddress.slice(-6).toUpperCase()}`;
        let authoritativeName = fallbackName;
        let authoritativeTitle = '';
        try {
            const saves = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress.toLowerCase() });
            if (saves.length > 0) {
                const sd = typeof saves[0].save_data === 'string' ? JSON.parse(saves[0].save_data) : saves[0].save_data;
                const n = (sd?.player_name || saves[0].player_name || '').trim();
                if (n) authoritativeName = n;
                const t = (sd?.player_title || '').trim();
                if (t) authoritativeTitle = t;
            }
        } catch {}

        if (action === 'join') {
            const { squadId } = body;
            const playerName = authoritativeName;
            const playerTitle = authoritativeTitle;
            if (!squadId) return Response.json({ error: 'Couldn\'t join the squad — please refresh and try again.' }, { status: 400 });

            // Validate squad exists & has space; reject duplicate joins.
            let squad;
            try {
                squad = await base44.asServiceRole.entities.Squad.get(squadId);
            } catch {
                return Response.json({ error: 'This squad no longer exists.' }, { status: 404 });
            }
            if (!squad) return Response.json({ error: 'This squad no longer exists.' }, { status: 404 });
            if ((squad.member_count || 0) >= MAX_SQUAD_MEMBERS) {
                return Response.json({ error: 'This squad is full.' }, { status: 400 });
            }
            const existingMember = await base44.asServiceRole.entities.SquadMember.filter({ wallet_address: walletAddress });
            if (existingMember.length > 0) {
                return Response.json({ error: 'You\'re already in a squad. Leave it before joining another.' }, { status: 400 });
            }

            // Mark current period as already-claimed so the new member can't claim
            // bounties earned by the squad before they joined. They'll be eligible
            // for the NEXT daily/weekly bounty once the period rolls over.
            // Use canonical ISO 8601 (Mon-start, Sun 23:59 UTC end). The previous
            // formula was Sunday-based and rolled W19 over a day early.
            const today = new Date().toISOString().split('T')[0];
            const currentWeek = (() => {
                const now = new Date();
                const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
                const dayNum = tmp.getUTCDay() || 7;
                tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
                const isoYear = tmp.getUTCFullYear();
                const yearStart = new Date(Date.UTC(isoYear, 0, 1));
                const isoWeek = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
                return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
            })();
            const member = await base44.asServiceRole.entities.SquadMember.create({
                squad_id: squadId,
                wallet_address: walletAddress,
                player_name: playerName || 'Pilot',
                player_title: playerTitle || '',
                role: 'member',
                last_payout_week: currentWeek,
                last_daily_payout_date: today
            });

            // Increment member count. Some SDK versions don't return the full record
            // from .update(), so re-fetch to guarantee the client gets a complete squad
            // object (this was causing "join" to silently leave the UI on the squad list).
            await base44.asServiceRole.entities.Squad.update(squadId, {
                member_count: (squad.member_count || 0) + 1
            });
            const updatedSquad = await base44.asServiceRole.entities.Squad.get(squadId);

            await base44.asServiceRole.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: 'system',
                player_name: 'SYSTEM',
                content: `${playerName || 'A pilot'} has joined the squad!`
            });

            return Response.json({ success: true, member, squad: updatedSquad });
        }

        if (action === 'leave') {
            const { memberId, squadId } = body;
            const playerName = authoritativeName;
            if (!memberId || !squadId) return Response.json({ error: 'Couldn\'t leave the squad — please refresh and try again.' }, { status: 400 });

            await base44.asServiceRole.entities.SquadMember.delete(memberId);

            // Decrement member count
            try {
                const squad = await base44.asServiceRole.entities.Squad.get(squadId);
                if (squad) {
                    await base44.asServiceRole.entities.Squad.update(squadId, {
                        member_count: Math.max(0, (squad.member_count || 1) - 1)
                    });
                }
            } catch {}

            await base44.asServiceRole.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: 'system',
                player_name: 'SYSTEM',
                content: `${playerName || 'A pilot'} has left the squad.`
            });

            return Response.json({ success: true });
        }

        if (action === 'kick') {
            const { targetMemberId, squadId } = body;
            if (!targetMemberId || !squadId) return Response.json({ error: 'Couldn\'t kick this member — please refresh and try again.' }, { status: 400 });

            // Only the leader can kick members.
            if (!(await isCallerLeader(base44, walletAddress, squadId))) {
                return Response.json({ error: 'Only the squad leader can kick members.' }, { status: 403 });
            }

            // Don't let the leader kick themselves via this endpoint (use 'leave' for that).
            try {
                const target = await base44.asServiceRole.entities.SquadMember.get(targetMemberId);
                if (target && target.wallet_address === walletAddress) {
                    return Response.json({ error: 'Use "leave squad" to remove yourself.' }, { status: 400 });
                }
            } catch {}

            await base44.asServiceRole.entities.SquadMember.delete(targetMemberId);

            // Decrement member count
            try {
                const squad = await base44.asServiceRole.entities.Squad.get(squadId);
                if (squad) {
                    await base44.asServiceRole.entities.Squad.update(squadId, {
                        member_count: Math.max(0, (squad.member_count || 1) - 1)
                    });
                }
            } catch {}

            return Response.json({ success: true });
        }

        if (action === 'sendMessage') {
            const { squadId, content } = body;
            const playerName = authoritativeName;
            const playerTitle = authoritativeTitle;
            if (!squadId || !content) return Response.json({ error: 'Couldn\'t send your message — please try again.' }, { status: 400 });

            // Block muted wallets. Auto-clean expired mutes inline so they don't linger.
            const mutes = await base44.asServiceRole.entities.MutedWallet.filter({ wallet_address: walletAddress.toLowerCase() });
            if (mutes.length > 0) {
                const m = mutes[0];
                const until = m.muted_until ? new Date(m.muted_until).getTime() : null;
                if (until && until < Date.now()) {
                    try { await base44.asServiceRole.entities.MutedWallet.delete(m.id); } catch {}
                } else {
                    const remaining = until
                        ? `until ${new Date(until).toISOString().replace('T', ' ').slice(0, 16)} UTC`
                        : 'by a moderator';
                    return Response.json({ error: `You've been muted from squad chat ${remaining}.`, muted: true }, { status: 403 });
                }
            }

            const message = await base44.asServiceRole.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: walletAddress,
                player_name: playerName || 'Pilot',
                player_title: playerTitle || '',
                content: content.substring(0, 200)
            });
            return Response.json({ success: true, message });
        }

        if (action === 'transferLeadership') {
            const { targetMemberId, squadId } = body;
            if (!targetMemberId || !squadId) return Response.json({ error: 'Couldn\'t transfer leadership — please refresh and try again.' }, { status: 400 });

            // Only the current leader can transfer leadership.
            const currentLeaderRecords = await base44.asServiceRole.entities.SquadMember.filter({
                squad_id: squadId,
                wallet_address: walletAddress
            });
            if (currentLeaderRecords.length === 0 || currentLeaderRecords[0].role !== 'leader') {
                return Response.json({ error: 'Only the current squad leader can transfer leadership.' }, { status: 403 });
            }

            // Sanity-check the target is a real member of the same squad
            try {
                const target = await base44.asServiceRole.entities.SquadMember.get(targetMemberId);
                if (!target || target.squad_id !== squadId) {
                    return Response.json({ error: 'Target is not a member of this squad.' }, { status: 400 });
                }
            } catch {
                return Response.json({ error: 'Target is not a member of this squad.' }, { status: 400 });
            }

            await base44.asServiceRole.entities.SquadMember.update(currentLeaderRecords[0].id, { role: 'member' });
            await base44.asServiceRole.entities.SquadMember.update(targetMemberId, { role: 'leader' });

            return Response.json({ success: true, newLeaderMemberId: targetMemberId });
        }

        if (action === 'saveSettings') {
            const { squadId, name, tag, description, icon } = body;
            if (!squadId) return Response.json({ error: 'Couldn\'t save squad settings — please refresh and try again.' }, { status: 400 });

            // Only the leader can change squad settings.
            if (!(await isCallerLeader(base44, walletAddress, squadId))) {
                return Response.json({ error: 'Only the squad leader can change squad settings.' }, { status: 403 });
            }

            await base44.asServiceRole.entities.Squad.update(squadId, {
                name: name?.trim(),
                tag: tag?.trim().toUpperCase().substring(0, 4),
                description: description?.trim() || '',
                icon: icon || '🛡️'
            });

            return Response.json({ success: true });
        }

        if (action === 'claimWeekly' || action === 'claimDaily') {
            const { memberId, squadId } = body;
            if (!memberId || !squadId) return Response.json({ error: 'Couldn\'t claim your bounty — please refresh and try again.' }, { status: 400 });

            // Load member + squad to validate
            const member = await base44.asServiceRole.entities.SquadMember.get(memberId);
            if (!member) return Response.json({ error: 'You\'re no longer a member of this squad.' }, { status: 404 });
            if (member.wallet_address !== walletAddress) return Response.json({ error: 'You can only claim your own rewards.' }, { status: 403 });
            if (member.squad_id !== squadId) return Response.json({ error: 'You\'re not a member of this squad.' }, { status: 400 });

            const squad = await base44.asServiceRole.entities.Squad.get(squadId);
            if (!squad) return Response.json({ error: 'This squad no longer exists.' }, { status: 404 });

            const isWeekly = action === 'claimWeekly';
            // Server-authoritative period IDs — IGNORE client values (stale tabs were
            // submitting W19 instead of W18 on Sundays, booking phantom claims).
            const periodId = isWeekly
                ? (() => {
                    const now = new Date();
                    const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
                    const dayNum = tmp.getUTCDay() || 7;
                    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
                    const isoYear = tmp.getUTCFullYear();
                    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
                    const isoWeek = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
                    return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
                })()
                : new Date().toISOString().split('T')[0];
            const lastClaimedField = isWeekly ? 'last_payout_week' : 'last_daily_payout_date';
            const killsField = isWeekly ? 'weekly_kills' : 'daily_kills';
            const tier = getTier(squad.level || 1, isWeekly ? WEEKLY_BOUNTY_TIERS : DAILY_BOUNTY_TIERS);

            // Check already claimed
            if (member[lastClaimedField] === periodId) {
                return Response.json({ error: 'You\'ve already claimed this bounty.', alreadyClaimed: true }, { status: 409 });
            }
            // Check progress threshold met
            if ((squad[killsField] || 0) < tier.target) {
                return Response.json({ error: 'Your squad hasn\'t reached the kill target yet.' }, { status: 400 });
            }

            // Mark claimed FIRST so concurrent calls fail
            await base44.asServiceRole.entities.SquadMember.update(memberId, { [lastClaimedField]: periodId });

            // Grant rewards to player's cloud PlayerSave
            const updatedTotals = await grantToPlayerSave(base44, walletAddress, tier.gold, tier.fragments);

            return Response.json({
                success: true,
                reward: { gold: tier.gold, fragments: tier.fragments },
                saveData: updatedTotals,
                member: { ...member, [lastClaimedField]: periodId },
            });
        }

        if (action === 'resetPeriods') {
            // Server-authoritative period rollover. We IGNORE the client's `current_week`
            // and `current_day` values (stale browser tabs with the old buggy formula were
            // pushing W19 here on Sundays, wiping kills mid-week). Server computes the
            // canonical ISO week + today's UTC date and only resets if the squad is
            // genuinely on a stale period.
            const { squadId } = body;
            if (!squadId) return Response.json({ error: 'Couldn\'t update squad — please refresh and try again.' }, { status: 400 });

            // Verify caller is a member of this squad.
            const memberRecords = await base44.asServiceRole.entities.SquadMember.filter({
                squad_id: squadId,
                wallet_address: walletAddress
            });
            if (memberRecords.length === 0) {
                return Response.json({ error: 'You\'re not a member of this squad.' }, { status: 403 });
            }

            // Canonical ISO 8601 week (Mon-start, Sun 23:59 UTC end).
            const canonicalWeek = (() => {
                const now = new Date();
                const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
                const dayNum = tmp.getUTCDay() || 7;
                tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
                const isoYear = tmp.getUTCFullYear();
                const yearStart = new Date(Date.UTC(isoYear, 0, 1));
                const isoWeek = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
                return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
            })();
            const canonicalDay = new Date().toISOString().split('T')[0];

            const squad = await base44.asServiceRole.entities.Squad.get(squadId);
            if (!squad) return Response.json({ error: 'Squad not found.' }, { status: 404 });

            const safePatch = {};
            // Weekly rollover: only if the squad's stored week is BEHIND the canonical week.
            // Roll prior weekly_kills into XP, then zero weekly_kills and stamp canonical week.
            if (squad.current_week && squad.current_week < canonicalWeek) {
                safePatch.current_week = canonicalWeek;
                safePatch.weekly_kills = 0;
                safePatch.xp = (squad.xp || 0) + (squad.weekly_kills || 0);
            } else if (squad.current_week !== canonicalWeek) {
                // Squad is stamped with a FUTURE week (corrupted by the old buggy client).
                // Heal it without wiping kills — those kills were earned in the real current week.
                safePatch.current_week = canonicalWeek;
            }

            // Daily rollover: only when stored day is behind today.
            if (squad.current_day && squad.current_day < canonicalDay) {
                safePatch.current_day = canonicalDay;
                safePatch.daily_kills = 0;
            } else if (squad.current_day !== canonicalDay) {
                safePatch.current_day = canonicalDay;
            }

            if (Object.keys(safePatch).length === 0) {
                // Nothing to reset — squad is already on the canonical period.
                return Response.json({ success: true, squad });
            }

            await base44.asServiceRole.entities.Squad.update(squadId, safePatch);
            const updatedSquad = await base44.asServiceRole.entities.Squad.get(squadId);
            return Response.json({ success: true, squad: updatedSquad });
        }

        return Response.json({ error: 'Couldn\'t process this request — please refresh and try again.' }, { status: 400 });
    } catch (error) {
        console.error('[squadActions]', error.message);
        return Response.json({ error: 'Something went wrong with your squad. Please try again.' }, { status: 500 });
    }
});