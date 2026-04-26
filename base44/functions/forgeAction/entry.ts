import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Server-authoritative Forge: handles Gold→Fragment conversion AND augment crafting.
// Locks starFragments, forgeWeaponAugments, forgeCharAugments, forgeConvertedToday cloud-only.

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

const VALID_WEAPON_IDS = new Set([
    'neoBlaster','napBeam','vineWhip','slothSwarm','napalm',
    'novaPulse','shieldBubble','bouncingBlade','toxicCloud'
]);

function getToday() {
    return new Date().toISOString().slice(0, 10);
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