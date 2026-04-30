import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.

function getCurrentPeriodIds() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;
    const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
    const season_id = `${year}-S${seasonNum}`;
    return { week_id, season_id };
}

const MAX_DAMAGE_PER_SUBMISSION = 1_000_000;
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
        const displayName = playerName || me.full_name || walletAddress;

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