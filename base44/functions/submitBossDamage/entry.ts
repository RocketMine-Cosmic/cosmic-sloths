import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { damage, week_id } = body;
        
        const bossRecords = await base44.asServiceRole.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) {
            return Response.json({ error: 'No boss active' }, { status: 404 });
        }
        
        const boss = bossRecords[0];
        if (boss.is_defeated) {
            return Response.json({ status: 'already_defeated', boss });
        }
        
        const newHp = Math.max(0, boss.current_hp - damage);
        const isDefeated = newHp === 0;
        
        await base44.asServiceRole.entities.GlobalBoss.update(boss.id, {
            current_hp: newHp,
            is_defeated: isDefeated
        });
        
        const existingContributions = await base44.asServiceRole.entities.GlobalBossContribution.filter({ week_id, user_id: user.id });
        if (existingContributions.length > 0) {
            const cont = existingContributions[0];
            await base44.asServiceRole.entities.GlobalBossContribution.update(cont.id, {
                damage: cont.damage + damage,
                player_name: user.player_name || user.data?.player_name || user.full_name
            });
        } else {
            await base44.asServiceRole.entities.GlobalBossContribution.create({
                week_id,
                user_id: user.id,
                player_name: user.player_name || user.data?.player_name || user.full_name,
                damage,
                claimed: false
            });
        }
        
        return Response.json({ status: 'success', boss: { ...boss, current_hp: newHp, is_defeated: isDefeated } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});