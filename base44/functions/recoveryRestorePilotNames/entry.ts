import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const results = { restored: 0, wiped: [], errors: [] };

        // Find all PlayerSave records with missing/empty pilotName
        const allSaves = await base44.asServiceRole.entities.PlayerSave.list('-created_date', 5000);
        const wipedWallets = allSaves.filter(s => !s.save_data?.pilotName || s.save_data.pilotName === '');

        if (wipedWallets.length === 0) {
            return Response.json({ success: true, message: 'No wiped names found', restored: 0 });
        }

        // Try to restore from RunScore or SquadMember
        const allRunScores = await base44.asServiceRole.entities.RunScore.list('-created_date', 5000);
        const allMembers = await base44.asServiceRole.entities.SquadMember.list('-created_date', 5000);

        for (const save of wipedWallets) {
            const wallet = save.wallet_address;
            let restoredName = null;

            // Try RunScore first
            const score = allRunScores.find(s => s.wallet_address === wallet && s.player_name);
            if (score) {
                restoredName = score.player_name;
            }

            // Fallback to SquadMember
            if (!restoredName) {
                const member = allMembers.find(m => m.wallet_address === wallet && m.player_name);
                if (member) {
                    restoredName = member.player_name;
                }
            }

            // If found, restore
            if (restoredName) {
                try {
                    const updated = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;
                    updated.pilotName = restoredName;
                    await base44.asServiceRole.entities.PlayerSave.update(save.id, {
                        save_data: updated
                    });
                    results.restored++;
                } catch (e) {
                    results.errors.push({ wallet, error: e.message });
                }
            } else {
                results.wiped.push(wallet);
            }
        }

        console.log('[recoveryRestorePilotNames]', JSON.stringify(results));
        return Response.json({ success: true, ...results });
    } catch (error) {
        console.error('[recoveryRestorePilotNames]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});