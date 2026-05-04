import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.

// Proper ISO 8601 (Mon-start, Sun 23:59 UTC end). Old formula rolled over a day early on Sundays.
function getCurrentPeriodIds() {
    const now = new Date();
    const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const isoYear = tmp.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const isoWeek = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
    const week_id = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
    const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
    const season_id = `${isoYear}-S${seasonNum}`;
    return { week_id, season_id };
}

// 2M cap — most legit raid runs land between 200k-1.5M damage. 2M generously
// covers fully-upgraded top-tier players. Old 5M cap was being hit *exactly* by
// multiple players per run (telltale tamper signal — a real run rarely lands on
// a round 5,000,000.0 figure), so they were stacking 3+ capped runs per day to
// blast through high-level bosses. 2M slows that to a more reasonable rate.
const MAX_DAMAGE_PER_SUBMISSION = 2_000_000;
const BOSS_BASE_HP = 50000;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Please sign in to join the raid.' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const { damage, playerName } = await req.json();
        if (typeof damage !== 'number' || damage <= 0) {
            return Response.json({ error: 'Couldn\'t record your damage — please try again.' }, { status: 400 });
        }

        const clampedDamage = Math.min(damage, MAX_DAMAGE_PER_SUBMISSION);
        const { week_id } = getCurrentPeriodIds();

        // Never expose the user's real OAuth name in the public raid feed /
        // Discord. If no pilot name was set, or the supplied name matches their
        // real name, fall back to an anonymous Pilot_XXXXXX handle.
        const anonName = `Pilot_${walletAddress.slice(-6).toUpperCase()}`;
        const realName = (me.full_name || '').trim().toLowerCase();
        const submittedName = (playerName || '').trim();
        const displayName = (!submittedName || (realName && submittedName.toLowerCase() === realName))
            ? anonName
            : submittedName;

        // Look up squad membership so contributions can be aggregated for the squad raid leaderboard
        let squadInfo = { squad_id: '', squad_name: '', squad_tag: '', squad_icon: '' };
        try {
            const memberRecords = await base44.asServiceRole.entities.SquadMember.filter({ wallet_address: walletAddress });
            if (memberRecords.length > 0) {
                const sq = await base44.asServiceRole.entities.Squad.get(memberRecords[0].squad_id);
                if (sq) {
                    squadInfo = {
                        squad_id: sq.id,
                        squad_name: sq.name || '',
                        squad_tag: sq.tag || '',
                        squad_icon: sq.icon || '🛡️',
                    };
                }
            }
        } catch (e) {
            console.log('[submitBossDamage] Could not fetch squad membership:', e.message);
        }

        // Create GlobalBossEvent (live activity feed)
        try {
            await base44.asServiceRole.entities.GlobalBossEvent.create({
                week_id,
                player_name: displayName,
                event_type: 'damage',
                damage: clampedDamage,
                message: `${displayName} dealt ${Math.floor(clampedDamage).toLocaleString()} damage!`
            });
        } catch (e) {
            console.error('[submitBossDamage] Event creation failed:', e.message);
        }

        // Create GlobalBossContribution (per-run contribution log used for reward claims)
        try {
            await base44.asServiceRole.entities.GlobalBossContribution.create({
                week_id,
                user_id: walletAddress,
                player_name: displayName,
                damage: clampedDamage,
                claimed: false,
                ...squadInfo,
            });
        } catch (e) {
            console.error('[submitBossDamage] Contribution failed:', e.message);
        }

        // Update the boss HP. If the boss reaches 0 HP, level it up and refill HP
        // (HP scales with level so each tier is harder than the last).
        let bossUpdate = null;
        try {
            const bossRecords = await base44.asServiceRole.entities.GlobalBoss.filter({ week_id });
            if (bossRecords.length > 0) {
                const boss = bossRecords[0];
                let newHp = (boss.current_hp || 0) - clampedDamage;
                let newLevel = boss.level || 1;
                let newMaxHp = boss.max_hp || BOSS_BASE_HP;
                let leveledUp = false;

                if (newHp <= 0) {
                    // Boss defeated — level up, scale HP, refill.
                    leveledUp = true;
                    newLevel += 1;
                    newMaxHp = Math.floor(BOSS_BASE_HP * Math.pow(2, newLevel - 1));
                    newHp = newMaxHp;

                    // Log a kill event
                    try {
                        await base44.asServiceRole.entities.GlobalBossEvent.create({
                            week_id,
                            player_name: displayName,
                            event_type: 'kill',
                            damage: clampedDamage,
                            level: newLevel - 1,
                            message: `${displayName} dealt the killing blow! Boss reached Lv.${newLevel}!`
                        });
                    } catch (e) {
                        console.error('[submitBossDamage] Kill event failed:', e.message);
                    }
                }

                bossUpdate = await base44.asServiceRole.entities.GlobalBoss.update(boss.id, {
                    current_hp: newHp,
                    max_hp: newMaxHp,
                    level: newLevel,
                });

                if (leveledUp) {
                    console.log('[submitBossDamage] Boss leveled up to', newLevel, 'new HP:', newMaxHp);
                }
            }
        } catch (e) {
            console.error('[submitBossDamage] Boss HP update failed:', e.message);
        }

        console.log('[submitBossDamage] Recorded damage:', clampedDamage, 'for wallet:', walletAddress);
        return Response.json({ success: true, damage: clampedDamage, boss: bossUpdate });
    } catch (error) {
        console.error('[submitBossDamage]', error.message);
        return Response.json({ error: 'Couldn\'t record your raid damage. Please try again.' }, { status: 500 });
    }
});