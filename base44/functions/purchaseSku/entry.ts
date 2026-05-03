import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Discord webhook fire-and-forget. Never throws — any failure is swallowed.
async function postDiscord(envName, color, { title, description, fields }) {
    const url = Deno.env.get(envName);
    if (!url) return;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [{
                title: title?.slice(0, 256),
                description: description?.slice(0, 4000),
                color,
                timestamp: new Date().toISOString(),
                fields: (fields || []).slice(0, 25).map(f => ({ name: String(f.name).slice(0, 256), value: String(f.value).slice(0, 1024), inline: !!f.inline })),
            }] }),
        });
    } catch {}
}
const LARGE_OMENX_THRESHOLD = 1000; // ≥ 1,000 OMENX in a single purchase pings #economy-alerts

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

// Tier-scoped — prereqs check only the same tree (permanent/weekly/seasonal),
// so buying neo_1 in permanent doesn't unlock neo_2a in seasonal (Hugo bug 2026-05-02).
function getUnlockedTalentsForTier(save, charId, tier) {
    const key = tier === 'permanent' ? 'permanentTalents'
              : tier === 'weekly' ? 'weeklyTalents' : 'seasonalTalents';
    const arr = save[key]?.[charId] || [];
    return new Set(arr);
}

function getBalanceKeys() {
    const keys = [
        Deno.env.get('OMENX_BALANCE_API_KEY'),
        Deno.env.get('OMENX_BALANCE_API_KEY_2'),
        Deno.env.get('OMENX_BALANCE_API_KEY_3'),
        Deno.env.get('OMENX_BALANCE_API_KEY_4'),
        Deno.env.get('OMENX_BALANCE_API_KEY_5'),
        Deno.env.get('OMENX_BALANCE_API_KEY_6'),
        Deno.env.get('OMENX_BALANCE_API_KEY_7'),
        Deno.env.get('OMENX_BALANCE_API_KEY_8'),
        Deno.env.get('OMENX_BALANCE_API_KEY_9'),
    ].filter(Boolean);
    return keys.map(k => ({ k, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => x.k);
}

async function ownsCharacter(save, walletAddress, charId) {
    if (charId === 'neobyte') return true;
    const unlocked = save.unlockedCharacters || ['neobyte'];
    if (unlocked.includes(charId)) return true;
    try {
        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;
        const keys = getBalanceKeys();
        for (const key of keys) {
            const res = await fetch(`${apiBaseUrl}/v1/players/${walletAddress}?chainId=56`, {
                headers: { 'Authorization': `Bearer ${key}` },
            });
            if (res.ok) {
                const data = await res.json();
                const nfts = data?.nfts || [];
                return nfts.some(nft => (nft?.metadata?.name || '').toLowerCase() === charId);
            }
            if (res.status !== 429 && res.status < 500) return false;
        }
        return false;
    } catch {
        return false;
    }
}

function validateTalentPrereqs(save, charId, talentId, tier) {
    const prereqs = TALENT_PREREQS[charId]?.[talentId];
    if (!prereqs) return;
    const owned = getUnlockedTalentsForTier(save, charId, tier);
    if (prereqs.requires && !owned.has(prereqs.requires)) {
        throw new Error(`You need to unlock the previous talent first.`);
    }
    if (prereqs.excludes && owned.has(prereqs.excludes)) {
        throw new Error(`You've already chosen the other path on this branch — only one is allowed.`);
    }
}

// Proper ISO 8601 (Mon-start, Sun 23:59 UTC end). Old formula rolled over a day early on Sundays.
function getCurrentPeriodIds() {
    const now = new Date();
    const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const isoYear = tmp.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const isoWeek = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
    const week_id = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
    const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
    const season_id = `${isoYear}-S${seasonNum}`;
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
        Deno.env.get('OMENX_PAYMENT_API_KEY_5'),
        Deno.env.get('OMENX_PAYMENT_API_KEY_6'),
        Deno.env.get('OMENX_PAYMENT_API_KEY_7'),
        Deno.env.get('OMENX_PAYMENT_API_KEY_8'),
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
        if (!res || !res.ok) throw new Error(`Couldn't load store prices right now. Please try again in a moment.`);
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

// Cosmetic SKU ↔ goldCost binding — MUST mirror lib/skuMap.js. Used to verify the
// SKU the player is actually paying for matches the cosmeticId being granted, so
// a cheap SKU can't unlock an expensive cosmetic via tampered grantInfo.
const COSMETIC_SKU_COSTS = {
    'character-trails-basic':           3000,
    'character-trails-advanced':        10000,
    'character-trails-epic':            20000,
    'character-trails-leg':             30000,
    'character-kill-effects-basic':     3000,
    'character-kill-effects-advanced':  12000,
    'character-kill-effects-epic':      25000,
    'character-skins-basic':            5000,
    'character-skins-advance':          20000,
};

// If the player's stored container is from a previous week/season, return a
// fresh empty container instead of the stale one. Without this, the first
// purchase after a reset fails — we'd compare new level=1 against last
// period's surviving levels (or last period's already-owned talents).
function rolloverContainer(obj, tier, periodIds) {
    if (!obj) return {};
    if (tier === 'weekly' && obj.weekId && obj.weekId !== periodIds.week_id) return {};
    if (tier === 'seasonal' && obj.seasonId && obj.seasonId !== periodIds.season_id) return {};
    return { ...obj };
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
        case 'talent_respec': {
            // grantInfo: { type, tier, charId } — clears all talents for one character at one tier. No refund.
            const { tier, charId } = grantInfo;
            // Exact-match SKU↔tier check — previously a `talent-respec-weekly` (cheap)
            // SKU could clear `permanent` talents (expensive respec).
            if (skuId !== `talent-respec-${tier}`) {
                throw new Error(`This respec doesn't match. Please refresh and try again.`);
            }
            const key = tier === 'permanent' ? 'permanentTalents'
                      : tier === 'weekly' ? 'weeklyTalents' : 'seasonalTalents';
            const obj = rolloverContainer(s[key], tier, periodIds);
            obj[charId] = [];
            if (tier === 'weekly') obj.weekId = periodIds.week_id;
            if (tier === 'seasonal') obj.seasonId = periodIds.season_id;
            s[key] = obj;
            break;
        }
        case 'stat': {
            // grantInfo: { type, tier: 'permanent'|'weekly'|'seasonal', stat, level }
            const { tier, stat, level } = grantInfo;
            const expected = `stat-upgrade-${tier}`;
            if (skuPrefix !== expected) throw new Error(`This upgrade doesn't match your save. Please refresh and try again.`);
            const key = tier === 'permanent' ? 'permanentUpgrades'
                      : tier === 'weekly' ? 'weeklyUpgrades' : 'seasonalUpgrades';
            const obj = rolloverContainer(s[key], tier, periodIds);
            const currentLvl = Number(obj[stat] || 0);
            // Level being purchased must be exactly currentLvl + 1
            if (level !== currentLvl + 1) {
                throw new Error(`Your save is out of sync. Please refresh and try again.`);
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
            if (skuPrefix !== expected) throw new Error(`This upgrade doesn't match your save. Please refresh and try again.`);
            const key = tier === 'permanent' ? 'permanentWeaponUpgrades'
                      : tier === 'weekly' ? 'weeklyWeaponUpgrades' : 'seasonalWeaponUpgrades';
            const obj = rolloverContainer(s[key], tier, periodIds);
            const weaponObj = { ...(obj[weaponId] || {}) };
            const currentLvl = Number(weaponObj[stat] || 0);
            if (level !== currentLvl + 1) {
                throw new Error(`Your save is out of sync. Please refresh and try again.`);
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
            if (skuPrefix !== expected) throw new Error(`This talent doesn't match your save. Please refresh and try again.`);
            // Validate SKU level matches talent tier
            const skuLevel = parseInt(skuId.split('-lvl')[1] || '1', 10);
            if (skuLevel !== talentTier) {
                throw new Error(`This talent's tier doesn't match. Please refresh and try again.`);
            }
            const key = tier === 'permanent' ? 'permanentTalents'
                      : tier === 'weekly' ? 'weeklyTalents' : 'seasonalTalents';
            const obj = rolloverContainer(s[key], tier, periodIds);
            const charArr = Array.isArray(obj[charId]) ? [...obj[charId]] : [];
            if (charArr.includes(talentId)) {
                throw new Error('You already own this talent.');
            }
            // Enforce tier prerequisites scoped to THIS tree (permanent/weekly/seasonal).
            validateTalentPrereqs(s, charId, talentId, tier);
            charArr.push(talentId);
            obj[charId] = charArr;
            if (tier === 'weekly') obj.weekId = periodIds.week_id;
            if (tier === 'seasonal') obj.seasonId = periodIds.season_id;
            s[key] = obj;
            break;
        }
        case 'xp_buff': {
            // grantInfo: { type: 'xp_buff' } — sets sessionBuffs.xpExpiry to now+60min using server clock.
            // Reject if an existing buff is still active so players can't stack/double-buy.
            if (skuId !== 'ingame-xp-buff') {
                throw new Error(`This buff doesn't match the SKU. Please refresh and try again.`);
            }
            const now = Date.now();
            const existing = Number(s.sessionBuffs?.xpExpiry || 0);
            if (existing > now) {
                throw new Error(`You already have an XP buff active.`);
            }
            s.sessionBuffs = { ...(s.sessionBuffs || {}), xpExpiry: now + 60 * 60 * 1000 };
            break;
        }
        case 'cosmetic': {
            // grantInfo: { type, slot: 'trail'|'kill'|'skin', cosmeticId, charId?, goldCost }
            const { slot, cosmeticId, charId, goldCost } = grantInfo;
            const validPrefixes = {
                trail: ['character-trails-'],
                kill:  ['character-kill-effects-'],
                skin:  ['character-skins-'],
            };
            const ok = (validPrefixes[slot] || []).some(p => skuId.startsWith(p));
            if (!ok) throw new Error(`This cosmetic doesn't match the slot. Please refresh and try again.`);
            // Verify the SKU's goldCost-tier matches grantInfo.goldCost — prevents
            // buying a cheap SKU and granting an expensive cosmetic via tampered grant.
            const skuGoldCost = COSMETIC_SKU_COSTS[skuId];
            if (skuGoldCost === undefined) {
                throw new Error(`This cosmetic SKU isn't recognised. Please refresh and try again.`);
            }
            if (Number(goldCost) !== skuGoldCost) {
                throw new Error(`This cosmetic doesn't match the SKU price. Please refresh and try again.`);
            }

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
            throw new Error(`Something went wrong with this purchase. Please try again.`);
    }
    s.updated_at = Date.now();
    return s;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Please sign in to continue.' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const { skuId, quantity = 1, playerName: playerNameParam, grantInfo } = await req.json();
        if (!skuId) return Response.json({ error: 'Missing item info — please refresh and try again.' }, { status: 400 });

        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;
        const apiKeys = getPaymentKeys();
        if (apiKeys.length === 0) {
            console.error('[purchaseSku] No payment API keys configured');
            return Response.json({ error: 'Payments are temporarily unavailable. Please try again shortly.' }, { status: 500 });
        }
        const idempotencyKey = `${walletAddress}-${skuId}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)}`;

        console.log(`[purchaseSku] SKU: ${skuId} x${quantity} wallet: ${walletAddress} grant: ${grantInfo?.type || 'none'}`);

        // Look up unit price BEFORE purchase so paymentAmount > 0 triggers on-chain settle.
        const unitPrice = await getSkuPrice(skuId, apiBaseUrl, apiKeys);
        if (!unitPrice || unitPrice <= 0) {
            const sampleKeys = skuPriceCache ? Object.keys(skuPriceCache).slice(0, 5) : [];
            console.error('[purchaseSku] Unknown SKU price for:', skuId, 'cache size:', skuPriceCache ? Object.keys(skuPriceCache).length : 'null', 'sample keys:', sampleKeys);
            return Response.json({ error: 'This item isn\'t available right now. Please try again shortly.', skuId }, { status: 500 });
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
                return Response.json({ error: 'We couldn\'t find your save. Please play a run first to create one.' }, { status: 400 });
            }
            saveRecord = records[0];
            const saveData = typeof saveRecord.save_data === 'string'
                ? JSON.parse(saveRecord.save_data)
                : saveRecord.save_data;

            // Talents require the player to actually own the character (kill-milestone or NFT).
            if (grantInfo.type === 'talent') {
                const owns = await ownsCharacter(saveData, walletAddress, grantInfo.charId);
                if (!owns) {
                    return Response.json({ error: `You haven't unlocked this character yet.` }, { status: 403 });
                }
            }

            try {
                updatedSave = applyGrant(saveData, grantInfo, skuId, periodIds);
            } catch (e) {
                // applyGrant already throws human-friendly messages
                return Response.json({ error: e.message }, { status: 400 });
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
                if (msg.includes('429')) return Response.json({ error: 'Too many purchases right now — please try again in a moment.' }, { status: 429 });
                console.error('[purchaseSku] SDK purchase failed:', msg);
                // Surface common payment errors clearly, hide raw stack traces
                const friendly = /insufficient/i.test(msg) ? "You don't have enough OMENX to complete this purchase."
                    : /balance/i.test(msg) ? "Your OMENX balance couldn't be confirmed. Please try again."
                    : "Your purchase couldn't be completed. Please try again.";
                return Response.json({ error: friendly }, { status: 500 });
            }
        }
        if (!purchaseData) {
            console.error('[purchaseSku] No purchase data; lastErr:', lastErr?.message);
            return Response.json({ error: "Your purchase couldn't be completed. Please try again." }, { status: 500 });
        }

        const txHash = purchaseData?.transactionId || purchaseData?.transactionHash || purchaseData?.txHash || purchaseData?.paymentTxHash || null;
        const status = purchaseData?.status || 'unknown';
        console.log(`[purchaseSku] OmenX status=${status} txHash=${txHash || 'NONE'}`);
        if (status !== 'confirmed') {
            console.error('[purchaseSku] Purchase not confirmed:', JSON.stringify(purchaseData).slice(0, 500));
            return Response.json({ error: "Your payment didn't go through. Please try again — you haven't been charged." }, { status: 500 });
        }

        // --- Apply grant to PlayerSave (if any) ---
        // CRITICAL: re-fetch the save AFTER charge confirmed and re-apply the grant.
        // Otherwise two concurrent purchases could each pre-validate against the same
        // old snapshot, charge, and one would clobber the other on write — player gets
        // charged 2× OMENX but only 1 grant lands.
        if (grantInfo && saveRecord) {
            try {
                const freshRecords = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress.toLowerCase() });
                if (freshRecords.length === 0) throw new Error('Save vanished mid-purchase');
                const freshRecord = freshRecords[0];
                const freshSave = typeof freshRecord.save_data === 'string'
                    ? JSON.parse(freshRecord.save_data)
                    : freshRecord.save_data;
                const reAppliedSave = applyGrant(freshSave, grantInfo, skuId, periodIds);
                await base44.asServiceRole.entities.PlayerSave.update(freshRecord.id, {
                    save_data: reAppliedSave,
                    updated_at: Date.now()
                });
                updatedSave = reAppliedSave;
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
                sku_id: skuId,
                grant_info: grantInfo || null,
                week_id,
                season_id
            });
        } catch (err) {
            console.error('[purchaseSku] TokenSpendLog create failed:', err.message);
        }

        // Alert #economy-alerts on large purchases (≥ threshold OMENX)
        if (totalAmount >= LARGE_OMENX_THRESHOLD) {
            postDiscord('DISCORD_ECONOMY_WEBHOOK', 0xf59e0b, {
                title: '💰 Large OMENX purchase',
                fields: [
                    { name: 'Player', value: playerNameParam || me.full_name || 'Unknown pilot', inline: true },
                    { name: 'Amount', value: `${totalAmount} OMENX`, inline: true },
                    { name: 'SKU', value: skuId, inline: true },
                    { name: 'Week', value: week_id, inline: true },
                ],
            });
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
        // Skip noisy rate-limit alerts — they're routine and clutter the error channel.
        if (!/rate limit/i.test(error?.message || '')) {
            postDiscord('DISCORD_ERROR_WEBHOOK', 0xef4444, {
                title: '❌ purchaseSku failed',
                description: `\`\`\`${(error.message || String(error)).slice(0, 1500)}\`\`\``,
            });
        }
        return Response.json({ error: 'Something went wrong with your purchase. Please try again.' }, { status: 500 });
    }
});