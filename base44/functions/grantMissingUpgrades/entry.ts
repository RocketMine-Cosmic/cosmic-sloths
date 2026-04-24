import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { walletAddress, upgradeType, upgrades } = await req.json();
        if (!walletAddress || !upgradeType || !upgrades) {
            return Response.json({ error: 'walletAddress, upgradeType, and upgrades required' }, { status: 400 });
        }

        // Fetch the player's save
        const playerSaves = await base44.asServiceRole.entities.PlayerSave.filter({
            wallet_address: walletAddress
        });

        if (playerSaves.length === 0) {
            return Response.json({ error: 'Player save not found' }, { status: 404 });
        }

        const save = playerSaves[0];
        let saveData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;

        // Grant upgrades (preserves existing, adds new)
        if (upgradeType === 'stat') {
            const { category, stat, level } = upgrades;
            if (!saveData[category]) saveData[category] = {};
            saveData[category][stat] = Math.max(saveData[category][stat] || 0, level);
        } else if (upgradeType === 'weapon') {
            const { category, weaponId, stat, level } = upgrades;
            if (!saveData[category]) saveData[category] = {};
            if (!saveData[category][weaponId]) saveData[category][weaponId] = {};
            saveData[category][weaponId][stat] = Math.max(saveData[category][weaponId][stat] || 0, level);
        } else if (upgradeType === 'talent') {
            const { category, charId, talentId } = upgrades;
            if (!saveData[category]) saveData[category] = {};
            if (!saveData[category][charId]) saveData[category][charId] = [];
            if (!saveData[category][charId].includes(talentId)) {
                saveData[category][charId].push(talentId);
            }
        }

        // Persist
        await base44.asServiceRole.entities.PlayerSave.update(save.id, {
            save_data: saveData,
            updated_at: Date.now()
        });

        console.log(`[grantMissingUpgrades] Granted ${upgradeType} to ${walletAddress.slice(0,6)}...`);
        return Response.json({ success: true, message: `Granted ${upgradeType} upgrade to player` });
    } catch (error) {
        console.error('[grantMissingUpgrades]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});