import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Server-authoritative Forge: handles Gold→Fragment conversion AND augment crafting.
// Locks starFragments, forgeWeaponAugments, forgeCharAugments, forgeConvertedToday cloud-only.
// 2026-05-04: added evolved weapon ids to VALID_WEAPON_IDS (Texxy 400 fix). v3

const GOLD_PER_FRAGMENT = 10000;
const DAILY_CONVERT_CAP = 30;

// Mirrors WEAPON_AUGMENTS in components/game/ForgePanel
const WEAPON_AUGMENT_COSTS = {
    damage_1: 3,  damage_2: 8,  damage_3: 20,
    area_1:   3,  area_2:   8,  area_3:   20,
    cd_1:     3,  cd_2:     8,  cd_3:     20,
};

// Mirrors CHAR_AUGMENTS in components/game/ForgePanel — flat id→cost map.
const CHAR_AUGMENT_COSTS = {
    neo_crit: 5, neo_chain: 15, neo_surge: 30,
    pan_armor: 5, pan_stomp: 15, pan_fortress: 30,
    nova_aoe: 5, nova_chain: 15, nova_nuke: 30,
    glt_phase: 5, glt_corrupt: 15, glt_copy: 30,
    holo_regen: 5, holo_speed: 15, holo_revive: 30,
    code_xp: 5, code_hack: 15, code_virus: 30,
    dat_ghost: 5, dat_drain: 15, dat_shade: 30,
    neo_range: 5, neo_pierce: 15, neo_rail: 30,
    syn_gold: 5, syn_beat: 15, syn_amp: 30,
    sky_speed: 5, sky_twin: 15, sky_ace: 30,
};

const VALID_CHAR_IDS = new Set([
    'neobyte','pandypaws','novabyte','glitch','holodrift',
    'codebreaker','dataphantom','neonvortex','synthbeats','skybyte'
]);

// Base weapons + evolved/synergy weapons. The Forge UI lets players upgrade
// any weapon they can equip in a run, including evolutions like Orbital Defense
// Network. Pre-fix this list only had the 9 base weapons, so every player on
// an evolved weapon hit "Invalid weaponId" → 400 (Texxy 2026-05-04).
const VALID_WEAPON_IDS = new Set([
    // base
    'neoBlaster','napBeam','vineWhip','slothSwarm','napalm',
    'novaPulse','shieldBubble','bouncingBlade','toxicCloud',
    // evolved / synergy
    'orbitalDefense','supernovaBeam','aegisMatrix','quantumCollapse',
    'hellfire','vampiricLash','buzzsawSwarm',
]);

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

// Rotate across all 9 balance API keys (each 100 req/min) so a single rate-limited
// key doesn't make ownsCharacter fail and block the player from forging augments.
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
            // Retry only on rate-limit / server errors. Other 4xx → genuine miss.
            if (res.status !== 429 && res.status < 500) return false;
        }
        return false;
    } catch {
        return false;
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const wallet = me.wallet_address;
        if (!wallet) return Response.json({ error: 'No wallet linked to user' }, { status: 400 });

        const { action, payload } = await req.json();
        if (!action) return Response.json({ error: 'action required' }, { status: 400 });

        const walletLower = wallet.toLowerCase();
        const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower });
        if (records.length === 0) {
            return Response.json({ error: 'PlayerSave not found — sync your save first' }, { status: 400 });
        }
        const saveRecord = records[0];
        const save = typeof saveRecord.save_data === 'string'
            ? JSON.parse(saveRecord.save_data)
            : saveRecord.save_data;

        const updated = { ...save };

        if (action === 'convert') {
            const amount = Math.max(1, Math.floor(Number(payload?.amount) || 0));
            if (amount <= 0) return Response.json({ error: 'amount must be > 0' }, { status: 400 });

            const today = getToday();
            const convertedToday = save.forgeConvertedToday?.date === today
                ? Number(save.forgeConvertedToday.count || 0)
                : 0;

            if (convertedToday + amount > DAILY_CONVERT_CAP) {
                return Response.json({ error: `Daily cap reached (${convertedToday}/${DAILY_CONVERT_CAP})` }, { status: 400 });
            }

            const goldCost = amount * GOLD_PER_FRAGMENT;
            const gold = Number(save.gold || 0);
            if (gold < goldCost) {
                return Response.json({ error: `Not enough gold (need ${goldCost}, have ${gold})` }, { status: 400 });
            }

            updated.gold = gold - goldCost;
            updated.starFragments = Number(save.starFragments || 0) + amount;
            updated.forgeConvertedToday = { date: today, count: convertedToday + amount };
        } else if (action === 'forgeWeaponAugment') {
            const weaponId = payload?.weaponId;
            const augmentId = payload?.augmentId;
            if (!VALID_WEAPON_IDS.has(weaponId)) {
                return Response.json({ error: 'Invalid weaponId' }, { status: 400 });
            }
            const cost = WEAPON_AUGMENT_COSTS[augmentId];
            if (!cost) return Response.json({ error: 'Invalid augmentId' }, { status: 400 });

            const owned = save.forgeWeaponAugments?.[weaponId] || [];
            if (owned.includes(augmentId)) {
                return Response.json({ error: 'Augment already owned' }, { status: 400 });
            }
            const fragments = Number(save.starFragments || 0);
            if (fragments < cost) {
                return Response.json({ error: `Not enough Star Fragments (need ${cost}, have ${fragments})` }, { status: 400 });
            }

            updated.starFragments = fragments - cost;
            updated.forgeWeaponAugments = {
                ...(save.forgeWeaponAugments || {}),
                [weaponId]: [...owned, augmentId],
            };
        } else if (action === 'forgeCharAugment') {
            const charId = payload?.charId;
            const augmentId = payload?.augmentId;
            if (!VALID_CHAR_IDS.has(charId)) {
                return Response.json({ error: 'Invalid charId' }, { status: 400 });
            }
            const cost = CHAR_AUGMENT_COSTS[augmentId];
            if (!cost) return Response.json({ error: 'Invalid augmentId' }, { status: 400 });

            // Player must own the character (kill-milestone unlock or NFT).
            const owns = await ownsCharacter(save, wallet, charId);
            if (!owns) {
                return Response.json({ error: `Character not unlocked: ${charId}` }, { status: 403 });
            }

            const owned = save.forgeCharAugments?.[charId] || [];
            if (owned.includes(augmentId)) {
                return Response.json({ error: 'Augment already owned' }, { status: 400 });
            }
            const fragments = Number(save.starFragments || 0);
            if (fragments < cost) {
                return Response.json({ error: `Not enough Star Fragments (need ${cost}, have ${fragments})` }, { status: 400 });
            }

            updated.starFragments = fragments - cost;
            updated.forgeCharAugments = {
                ...(save.forgeCharAugments || {}),
                [charId]: [...owned, augmentId],
            };
        } else {
            return Response.json({ error: 'Unknown action' }, { status: 400 });
        }

        updated.updated_at = Date.now();
        await base44.asServiceRole.entities.PlayerSave.update(saveRecord.id, {
            save_data: updated,
            updated_at: Date.now()
        });

        console.log(`[forgeAction] ${walletLower} ${action} OK`);
        return Response.json({ success: true, saveData: updated });
    } catch (error) {
        console.error('[forgeAction]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});