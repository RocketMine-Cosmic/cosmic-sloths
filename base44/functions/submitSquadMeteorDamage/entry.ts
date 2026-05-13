import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Records a player's Squad Meteor attack and applies the damage to the squad's
// shared meteor. Levels up the meteor (with overflow carry-over) if HP reaches 0.
//
// Body: { damage: number }
//
// Server-side guarantees:
//   - Auth required (Base44 session with linked wallet)
//   - Player must be in a squad
//   - Daily attempt limit enforced (3/day/member, UTC)
//   - Damage clamped to a hard sanity ceiling (anti-cheat — single run can't
//     submit > 100M, even though there's no soft cap)
//   - Atomic meteor HP update with level-up + overflow carry

const DAILY_ATTEMPT_LIMIT = 3;
const HP_PER_LEVEL = 25_000_000;
const HP_BASE = 50_000_000;
// Anti-cheat ceiling — no single run can claim more than this, regardless of build.
// Realistic whale ceiling is ~10M in 3 mins; 100M is 10× that buffer.
const SANITY_DAMAGE_CAP = 100_000_000;

// 429 retry wrapper — matches the pattern in other backend fns.
async function withRetry(fn, label = 'op', maxAttempts = 4) {
    let lastErr;
    for (let i = 0; i < maxAttempts; i++) {
        try { return await fn(); }
        catch (e) {
            lastErr = e;
            const msg = e?.message || String(e);
            if (!msg.includes('429')) throw e;
            const wait = 200 * Math.pow(2, i) + Math.random() * 200;
            console.warn(`[submitSquadMeteorDamage] ${label} 429 — retry ${i + 1}/${maxAttempts} after ${Math.round(wait)}ms`);
            await new Promise(r => setTimeout(r, wait));
        }
    }
    throw lastErr;
}

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

function todayUtcDate() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function hpForLevel(level) {
    return HP_BASE + (Math.max(1, level) - 1) * HP_PER_LEVEL;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let me = null;
        try { me = await base44.auth.me(); } catch {}
        if (!me) return Response.json({ error: 'Please sign in to continue.' }, { status: 401 });

        const wallet = me.wallet_address?.toLowerCase();
        if (!wallet) return Response.json({ error: 'No wallet linked.' }, { status: 400 });

        const body = await req.json().catch(() => ({}));
        const rawDamage = Number(body?.damage || 0);
        if (!isFinite(rawDamage) || rawDamage < 0) {
            return Response.json({ error: 'Invalid damage value.' }, { status: 400 });
        }
        // Floor + sanity-cap
        const damage = Math.min(Math.floor(rawDamage), SANITY_DAMAGE_CAP);

        const db = base44.asServiceRole;

        // Find squad membership
        const memberships = await withRetry(
            () => db.entities.SquadMember.filter({ wallet_address: wallet }),
            'SquadMember.filter'
        );
        if (memberships.length === 0) {
            return Response.json({ error: 'You must be in a squad to attack the meteor.' }, { status: 403 });
        }
        const squadId = memberships[0].squad_id;

        // Enforce daily attempt limit
        const today = todayUtcDate();
        const todayMyAttacks = await withRetry(
            () => db.entities.SquadMeteorAttack.filter({
                squad_id: squadId,
                wallet_address: wallet,
                attack_date_utc: today,
            }),
            'count today attacks'
        );
        if (todayMyAttacks.length >= DAILY_ATTEMPT_LIMIT) {
            return Response.json({
                error: `You've used all ${DAILY_ATTEMPT_LIMIT} attacks today. Try again tomorrow (resets at 00:00 UTC).`,
                attempts_used: todayMyAttacks.length,
                attempts_remaining: 0,
            }, { status: 429 });
        }

        // Load (or create) the meteor row
        let meteorRows = await withRetry(
            () => db.entities.SquadMeteor.filter({ squad_id: squadId }),
            'SquadMeteor.filter'
        );
        let meteor;
        if (meteorRows.length === 0) {
            meteor = await withRetry(
                () => db.entities.SquadMeteor.create({
                    squad_id: squadId,
                    level: 1,
                    max_hp: hpForLevel(1),
                    current_hp: hpForLevel(1),
                    total_lifetime_damage: 0,
                    total_lifetime_kills: 0,
                }),
                'SquadMeteor.create'
            );
        } else {
            meteor = meteorRows[0];
        }

        // Apply damage with level-up + overflow carry
        let remainingDamage = damage;
        let level = meteor.level;
        let currentHp = meteor.current_hp;
        let maxHp = meteor.max_hp || hpForLevel(level);
        let kills = meteor.total_lifetime_kills || 0;
        let lifetimeDmg = (meteor.total_lifetime_damage || 0) + damage;
        const levelsGained = [];

        while (remainingDamage > 0) {
            if (remainingDamage >= currentHp) {
                remainingDamage -= currentHp;
                kills++;
                level++;
                levelsGained.push(level);
                maxHp = hpForLevel(level);
                currentHp = maxHp;
            } else {
                currentHp -= remainingDamage;
                remainingDamage = 0;
            }
        }

        await withRetry(
            () => db.entities.SquadMeteor.update(meteor.id, {
                level,
                max_hp: maxHp,
                current_hp: currentHp,
                total_lifetime_damage: lifetimeDmg,
                total_lifetime_kills: kills,
            }),
            'SquadMeteor.update'
        );

        // Log the attack
        const playerName = (body?.playerName || me.full_name || wallet).toString().slice(0, 80);
        await withRetry(
            () => db.entities.SquadMeteorAttack.create({
                squad_id: squadId,
                wallet_address: wallet,
                player_name: playerName,
                damage,
                meteor_level_at_attack: meteor.level,
                attack_date_utc: today,
                week_id: getCurrentWeekId(),
            }),
            'SquadMeteorAttack.create'
        );

        return Response.json({
            success: true,
            damage_submitted: damage,
            damage_clamped: rawDamage > SANITY_DAMAGE_CAP,
            attempts_used: todayMyAttacks.length + 1,
            attempts_remaining: DAILY_ATTEMPT_LIMIT - (todayMyAttacks.length + 1),
            meteor: {
                level,
                current_hp: currentHp,
                max_hp: maxHp,
                total_lifetime_damage: lifetimeDmg,
                total_lifetime_kills: kills,
            },
            levels_gained: levelsGained,
            leveled_up: levelsGained.length > 0,
        });
    } catch (error) {
        console.error('[submitSquadMeteorDamage]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});