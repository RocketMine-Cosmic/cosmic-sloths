import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Canonical week_id from server clock — never trust client
function getCurrentWeekId() {
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${now.getUTCFullYear()}-W${String(isoWeek).padStart(2, '0')}`;
}

// Clamp damage to a sane per-call maximum to prevent inflated contributions
const MAX_DAMAGE_PER_SUBMISSION = 1_000_000;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Require authenticated session — identifies the real caller
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const db = base44.asServiceRole;

        const body = await req.json();
        const { damage, playerName } = body;

        if (typeof damage !== 'number' || damage <= 0) {
            return Response.json({ error: 'Invalid damage value' }, { status: 400 });
        }

        // Clamp damage — prevent a single call from contributing absurd numbers
        const clampedDamage = Math.min(damage, MAX_DAMAGE_PER_SUBMISSION);

        // Week is always server-computed
        const week_id = getCurrentWeekId();

        const bossRecords = await db.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) {
            return Response.json({ error: 'No boss active' }, { status: 404 });
        }

        const boss = bossRecords[0];
        if (boss.is_defeated) {
            return Response.json({ error: 'Boss already defeated' }, { status: 400 });
        }

        let newHp = Math.max(0, boss.current_hp - clampedDamage);
        let updates = { current_hp: newHp };

        const killed = newHp === 0;
        if (killed) {
            const nextLevel = (boss.level || 1) + 1;
            const nextMaxHp = Math.floor(boss.max_hp * 1.5);
            updates = {
                level: nextLevel,
                max_hp: nextMaxHp,
                current_hp: nextMaxHp,
                is_defeated: false
            };
            newHp = nextMaxHp;
        }

        await db.entities.GlobalBoss.update(boss.id, updates);

        const displayName = playerName || user.full_name || user.email || 'Unknown';
        const eventType = killed ? 'kill' : 'damage';
        const eventMessage = killed
            ? `${displayName} defeated the Level ${boss.level || 1} Boss!`
            : `${displayName} dealt ${Math.floor(clampedDamage).toLocaleString()} damage!`;

        await db.entities.GlobalBossEvent.create({
            week_id,
            player_name: displayName,
            event_type: eventType,
            damage: clampedDamage,
            level: boss.level || 1,
            message: eventMessage
        });

        // Identity is always from the authenticated session, never from the request body
        const contribUserId = user.id;
        const existingContributions = await db.entities.GlobalBossContribution.filter({ week_id, user_id: contribUserId });
        if (existingContributions.length > 0) {
            const cont = existingContributions[0];
            await db.entities.GlobalBossContribution.update(cont.id, {
                damage: cont.damage + clampedDamage,
                player_name: displayName
            });
        } else {
            await db.entities.GlobalBossContribution.create({
                week_id,
                user_id: contribUserId,
                player_name: displayName,
                damage: clampedDamage,
                claimed: false
            });
        }

        return Response.json({ status: 'success', boss: { ...boss, current_hp: newHp } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});