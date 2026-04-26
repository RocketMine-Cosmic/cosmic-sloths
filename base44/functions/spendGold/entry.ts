import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Server-authoritative gold spending. Atomically deducts gold from cloud save
// and applies a grant (stat / weapon / talent / cosmetic).
//
// Cost tables MUST mirror UPGRADE_TYPES in pages/Upgrades.jsx.

const GOLD_COSTS = {
    stat: {
        permanent: [1000, 2000, 4000, 8000, 16000],
        weekly:    [500,  1000, 2000, 4000, 8000],
        seasonal:  [1500, 3000, 6000, 12000, 24000],
    },
    weapon: {
        permanent: [1000, 2000, 4000, 8000, 16000],
        weekly:    [500,  1000, 2000, 4000, 8000],
        seasonal:  [1500, 3000, 6000, 12000, 24000],
    },
    // talent cost = goldCosts[(tier-1)*2]
    talent: {
        permanent: [1000, 2000, 4000, 8000, 16000],
        weekly:    [500,  1000, 2000, 4000, 8000],
        seasonal:  [1500, 3000, 6000, 12000, 24000],
    },
};

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

// Compute server-authoritative gold cost for the requested grant.
function computeCost(grantInfo) {
    const { type } = grantInfo || {};
    if (type === 'stat') {
        const { tier, level } = grantInfo;
        const costs = GOLD_COSTS.stat[tier];
        if (!costs || !level || level < 1 || level > costs.length) throw new Error(`Bad stat cost: tier=${tier} level=${level}`);
        return costs[level - 1];
    }
    if (type === 'weapon') {
        const { tier, level } = grantInfo;
        const costs = GOLD_COSTS.weapon[tier];
        if (!costs || !level || level < 1 || level > costs.length) throw new Error(`Bad weapon cost: tier=${tier} level=${level}`);
        return costs[level - 1];
    }
    if (type === 'talent') {
        const { tier, talentTier } = grantInfo;
        const costs = GOLD_COSTS.talent[tier];
        if (!costs || !talentTier) throw new Error(`Bad talent cost: tier=${tier} talentTier=${talentTier}`);
        const idx = Math.min((talentTier - 1) * 2, costs.length - 1);
        return costs[idx];
    }
    if (type === 'cosmetic') {
        const { goldCost } = grantInfo;
        if (typeof goldCost !== 'number' || goldCost < 0) throw new Error(`Bad cosmetic cost: ${goldCost}`);
        return goldCost;
    }
    throw new Error(`Unknown grant type: ${type}`);
}

// Validates the grant against current cloud save and returns updated save_data.
// Throws on mismatch (already unlocked / wrong level / unknown ids).
function applyGrant(save, grantInfo, periodIds) {
    const s = { ...save };
    const { type } = grantInfo;

    switch (type) {
        case 'stat': {
            const { tier, stat, level } = grantInfo;
            const key = tier === 'permanent' ? 'permanentUpgrades'
                      : tier === 'weekly' ? 'weeklyUpgrades' : 'seasonalUpgrades';
            const obj = { ...(s[key] || {}) };
            const currentLvl = Number(obj[stat] || 0);
            if (level !== currentLvl + 1) throw new Error(`Stat level mismatch: requested ${level} but cloud at ${currentLvl}`);
            obj[stat] = level;
            if (tier === 'weekly') obj.weekId = periodIds.week_id;
            if (tier === 'seasonal') obj.seasonId = periodIds.season_id;
            s[key] = obj;
            break;
        }
        case 'weapon': {
            const { tier, weaponId, stat, level } = grantInfo;
            const key = tier === 'permanent' ? 'permanentWeaponUpgrades'
                      : tier === 'weekly' ? 'weeklyWeaponUpgrades' : 'seasonalWeaponUpgrades';
            const obj = { ...(s[key] || {}) };
            const weaponObj = { ...(obj[weaponId] || {}) };
            const currentLvl = Number(weaponObj[stat] || 0);
            if (level !== currentLvl + 1) throw new Error(`Weapon level mismatch: requested ${level} but cloud at ${currentLvl}`);
            weaponObj[stat] = level;
            obj[weaponId] = weaponObj;
            if (tier === 'weekly') obj.weekId = periodIds.week_id;
            if (tier === 'seasonal') obj.seasonId = periodIds.season_id;
            s[key] = obj;
            break;
        }
        case 'talent': {
            const { tier, charId, talentId } = grantInfo;
            const key = tier === 'permanent' ? 'permanentTalents'
                      : tier === 'weekly' ? 'weeklyTalents' : 'seasonalTalents';
            const obj = { ...(s[key] || {}) };
            const charArr = Array.isArray(obj[charId]) ? [...obj[charId]] : [];
            if (charArr.includes(talentId)) throw new Error('Talent already unlocked');
            charArr.push(talentId);
            obj[charId] = charArr;
            if (tier === 'weekly') obj.weekId = periodIds.week_id;
            if (tier === 'seasonal') obj.seasonId = periodIds.season_id;
            s[key] = obj;
            break;
        }
        case 'cosmetic': {
            const { slot, cosmeticId, charId } = grantInfo;
            if (slot === 'trail') {
                const arr = Array.isArray(s.unlockedCosmetics) ? [...s.unlockedCosmetics] : [];
                if (!arr.includes(cosmeticId)) arr.push(cosmeticId);
                s.unlockedCosmetics = arr;
                s.cosmetics = { ...(s.cosmetics || {}), trail: cosmeticId };
            } else if (slot === 'kill') {
                const arr = Array.isArray(s.unlockedKillEffects) ? [...s.unlockedKillEffects] : [];
                if (!arr.includes(cosmeticId)) arr.push(cosmeticId);
                s.unlockedKillEffects = arr;
                s.cosmetics = { ...(s.cosmetics || {}), killEffect: cosmeticId };
            } else if (slot === 'skin') {
                const arr = Array.isArray(s.unlockedSkins) ? [...s.unlockedSkins] : [];
                if (!arr.includes(cosmeticId)) arr.push(cosmeticId);
                s.unlockedSkins = arr;
                const skins = { ...((s.cosmetics || {}).skins || {}) };
                if (charId) skins[charId] = cosmeticId;
                s.cosmetics = { ...(s.cosmetics || {}), skins };
            } else {
                throw new Error(`Unknown cosmetic slot: ${slot}`);
            }
            break;
        }
        default:
            throw new Error(`Unknown grant type: ${type}`);
    }
    s.updated_at = Date.now();
    return s;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'No wallet linked to user' }, { status: 400 });

        const { grantInfo } = await req.json();
        if (!grantInfo || !grantInfo.type) {
            return Response.json({ error: 'grantInfo required' }, { status: 400 });
        }

        // Compute cost server-side
        let cost;
        try {
            cost = computeCost(grantInfo);
        } catch (e) {
            return Response.json({ error: `Cost computation failed: ${e.message}` }, { status: 400 });
        }

        // Load current save
        const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress.toLowerCase() });
        if (records.length === 0) {
            return Response.json({ error: 'PlayerSave not found — sync your save first' }, { status: 400 });
        }
        const saveRecord = records[0];
        const saveData = typeof saveRecord.save_data === 'string'
            ? JSON.parse(saveRecord.save_data)
            : saveRecord.save_data;

        // Verify funds
        const currentGold = Number(saveData.gold || 0);
        if (currentGold < cost) {
            return Response.json({ error: `Insufficient gold: need ${cost} have ${currentGold}` }, { status: 400 });
        }

        // Apply grant
        const periodIds = getCurrentPeriodIds();
        let updatedSave;
        try {
            updatedSave = applyGrant(saveData, grantInfo, periodIds);
        } catch (e) {
            return Response.json({ error: `Grant validation failed: ${e.message}` }, { status: 400 });
        }

        // Deduct gold
        updatedSave.gold = currentGold - cost;

        // Persist
        await base44.asServiceRole.entities.PlayerSave.update(saveRecord.id, {
            save_data: updatedSave,
            updated_at: Date.now()
        });

        console.log(`[spendGold] ${walletAddress} spent ${cost} gold on ${grantInfo.type}`);
        return Response.json({ success: true, cost, saveData: updatedSave });
    } catch (error) {
        console.error('[spendGold]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});