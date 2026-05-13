import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// Server-authoritative claim — credits gold directly to PlayerSave.gold so the
// reward survives sync (otherwise syncSave blocks the local "gold bump" as suspicious).

// Proper ISO 8601 (Mon-start, Sun 23:59 UTC end). Old formula rolled over a day early on Sundays.
function getCurrentWeekId() {
    const now = new Date();
    const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const isoYear = tmp.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const isoWeek = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
    return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // base44.auth.me() THROWS when there's no auth context — catch it for a clean 401.
        let me = null;
        try { me = await base44.auth.me(); } catch {}
        if (!me) return Response.json({ error: 'Please sign in to claim your reward.' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const { claim_level } = await req.json();
        const levelNum = parseInt(claim_level, 10);
        if (isNaN(levelNum) || levelNum < 1) return Response.json({ error: 'Couldn\'t process this claim — please refresh and try again.' }, { status: 400 });

        const week_id = getCurrentWeekId();

        // Validate the boss is actually past the level the player is claiming —
        // can only claim levels strictly LESS than the boss's current level
        // (matches the client's "isReached = lvl < boss.level" check).
        const bosses = await base44.asServiceRole.entities.GlobalBoss.filter({ week_id });
        if (!bosses || bosses.length === 0) return Response.json({ error: 'No raid running this week.' }, { status: 404 });
        const bossLevel = bosses[0].level || 1;
        if (levelNum >= bossLevel) {
            return Response.json({ error: 'This level hasn\'t been defeated yet.' }, { status: 400 });
        }

        // Find ALL of this player's contribution rows for the week.
        // submitBossDamage creates a new row per run, so a player can have many.
        // We must check claimed_milestones across ALL of them to prevent re-claiming.
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({
            week_id,
            user_id: walletAddress,
        });
        if (!contribs || contribs.length === 0) {
            return Response.json({ error: 'You haven\'t contributed to the raid this week yet.' }, { status: 404 });
        }

        // Already claimed on ANY row → reject
        const alreadyClaimed = contribs.some(c =>
            Array.isArray(c.claimed_milestones) && c.claimed_milestones.includes(levelNum)
        );
        if (alreadyClaimed) {
            return Response.json({ status: 'error', error: 'You\'ve already claimed this reward.' }, { status: 409 });
        }

        // Load PlayerSave so we can credit the gold server-side.
        const walletLower = walletAddress.toLowerCase();
        const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower });
        if (records.length === 0) {
            return Response.json({ error: 'We couldn\'t find your save. Please play a run first to create one.' }, { status: 404 });
        }
        const record = records[0];
        const saveData = typeof record.save_data === 'string' ? JSON.parse(record.save_data) : record.save_data;

        const goldReward = levelNum * 250;

        // Mark claimed on the first row (sufficient for the duplicate check above)
        // and credit gold atomically. Order: mark claimed first; if gold update fails
        // we'd rather lose the gold than allow a double-claim.
        const target = contribs[0];
        const targetClaimed = Array.isArray(target.claimed_milestones) ? target.claimed_milestones : [];
        await base44.asServiceRole.entities.GlobalBossContribution.update(target.id, {
            claimed_milestones: [...targetClaimed, levelNum],
        });

        saveData.gold = (saveData.gold || 0) + goldReward;
        saveData.updated_at = Date.now();
        await base44.asServiceRole.entities.PlayerSave.update(record.id, {
            save_data: saveData,
            updated_at: Date.now(),
        });

        console.log('[claimBossReward] Claimed level', levelNum, '+', goldReward, 'gold for', walletAddress);
        return Response.json({
            status: 'success',
            reward: { type: 'gold', id: goldReward.toString() },
            saveData: { gold: saveData.gold },
        });
    } catch (error) {
        console.error('[claimBossReward]', error.message);
        return Response.json({ error: 'Couldn\'t claim your reward right now. Please try again.' }, { status: 500 });
    }
});