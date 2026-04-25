import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Decode a JWT payload locally (no signature verification — we trust the wallet
// the client sent and only use the JWT to cross-check it). This avoids hitting
// /v1/oauth/user on every save, which was causing rate-limit pressure.
function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { walletAddress: clientWallet, saveData, accessToken } = await req.json();

        if (!clientWallet || !saveData || !accessToken) {
            return Response.json({ error: 'walletAddress, saveData, and accessToken required' }, { status: 400 });
        }

        // Cross-check the client-supplied wallet against the JWT payload.
        // If the JWT can't be decoded, fall back to clientWallet (best-effort save).
        const payload = decodeJwtPayload(accessToken);
        const jwtWallet = payload?.walletAddress?.toLowerCase();
        const wallet = (jwtWallet || clientWallet).toLowerCase();

        if (jwtWallet && jwtWallet !== clientWallet.toLowerCase()) {
            return Response.json({ error: 'Wallet mismatch' }, { status: 401 });
        }

        // Ensure saveData has required fields
        if (!saveData.pilotName) {
            saveData.pilotName = `Pilot_${wallet.slice(-6).toUpperCase()}`;
        }

        // Save via Base44 SDK (reliable)
        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: wallet });

        let saveId;
        if (existing.length > 0) {
            // Deep merge to preserve all existing data + nested upgrade objects
            const existingData = typeof existing[0].save_data === 'string' ? JSON.parse(existing[0].save_data) : existing[0].save_data;
            const merged = { ...existingData, ...saveData }; // Start with existing, then apply incoming

            // Deep merge upgrade objects to prevent loss of partial data
            const upgradeKeys = ['permanentUpgrades', 'weeklyUpgrades', 'seasonalUpgrades', 'permanentWeaponUpgrades', 'weeklyWeaponUpgrades', 'seasonalWeaponUpgrades', 'permanentTalents', 'weeklyTalents', 'seasonalTalents'];
            upgradeKeys.forEach(key => {
                if (existingData[key] && saveData[key]) {
                    // Both exist: merge them (incoming takes precedence, but preserve any existing keys)
                    merged[key] = { ...existingData[key], ...saveData[key] };
                } else if (existingData[key] && (saveData[key] === undefined || saveData[key] === null)) {
                    // Preserve existing if incoming is missing
                    merged[key] = existingData[key];
                }
            });
            
            await base44.asServiceRole.entities.PlayerSave.update(existing[0].id, {
                wallet_address: wallet,
                save_data: merged,
                updated_at: Date.now()
            });
            saveId = existing[0].id;
        } else {
            const result = await base44.asServiceRole.entities.PlayerSave.create({
                wallet_address: wallet,
                save_data: saveData,
                updated_at: Date.now()
            });
            saveId = result.id;
        }

        console.log('[syncSave] Saved for wallet:', wallet, 'ID:', saveId);
        return Response.json({ success: true, saveId });
    } catch (error) {
        console.error('[syncSave]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});