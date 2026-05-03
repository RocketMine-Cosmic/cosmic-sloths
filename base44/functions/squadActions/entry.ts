import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// No OmenX token needed — wallet was linked at first login.

const MAX_SQUAD_MEMBERS = 5;

// Daily squad XP awarded once per day (UTC) when ANY member first claims the daily bounty.
// Scales with squad level so higher-tier squads still feel rewarded but progression
// stays slow enough that weekly kills remain the primary XP driver. Tuned to give
// a level-1 squad ~7 days to reach Drifters (5000 XP) on dailies alone, much less
// with weekly kill XP added on top.
const DAILY_SQUAD_XP_BY_LEVEL = [
    500,   // Lv 1
    700,   // Lv 2
    900,   // Lv 3
    1200,  // Lv 4
    1500,  // Lv 5
    1800,  // Lv 6
    2000,  // Lv 7+
];

// MUST mirror game/SquadLevels.js. Used to recompute level when XP changes server-side.
const SQUAD_LEVEL_THRESHOLDS = [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 5000 },
    { level: 3, xpRequired: 15000 },
    { level: 4, xpRequired: 35000 },
    { level: 5, xpRequired: 75000 },
    { level: 6, xpRequired: 150000 },
    { level: 7, xpRequired: 300000 },
];

function computeSquadLevel(xp) {
    let lvl = 1;
    for (const t of SQUAD_LEVEL_THRESHOLDS) {
        if (xp >= t.xpRequired) lvl = t.level;
    }
    return lvl;
}

function getDailyXpForLevel(level) {
    const idx = Math.max(0, Math.min(DAILY_SQUAD_XP_BY_LEVEL.length - 1, (level || 1) - 1));
    return DAILY_SQUAD_XP_BY_LEVEL[idx];
}

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
// otherwise false. Used to gate squad-management actions (settings, transfer
// leadership, set ranks) so any random member can't mess with the squad.
async function isCallerLeader(base44, walletAddress, squadId) {
    if (!walletAddress || !squadId) return false;
    const records = await base44.asServiceRole.entities.SquadMember.filter({
        squad_id: squadId,
        wallet_address: walletAddress,
    });
    return records.length > 0 && records[0].role === 'leader';
}

// Leader OR officer — used for moderation actions (kick members,
// approve/deny join requests). Officers cannot touch other officers
// or the leader.
async function getCallerMember(base44, walletAddress, squadId) {
    if (!walletAddress || !squadId) return null;
    const records = await base44.asServiceRole.entities.SquadMember.filter({
        squad_id: squadId,
        wallet_address: walletAddress,
    });
    return records[0] || null;
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

            // Privacy gate: only `open` squads accept instant joins.
            // `request` squads must use the requestJoin flow; `closed` squads block all joins.
            const privacy = squad.privacy || 'open';
            if (privacy === 'closed') {
                return Response.json({ error: 'This squad is closed to new members.' }, { status: 403 });
            }
            if (privacy === 'request') {
                return Response.json({ error: 'This squad is invite-only. Send a join request instead.', requiresRequest: true }, { status: 403 });
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

            // Leader OR officer can kick. Officers can't kick the leader or other officers.
            const caller = await getCallerMember(base44, walletAddress, squadId);
            if (!caller || (caller.role !== 'leader' && caller.role !== 'officer')) {
                return Response.json({ error: 'Only squad leaders and officers can kick members.' }, { status: 403 });
            }

            // Validate target and rank-restriction.
            try {
                const target = await base44.asServiceRole.entities.SquadMember.get(targetMemberId);
                if (target && target.wallet_address === walletAddress) {
                    return Response.json({ error: 'Use "leave squad" to remove yourself.' }, { status: 400 });
                }
                if (target && caller.role === 'officer' && (target.role === 'leader' || target.role === 'officer')) {
                    return Response.json({ error: 'Officers can\'t kick the leader or other officers.' }, { status: 403 });
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
            const { squadId, name, tag, description, icon, privacy } = body;
            if (!squadId) return Response.json({ error: 'Couldn\'t save squad settings — please refresh and try again.' }, { status: 400 });

            // Only the leader can change squad settings.
            if (!(await isCallerLeader(base44, walletAddress, squadId))) {
                return Response.json({ error: 'Only the squad leader can change squad settings.' }, { status: 403 });
            }

            const patch = {
                name: name?.trim(),
                tag: tag?.trim().toUpperCase().substring(0, 4),
                description: description?.trim() || '',
                icon: icon || '🛡️',
            };
            // Only update privacy when an allowed value is supplied.
            if (privacy === 'open' || privacy === 'request' || privacy === 'closed') {
                patch.privacy = privacy;
            }
            await base44.asServiceRole.entities.Squad.update(squadId, patch);

            const updatedSquad = await base44.asServiceRole.entities.Squad.get(squadId);
            return Response.json({ success: true, squad: updatedSquad });
        }

        // ----- Join Requests (privacy = 'request' flow) -----

        if (action === 'requestJoin') {
            const { squadId } = body;
            if (!squadId) return Response.json({ error: 'Couldn\'t send your join request — please refresh and try again.' }, { status: 400 });

            let squad;
            try { squad = await base44.asServiceRole.entities.Squad.get(squadId); } catch {}
            if (!squad) return Response.json({ error: 'This squad no longer exists.' }, { status: 404 });
            if ((squad.privacy || 'open') !== 'request') {
                return Response.json({ error: 'This squad doesn\'t accept join requests.' }, { status: 400 });
            }
            if ((squad.member_count || 0) >= MAX_SQUAD_MEMBERS) {
                return Response.json({ error: 'This squad is full.' }, { status: 400 });
            }
            const existingMember = await base44.asServiceRole.entities.SquadMember.filter({ wallet_address: walletAddress });
            if (existingMember.length > 0) {
                return Response.json({ error: 'You\'re already in a squad. Leave it before requesting to join another.' }, { status: 400 });
            }
            // Reject duplicates: one pending request per (squad, wallet) max.
            const existing = await base44.asServiceRole.entities.SquadJoinRequest.filter({
                squad_id: squadId,
                wallet_address: walletAddress.toLowerCase(),
                status: 'pending',
            });
            if (existing.length > 0) {
                return Response.json({ error: 'You already have a pending request to this squad.' }, { status: 409 });
            }
            const request = await base44.asServiceRole.entities.SquadJoinRequest.create({
                squad_id: squadId,
                wallet_address: walletAddress.toLowerCase(),
                player_name: authoritativeName,
                player_title: authoritativeTitle,
                status: 'pending',
            });
            return Response.json({ success: true, request });
        }

        if (action === 'approveJoin' || action === 'denyJoin') {
            const { requestId, squadId } = body;
            if (!requestId || !squadId) return Response.json({ error: 'Couldn\'t process this request — please refresh and try again.' }, { status: 400 });

            // Leader OR officer can approve/deny.
            const caller = await getCallerMember(base44, walletAddress, squadId);
            if (!caller || (caller.role !== 'leader' && caller.role !== 'officer')) {
                return Response.json({ error: 'Only leaders and officers can manage join requests.' }, { status: 403 });
            }

            let request;
            try { request = await base44.asServiceRole.entities.SquadJoinRequest.get(requestId); } catch {}
            if (!request || request.squad_id !== squadId) {
                return Response.json({ error: 'This join request no longer exists.' }, { status: 404 });
            }
            if (request.status !== 'pending') {
                return Response.json({ error: 'This request has already been handled.' }, { status: 409 });
            }

            if (action === 'denyJoin') {
                await base44.asServiceRole.entities.SquadJoinRequest.update(requestId, { status: 'denied' });
                return Response.json({ success: true });
            }

            // Approve — mirror join logic but skip the privacy gate.
            const squad = await base44.asServiceRole.entities.Squad.get(squadId);
            if (!squad) return Response.json({ error: 'This squad no longer exists.' }, { status: 404 });
            if ((squad.member_count || 0) >= MAX_SQUAD_MEMBERS) {
                return Response.json({ error: 'Your squad is full — kick someone first.' }, { status: 400 });
            }
            // Make sure the requester didn't already join another squad while waiting.
            const existingMember = await base44.asServiceRole.entities.SquadMember.filter({ wallet_address: request.wallet_address });
            if (existingMember.length > 0) {
                await base44.asServiceRole.entities.SquadJoinRequest.update(requestId, { status: 'denied' });
                return Response.json({ error: 'That pilot has already joined another squad.' }, { status: 409 });
            }

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
            await base44.asServiceRole.entities.SquadMember.create({
                squad_id: squadId,
                wallet_address: request.wallet_address,
                player_name: request.player_name || 'Pilot',
                player_title: request.player_title || '',
                role: 'member',
                last_payout_week: currentWeek,
                last_daily_payout_date: today,
            });
            await base44.asServiceRole.entities.Squad.update(squadId, {
                member_count: (squad.member_count || 0) + 1,
            });
            await base44.asServiceRole.entities.SquadJoinRequest.update(requestId, { status: 'approved' });
            await base44.asServiceRole.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: 'system',
                player_name: 'SYSTEM',
                content: `${request.player_name || 'A pilot'} has joined the squad!`,
            });
            return Response.json({ success: true });
        }

        // ----- Member Ranks (officer/member toggle) -----

        if (action === 'setRank') {
            const { targetMemberId, squadId, rank } = body;
            if (!targetMemberId || !squadId || !rank) {
                return Response.json({ error: 'Couldn\'t update rank — please refresh and try again.' }, { status: 400 });
            }
            if (rank !== 'officer' && rank !== 'member') {
                return Response.json({ error: 'Invalid rank.' }, { status: 400 });
            }
            // Only the leader can promote/demote officers.
            if (!(await isCallerLeader(base44, walletAddress, squadId))) {
                return Response.json({ error: 'Only the squad leader can change member ranks.' }, { status: 403 });
            }

            let target;
            try { target = await base44.asServiceRole.entities.SquadMember.get(targetMemberId); } catch {}
            if (!target || target.squad_id !== squadId) {
                return Response.json({ error: 'Target is not a member of this squad.' }, { status: 400 });
            }
            if (target.role === 'leader') {
                return Response.json({ error: 'Use "transfer leadership" to change the leader.' }, { status: 400 });
            }
            await base44.asServiceRole.entities.SquadMember.update(targetMemberId, { role: rank });
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

            // Award daily squad XP — ONCE per day, on the first member's daily claim.
            // Gives squads a steady drip of progression between weekly resets.
            let dailyXpAwarded = 0;
            if (!isWeekly && squad.last_daily_xp_award_date !== periodId) {
                dailyXpAwarded = getDailyXpForLevel(squad.level || 1);
                const newXp = (squad.xp || 0) + dailyXpAwarded;
                const newLevel = computeSquadLevel(newXp);
                await base44.asServiceRole.entities.Squad.update(squadId, {
                    xp: newXp,
                    level: newLevel,
                    last_daily_xp_award_date: periodId,
                });
            }

            return Response.json({
                success: true,
                reward: { gold: tier.gold, fragments: tier.fragments },
                saveData: updatedTotals,
                member: { ...member, [lastClaimedField]: periodId },
                dailyXpAwarded,
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

        // ----- Daily Goal (leader-set squad-wide goal that broadcasts a banner) -----

        if (action === 'setDailyGoal') {
            const { squadId, goalType, target, label, durationHours } = body;
            if (!squadId || !label) {
                return Response.json({ error: 'Couldn\'t set the goal — please refresh and try again.' }, { status: 400 });
            }
            // Only the squad leader can set a daily goal.
            if (!(await isCallerLeader(base44, walletAddress, squadId))) {
                return Response.json({ error: 'Only the squad leader can set a daily goal.' }, { status: 403 });
            }
            const safeType = (goalType === 'custom') ? 'custom' : 'kills';
            const safeTarget = safeType === 'kills' ? Math.max(1, Math.min(100000, parseInt(target, 10) || 100)) : 0;
            const hours = Math.max(1, Math.min(48, parseInt(durationHours, 10) || 24));
            const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

            // Deactivate any previous active goal for this squad before creating the new one.
            const existing = await base44.asServiceRole.entities.SquadDailyGoal.filter({ squad_id: squadId, is_active: true });
            for (const g of existing) {
                try { await base44.asServiceRole.entities.SquadDailyGoal.update(g.id, { is_active: false }); } catch {}
            }

            const goal = await base44.asServiceRole.entities.SquadDailyGoal.create({
                squad_id: squadId,
                goal_type: safeType,
                target: safeTarget,
                label: String(label).substring(0, 120),
                set_by_wallet: walletAddress,
                set_by_name: authoritativeName,
                expires_at: expiresAt,
                is_active: true,
            });

            // Drop a SYSTEM message into squad chat so members see it immediately.
            try {
                await base44.asServiceRole.entities.SquadMessage.create({
                    squad_id: squadId,
                    wallet_address: 'system',
                    player_name: 'SYSTEM',
                    content: `🎯 Daily goal set by ${authoritativeName}: ${goal.label}`,
                });
            } catch {}

            return Response.json({ success: true, goal });
        }

        if (action === 'clearDailyGoal') {
            const { squadId } = body;
            if (!squadId) return Response.json({ error: 'Couldn\'t clear the goal — please refresh and try again.' }, { status: 400 });
            if (!(await isCallerLeader(base44, walletAddress, squadId))) {
                return Response.json({ error: 'Only the squad leader can clear the daily goal.' }, { status: 403 });
            }
            const active = await base44.asServiceRole.entities.SquadDailyGoal.filter({ squad_id: squadId, is_active: true });
            for (const g of active) {
                try { await base44.asServiceRole.entities.SquadDailyGoal.update(g.id, { is_active: false }); } catch {}
            }
            return Response.json({ success: true });
        }

        if (action === 'getDailyGoal') {
            const { squadId } = body;
            if (!squadId) return Response.json({ goal: null });
            const active = await base44.asServiceRole.entities.SquadDailyGoal.filter({ squad_id: squadId, is_active: true }, '-created_date', 5);
            // Auto-expire any goal past its deadline (cheap inline cleanup).
            const now = Date.now();
            let live = null;
            for (const g of active) {
                const exp = g.expires_at ? new Date(g.expires_at).getTime() : 0;
                if (exp && exp < now) {
                    try { await base44.asServiceRole.entities.SquadDailyGoal.update(g.id, { is_active: false }); } catch {}
                } else if (!live) {
                    live = g;
                }
            }
            return Response.json({ goal: live });
        }

        // ----- Member Activity (leader dashboard contribution feed) -----

        if (action === 'getMemberActivity') {
            const { squadId } = body;
            if (!squadId) return Response.json({ activity: [], members: [] });
            // Verify caller is in this squad (any member can read; leader UI gates the page).
            const memberRecords = await base44.asServiceRole.entities.SquadMember.filter({ squad_id: squadId });
            const isInSquad = memberRecords.some(m => m.wallet_address?.toLowerCase() === walletAddress.toLowerCase());
            if (!isInSquad) {
                return Response.json({ error: 'You\'re not a member of this squad.' }, { status: 403 });
            }

            // Recent runs by every squad member in the past 7 days.
            const wallets = memberRecords.map(m => m.wallet_address).filter(Boolean);
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const allRuns = [];
            for (const w of wallets) {
                try {
                    const runs = await base44.asServiceRole.entities.RunScore.filter({ wallet_address: w }, '-created_date', 20);
                    for (const r of runs) {
                        const ts = new Date(r.created_date).getTime();
                        if (ts >= sevenDaysAgo) allRuns.push(r);
                    }
                } catch {}
            }
            allRuns.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            const activity = allRuns.slice(0, 50).map(r => ({
                id: r.id,
                wallet_address: r.wallet_address,
                player_name: r.player_name,
                kills: r.kills || 0,
                score: r.score || 0,
                level: r.level || 1,
                time_survived: r.time_survived || 0,
                character_id: r.character_id,
                arena_id: r.arena_id,
                created_date: r.created_date,
            }));

            // Per-member summary: total kills + last run timestamp (used for kick-inactive UI).
            const summaryByWallet = {};
            for (const m of memberRecords) {
                const w = (m.wallet_address || '').toLowerCase();
                summaryByWallet[w] = {
                    member_id: m.id,
                    wallet_address: m.wallet_address,
                    player_name: m.player_name,
                    role: m.role,
                    runs_7d: 0,
                    kills_7d: 0,
                    last_run_at: null,
                };
            }
            for (const r of allRuns) {
                const w = (r.wallet_address || '').toLowerCase();
                const s = summaryByWallet[w];
                if (!s) continue;
                s.runs_7d += 1;
                s.kills_7d += (r.kills || 0);
                const ts = new Date(r.created_date).getTime();
                if (!s.last_run_at || ts > new Date(s.last_run_at).getTime()) s.last_run_at = r.created_date;
            }
            const members = Object.values(summaryByWallet);

            return Response.json({ activity, members });
        }

        return Response.json({ error: 'Couldn\'t process this request — please refresh and try again.' }, { status: 400 });
    } catch (error) {
        console.error('[squadActions]', error.message);
        return Response.json({ error: 'Something went wrong with your squad. Please try again.' }, { status: 500 });
    }
});