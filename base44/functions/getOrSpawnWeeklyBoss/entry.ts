import { createClient } from 'npm:@base44/sdk@0.8.25';

const db = createClient({ serviceRole: true, appId: Deno.env.get('BASE44_APP_ID') });

function getCurrentWeekId() {
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${now.getUTCFullYear()}-W${String(isoWeek).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
    try {
        const week_id = getCurrentWeekId();

        const bossRecords = await db.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length > 0) {
            return Response.json({ boss: bossRecords[0] });
        }

        let charCodeSum = 0;
        for (let i = 0; i < week_id.length; i++) charCodeSum += week_id.charCodeAt(i);

        const bossNames = ["The World Eater", "Cosmic Leviathan", "Star Devourer", "Void Sovereign"];
        const bossName = bossNames[charCodeSum % bossNames.length];
        const bossHp = 50000;

        const newBoss = await db.entities.GlobalBoss.create({
            week_id,
            boss_id: 'world_boss_' + (charCodeSum % 4),
            name: bossName,
            max_hp: bossHp,
            current_hp: bossHp,
            reward_type: 'gold',
            reward_id: '25000',
            is_defeated: false,
            level: 1
        });

        return Response.json({ boss: newBoss });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});