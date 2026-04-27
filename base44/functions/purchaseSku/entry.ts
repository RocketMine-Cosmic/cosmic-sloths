import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// Pricing: server-side via OmenX dev portal (cached in memory).
// Phase 3a: also applies the grant to PlayerSave server-side after charge confirmed.

// Talent prerequisite map — MUST mirror CHARACTER_TALENTS in game/Constants.js.
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

function getAllUnlockedTalents(save, charId) {
    const perm = save.permanentTalents?.[charId] || [];
    const week = save.weeklyTalents?.[charId] || [];
    const season = save.seasonalTalents?.[charId] || [];
    return new Set([...perm, ...week, ...season]);
}

function validateTalentPrereqs(save, charId, talentId) {
    const prereqs = TALENT_PREREQS[charId]?.[talentId];
    if (!prereqs) return;
    const owned = getAllUnlockedTalents(save, charId);
    if (prereqs.requires && !owned.has(prereqs.requires)) {
        throw new Error(`Talent prerequisite missing: ${talentId} requires ${prereqs.requires}`);
    }
    if (prereqs.excludes && owned.has(prereqs.excludes)) {
        throw new Error(`Talent path conflict: ${talentId} excludes ${prereqs.excludes}`);
    }
}

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

let skuPriceCache = null;
let skuPriceCacheExpiresAt = 0;
const SKU_CACHE_TTL = 10 * 60 * 1000;

// Load balance across multiple payment API keys (each 100 req/min). Returns a shuffled array
// so callers pick a different key per request and can retry on rate-limit (429).
function getPaymentKeys() {
    const keys = [
        Deno.env.get('OMENX_PAYMENT_API_KEY'),
        Deno.env.get('OMENX_PAYMENT_API_KEY_2'),
        Deno.env.get('OMENX_PAYMENT_API_KEY_3'),
        Deno.env.get('OMENX_PAYMENT_API_KEY_4'),
    ].filter(Boolean);
    return keys.map(k => ({ k, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => x.k);
}

async function getSkuPrice(skuId, apiBaseUrl, apiKeys) {
    const now = Date.now();
    if (!skuPriceCache || now >= skuPriceCacheExpiresAt) {
        let res, lastStatus = 0;
        for (const key of apiKeys) {
            res = await fetch(`${apiBaseUrl}/v1/products`, {
                headers: { 'Authorization': `Bearer ${key}` },
            });
            if (res.ok) break;
            lastStatus = res.status;
            // Only retry on rate-limit / server errors
            if (res.status !== 429 && res.status < 500) break;
            console.warn('[purchaseSku] catalog HTTP', res.status, '— trying next key');
        }
        if (!res || !res.ok) throw new Error(`Failed to fetch SKU catalog: HTTP ${lastStatus || res?.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.products || data?.skus || data?.items || []);
        skuPriceCache = {};
        for (const sku of list) {
            const id = sku.sku || sku.skuId || sku.id || sku.productId;
            const price = parseFloat(
                sku.pricesInCurrency?.OMENX ?? sku.priceInOmenx ?? sku.price ?? 0
            );
            if (id && price > 0) skuPriceCache[id] = price;
        }
        skuPriceCacheExpiresAt = now + SKU_CACHE_TTL;
        console.log(`[purchaseSku] SKU price cache refreshed (${Object.keys(skuPriceCache).length} entries)`);
    }
    return skuPriceCache[skuId] || 0;
}

// ---- Grant application ----
// Applies grantInfo to the player's cloud PlayerSave atomically. Returns the
// updated save_data. Validates that the SKU prefix matches the grant type so a
// cheap SKU can't be used to grant an expensive item.
function applyGrant(save, grantInfo, skuId, periodIds) {
    if (!grantInfo || !grantInfo.type) return save;
    const s = { ...save };
    const { type } = grantInfo;
    const skuPrefix = skuId.split('-lvl')[0]; // e.g. "stat-upgrade-permanent"

    switch (type) {
        case 'stat': {
            // grantInfo: { type, tier: 'permanent'|'weekly'|'seasonal', stat, level }
            const { tier, stat, level } = grantInfo;
            const expected = `stat-upgrade-${tier}`;
            if (skuPrefix !== expected) throw new Error(`SKU/grant mismatch: ${skuPrefix} vs ${expected}`);
            const key = tier === 'permanent' ? 'permanentUpgrades'
                      : tier === 'weekly' ? 'weeklyUpgrades' : 'seasonalUpgrades';
            const obj = { ...(s[key] || {}) };
            const currentLvl = Number(obj[stat] || 0);
            // Level being purchased must be exactly currentLvl + 1
            if (level !== currentLvl + 1) {
                throw new Error(`Stat level mismatch: requested ${level} but cloud is at ${currentLvl}`);
            }
            obj[stat] = level;
            // Stamp period id
            if (tier === 'weekly') obj.weekId = periodIds.week_id;
            if (tier === 'seasonal') obj.seasonId = periodIds.season_id;
            s[key] = obj;
            break;
        }
        case 'weapon': {
            // grantInfo: { type, tier, weaponId, stat, level }
            const { tier, weaponId, stat, level } = grantInfo;
            const expected = `weapon-upgrades-${tier}`;
            if (skuPrefix !== expected) throw new Error(`SKU/grant mismatch: ${skuPrefix} vs ${expected}`);
            const key = tier === 'permanent' ? 'permanentWeaponUpgrades'
                      : tier === 'weekly' ? 'weeklyWeaponUpgrades' : 'seasonalWeaponUpgrades';
            const obj = { ...(s[key] || {}) };
            const weaponObj = { ...(obj[weaponId] || {}) };
            const currentLvl = Number(weaponObj[stat] || 0);
            if (level !== currentLvl + 1) {
                throw new Error(`Weapon level mismatch: requested ${level} but cloud is at ${currentLvl}`);
            }
            weaponObj[stat] = level;
            obj[weaponId] = weaponObj;
            if (tier === 'weekly') obj.weekId = periodIds.week_id;
            if (tier === 'seasonal') obj.seasonId = periodIds.season_id;
            s[key] = obj;
            break;
        }
        case 'talent': {
            // grantInfo: { type, tier, charId, talentId, talentTier }
            const { tier, charId, talentId, talentTier } = grantInfo;
            const expected = `character-talents-${tier}`;
            if (skuPrefix !== expected) throw new Error(`SKU/grant mismatch: ${skuPrefix} vs ${expected}`);
            // Validate SKU level matches talent tier
            const skuLevel = parseInt(skuId.split('-lvl')[1] || '1', 10);
            if (skuLevel !== talentTier) {
                throw new Error(`Talent SKU/tier mismatch: SKU lvl${skuLevel} vs tier ${talentTier}`);
            }
            const key = tier === 'permanent' ? 'permanentTalents'
                      : tier === 'weekly' ? 'weeklyTalents' : 'seasonalTalents';
            const obj = { ...(s[key] || {}) };
            const charArr = Array.isArray(obj[charId]) ? [...obj[charId]] : [];
            if (charArr.includes(talentId)) {
                throw new Error('Talent already unlocked');
            }
            // Enforce tier prerequisites (tier 1 needed for tier 2, tier 2 for tier 3, exclusive paths).
            validateTalentPrereqs(s, charId, talentId);
            charArr.push(talentId);
            obj[charId] = charArr;
            if (tier === 'weekly') obj.weekId = periodIds.week_id;
            if (tier === 'seasonal') obj.seasonId = periodIds.season_id;
            s[key] = obj;
            break;
        }
        case 'cosmetic': {
            // grantInfo: { type, slot: 'trail'|'kill'|'skin', cosmeticId, charId? }
            const { slot, cosmeticId, charId } = grantInfo;
            const validPrefixes = {
                trail: ['character-trails-'],
                kill:  ['character-kill-effects-'],
                skin:  ['character-skins-'],
            };
            const ok = (validPrefixes[slot] || []).some(p => skuId.startsWith(p));
            if (!ok) throw new Error(`SKU/cosmetic slot mismatch: ${skuId} for slot ${slot}`);

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

        const { skuId, quantity = 1, playerName: playerNameParam, grantInfo } = await req.json();
        if (!skuId) return Response.json({ error: 'skuId required' }, { status: 400 });

        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;
        const apiKeys = getPaymentKeys();
        if (apiKeys.length === 0) {
            return Response.json({ error: 'No payment API keys configured' }, { status: 500 });
        }
        const idempotencyKey = `${walletAddress}-${skuId}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)}`;

        console.log(`[purchaseSku] SKU: ${skuId} x${quantity} wallet: ${walletAddress} grant: ${grantInfo?.type || 'none'}`);

        // Look up unit price BEFORE purchase so paymentAmount > 0 triggers on-chain settle.
        const unitPrice = await getSkuPrice(skuId, apiBaseUrl, apiKeys);
        if (!unitPrice || unitPrice <= 0) {
            const sampleKeys = skuPriceCache ? Object.keys(skuPriceCache).slice(0, 5) : [];
            console.error('[purchaseSku] Unknown SKU price for:', skuId, 'cache size:', skuPriceCache ? Object.keys(skuPriceCache).length : 'null', 'sample keys:', sampleKeys);
            return Response.json({ error: 'SKU price not configured', skuId }, { status: 500 });
        }
        const totalAmount = unitPrice * quantity;

        // --- Pre-validate grant against current cloud save BEFORE charging ---
        // This way an invalid grant (already unlocked / wrong level) fails fast
        // without spending OmenX.
        let saveRecord = null;
        let updatedSave = null;
        const periodIds = getCurrentPeriodIds();

        if (grantInfo) {
            const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress.toLowerCase() });
            if (records.length === 0) {
                return Response.json({ error: 'PlayerSave not found — sync your save first' }, { status: 400 });
            }
            saveRecord = records[0];
            const saveData = typeof saveRecord.save_data === 'string'
                ? JSON.parse(saveRecord.save_data)
                : saveRecord.save_data;
            try {
                updatedSave = applyGrant(saveData, grantInfo, skuId, periodIds);
            } catch (e) {
                return Response.json({ error: `Grant validation failed: ${e.message}` }, { status: 400 });
            }
        }

        // --- Charge OmenX ---
        // Try each payment key in order; retry on 429 (rate-limit) only. Idempotency key
        // ensures retries don't double-charge if a previous attempt actually went through.
        let purchaseData;
        let lastErr = null;
        for (let i = 0; i < apiKeys.length; i++) {
            const sdk = new OmenXServerSDK({ apiKey: apiKeys[i], apiBaseUrl });
            try {
                purchaseData = await sdk.createPurchase({
                    playerWallet: walletAddress,
                    skuId,
                    quantity,
                    idempotencyKey,
                    paymentCurrency: 'OMENX',
                    paymentAmount: totalAmount,
                });
                break; // success
            } catch (err) {
                lastErr = err;
                const msg = err?.message || String(err);
                if (msg.includes('429') && i < apiKeys.length - 1) {
                    console.warn('[purchaseSku] payment key', i + 1, 'rate-limited — trying next key');
                    continue;
                }
                if (msg.includes('429')) return Response.json({ error: 'Rate limited by payment processor' }, { status: 429 });
                console.error('[purchaseSku] SDK purchase failed:', msg);
                return Response.json({ error: msg }, { status: 500 });
            }
        }
        if (!purchaseData) {
            const msg = lastErr?.message || 'Purchase failed';
            return Response.json({ error: msg }, { status: 500 });
        }

        const txHash = purchaseData?.transactionId || purchaseData?.transactionHash || purchaseData?.txHash || purchaseData?.paymentTxHash || null;
        const status = purchaseData?.status || 'unknown';
        console.log(`[purchaseSku] OmenX status=${status} txHash=${txHash || 'NONE'}`);
        if (status !== 'confirmed') {
            console.error('[purchaseSku] Purchase not confirmed:', JSON.stringify(purchaseData).slice(0, 500));
            return Response.json({ error: 'Purchase not confirmed', detail: purchaseData }, { status: 500 });
        }

        // --- Apply grant to PlayerSave (if any) ---
        if (grantInfo && saveRecord && updatedSave) {
            try {
                await base44.asServiceRole.entities.PlayerSave.update(saveRecord.id, {
                    save_data: updatedSave,
                    updated_at: Date.now()
                });
                console.log(`[purchaseSku] Granted ${grantInfo.type} to ${walletAddress}`);
            } catch (err) {
                console.error('[purchaseSku] CRITICAL: charged but failed to apply grant:', err.message);
                // Charge already happened — log but tell client to retry sync to get state from server.
                return Response.json({
                    success: true,
                    amount: totalAmount,
                    grantApplied: false,
                    warning: 'Charge succeeded but grant write failed — your purchase will sync from server next time.',
                }, { status: 200 });
            }
        }

        const { week_id, season_id } = periodIds;

        // Log token spend
        try {
            await base44.asServiceRole.entities.TokenSpendLog.create({
                user_id: me.id,
                player_name: playerNameParam || me.full_name || walletAddress,
                wallet_address: walletAddress,
                amount: totalAmount,
                week_id,
                season_id
            });
        } catch (err) {
            console.error('[purchaseSku] TokenSpendLog create failed:', err.message);
        }

        // Update TokenPool (non-fatal)
        try {
            const [weeklyPools, seasonalPools] = await Promise.all([
                base44.asServiceRole.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' }),
                base44.asServiceRole.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' }),
            ]);
            const weeklyPool = weeklyPools[0];
            const seasonalPool = seasonalPools[0];
            await Promise.all([
                weeklyPool
                    ? base44.asServiceRole.entities.TokenPool.update(weeklyPool.id, { total_spent: (weeklyPool.total_spent || 0) + totalAmount })
                    : base44.asServiceRole.entities.TokenPool.create({ period_id: week_id, period_type: 'weekly', total_spent: totalAmount, distributed: false }),
                seasonalPool
                    ? base44.asServiceRole.entities.TokenPool.update(seasonalPool.id, { total_spent: (seasonalPool.total_spent || 0) + totalAmount })
                    : base44.asServiceRole.entities.TokenPool.create({ period_id: season_id, period_type: 'seasonal', total_spent: totalAmount, distributed: false }),
            ]);
        } catch (err) {
            console.error('[purchaseSku] TokenPool upsert failed:', err.message);
        }

        return Response.json({
            success: true,
            amount: totalAmount,
            grantApplied: !!grantInfo,
            saveData: updatedSave || null,
        });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});