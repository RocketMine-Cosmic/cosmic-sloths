import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Syncs the player save for the currently-authenticated Base44 user,
// using the wallet_address linked on their User record. No OmenX token needed —
// Base44 auth is the persistent layer; OmenX wallet is just the data key.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const wallet = me.wallet_address;
        if (!wallet) {
            return Response.json({ error: 'No wallet linked to user' }, { status: 400 });
        }

        const { saveData } = await req.json();
        if (!saveData) return Response.json({ error: 'saveData required' }, { status: 400 });

        const walletLower = wallet.toLowerCase();

        // Ensure pilotName fallback
        if (!saveData.pilotName) {
            saveData.pilotName = `Pilot_${walletLower.slice(-6).toUpperCase()}`;
        }

        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower });

        let saveId;
        if (existing.length > 0) {
            // Deep merge to preserve all existing data + nested upgrade objects
            const existingData = typeof existing[0].save_data === 'string'
                ? JSON.parse(existing[0].save_data)
                : existing[0].save_data;
            const merged = { ...existingData, ...saveData };

            const upgradeKeys = [
                'permanentUpgrades', 'weeklyUpgrades', 'seasonalUpgrades',
                'permanentWeaponUpgrades', 'weeklyWeaponUpgrades', 'seasonalWeaponUpgrades',
                'permanentTalents', 'weeklyTalents', 'seasonalTalents'
            ];
            upgradeKeys.forEach(key => {
                if (existingData[key] && saveData[key]) {
                    merged[key] = { ...existingData[key], ...saveData[key] };
                } else if (existingData[key] && (saveData[key] === undefined || saveData[key] === null)) {
                    merged[key] = existingData[key];
                }
            });

            await base44.asServiceRole.entities.PlayerSave.update(existing[0].id, {
                wallet_address: walletLower,
                save_data: merged,
                updated_at: Date.now()
            });
            saveId = existing[0].id;
        } else {
            const result = await base44.asServiceRole.entities.PlayerSave.create({
                wallet_address: walletLower,
                save_data: saveData,
                updated_at: Date.now()
            });
            saveId = result.id;
        }

        console.log('[syncSave] Saved for wallet:', walletLower, 'ID:', saveId);
        return Response.json({ success: true, saveId });
    } catch (error) {
        console.error('[syncSave]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});