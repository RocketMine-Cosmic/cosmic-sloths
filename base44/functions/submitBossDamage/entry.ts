import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole;

        const body = await req.json();
        const { damage, week_id, walletAddress, playerName, userId } = body;

        if (!damage || !week_id) return Response.json({ error: 'Missing damage or week_id' }, { status: 400 });

        const bossRecords = await db.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) {
            return Response.json({ error: 'No boss active' }, { status: 404 });
        }

        const boss = bossRecords[0];

        let newHp = Math.max(0, boss.current_hp - damage);

        let updates = { current_hp: newHp };

        if (newHp === 0) {
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

        const displayName = playerName || walletAddress || 'Unknown';
        const eventType = (boss.current_hp - damage <= 0) ? 'kill' : 'damage';
        const eventMessage = (boss.current_hp - damage <= 0)
            ? `${displayName} defeated the Level ${boss.level || 1} Boss!`
            : `${displayName} dealt ${damage.toLocaleString()} damage!`;

        await db.entities.GlobalBossEvent.create({
            week_id,
            player_name: displayName,
            event_type: eventType,
            damage,
            level: boss.level || 1,
            message: eventMessage
        });

        // Use walletAddress or userId as the unique contributor key
        const contribUserId = userId || walletAddress;
        if (contribUserId) {
            const existingContributions = await db.entities.GlobalBossContribution.filter({ week_id, user_id: contribUserId });
            if (existingContributions.length > 0) {
                const cont = existingContributions[0];
                await db.entities.GlobalBossContribution.update(cont.id, {
                    damage: cont.damage + damage,
                    player_name: displayName
                });
            } else {
                await db.entities.GlobalBossContribution.create({
                    week_id,
                    user_id: contribUserId,
                    player_name: displayName,
                    damage,
                    claimed: false
                });
            }
        }

        return Response.json({ status: 'success', boss: { ...boss, current_hp: newHp } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});