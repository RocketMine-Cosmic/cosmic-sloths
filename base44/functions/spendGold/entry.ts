import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Server-authoritative gold spending. Atomically deducts gold from cloud save
// and applies a grant (stat / weapon / talent / cosmetic).
//
// Cost tables MUST mirror UPGRADE_TYPES in pages/Upgrades.jsx.

// Talent prerequisite map — MUST mirror CHARACTER_TALENTS in game/Constants.js.
// Used to validate tier-2/3 unlocks require their parent tier-1/2 to be owned
// AND that exclusive sibling isn't already owned.
const TALENT_PREREQS = {
    neobyte: { neo_2a: { requires: 'neo_1', excludes: 'neo_2b' }, neo_2b: { requires: 'neo_1', excludes: 'neo_2a' }, neo_3a: { requires: 'neo_2a' }, neo_3b: { requires: 'neo_2b' } },
    pandypaws: { pan_2a: { requires: 'pan_1', excludes: 'pan_2b' }, pan_2b: { requires: 'pan_1', excludes: 'pan_2a' }, pan_3a: { requires: 'pan_2a' }, pan_3b: { requires: 'pan_2b' } },
    novabyte: { nova_2a: { requires: 'nova_1', excludes: 'nova_2b' }, nova_2b: { requires: 'nova_1', excludes: 'nova_2a' }, nova_3a: { requires: 'nova_2a' }, nova_3b: { requires: 'nova_2b' } },
    glitch: { gli_2a: { requires: 'gli_1', excludes: 'gli_2b' }, gli_2b: { requires: 'gli_1', excludes: 'gli_2a' }, gli_3a: { requires: 'gli_2a' }, gli_3b: { requires: 'gli_2b' } },
    holodrift: { holo_2a: { requires: 'holo_1', excludes: 'holo_2b' }, holo_2b: { requires: 'holo_1', excludes: 'holo_2a' }, holo_3a: { requires: 'holo_2a' }, holo_3b: { requires: 'holo_2b' } },
    codebreaker: { code_2a: { requires: 'code_1', excludes: 'code_2b' }, code_2b: { requires: 'code_1', excludes: 'code_2a' }, code_3a: { requires: 'code_2a' }, code_3b: { requires: 'code_2b' } },
    dataphantom: { data_2a: { requires: 'data_1', excludes: 'data_2b' }, data_2b: { requires: 'data_1', excludes: 'data_2a' }, data_3a: { requires: 'data_2a' }, data_3b: { requires: 'data_2b' } },
    neonvortex: { neon_2a: { requires: 'neon_1', excludes: 'neon_2b' }, neon_2b: { requires: 'neon_1', excludes: 'neon_2a' }, neon_3a: { requires: 'neon_2a' }, neon_3b: { requires: 'neon_2b' } },
    synthbeats: { syn_2a: { requires: 'syn_1', excludes: 'syn_2b' }, syn_2b: { requires: 'syn_1', excludes: 'syn_2a' }, syn_3a: { requires: 'syn_2a' }, syn_3b: { requires: 'syn_2b' } },
    skybyte: { sky_2a: { requires: 'sky_1', excludes: 'sky_2b' }, sky_2b: { requires: 'sky_1', excludes: 'sky_2a' }, sky_3a: { requires: 'sky_2a' }, sky_3b: { requires: 'sky_2b' } },
};

// Returns the union of unlocked talent ids for a character across permanent/weekly/seasonal.
function getAllUnlockedTalents(save, charId) {
    const perm = save.permanentTalents?.[charId] || [];
    const week = save.weeklyTalents?.[charId] || [];
    const season = save.seasonalTalents?.[charId] || [];
    return new Set([...perm, ...week, ...season]);
}

function validateTalentPrereqs(save, charId, talentId) {
    const prereqs = TALENT_PREREQS[charId]?.[talentId];
    if (!prereqs) return; // tier 1 or unknown — no prereqs
    const owned = getAllUnlockedTalents(save, charId);
    if (prereqs.requires && !owned.has(prereqs.requires)) {
        throw new Error(`Talent prerequisite missing: ${talentId} requires ${prereqs.requires}`);
    }
    if (prereqs.excludes && owned.has(prereqs.excludes)) {
        throw new Error(`Talent path conflict: ${talentId} excludes ${prereqs.excludes}`);
    }
}

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
            // Enforce tier prerequisites — tier 2 needs tier 1, tier 3 needs tier 2,
            // and exclusive sibling cannot already be owned.
            validateTalentPrereqs(s, charId, talentId);
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