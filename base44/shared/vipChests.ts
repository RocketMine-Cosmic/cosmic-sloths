// VIP chest grants — the ONE place that decides what a chest prize becomes and puts it on a save.
// Used by: onVipChestRewardGranted (Omen's webhook), getMyChestRewards (held prizes + re-check on
// load), adminVipChests (retry). Design + Rob's decisions: claude/handoffs/VIP_CHESTS.md (21 Oct 2026).
//
// THE GRANT IS ONE ATOMIC DATABASE STEP (updateMany with $inc / $addToSet, proven 21 Oct by
// saveWriteProbe: 20 parallel atomic adds -> exactly 20; 20 parallel read-change-writes -> 1).
// "Add the gold, add the fragments, add the cosmetics, add the stamp — only if the stamp isn't there"
// happens inside the database, so it can never pay twice and never overwrites anything else on the
// save (it cannot undo a run).
//
// THE STAMP. The open_receipt_id goes into save_data.vipChestReceiptsApplied in that same step. Until
// every whole-save writer uses the version-checked write (stage 3 of the plan), an OLD-style writer
// that read the save before our grant and writes after it can still wipe the grant — and the stamp with
// it, because they live in the same save. So a `granted` receipt whose stamp is missing was undone;
// putting it back cannot double-pay. The receiver re-checks for a few seconds, and getMyChestRewards
// re-checks on every game load. syncSave treats the stamp as server-owned so a browser can't drop it.

export const STAMP_KEY = 'vipChestReceiptsApplied';

// Gold prizes (registered in the Omen portal 2026-08-13).
export const GOLD_SKUS: Record<string, number> = {
  'chest-ingame-gold-5k': 5_000,
  'chest-ingame-gold-10k': 10_000,
  'chest-ingame-gold-50k': 50_000,
  'chest-ingame-gold-100k': 100_000,
};

// Star fragments reuse the SHOP products (purchaseSku: batch = 15). Chest fragments do NOT count toward
// the weekly shop cap (Rob, 21 Oct).
export const FRAGMENT_SKUS: Record<string, number> = {
  'ingame-star-fragments': 15,
  'ingame-star-fragments-10': 150,
};

// The 20 chest cosmetics. Mirrors src/components/wardrobe/wardrobeData.jsx (CHEST_* lists); the portal
// SKU is 'chest_' + id. Keep the two in step.
export const CHEST_COSMETICS: { id: string; name: string; rarity: 'epic' | 'mythic' }[] = [
  { id: 'animated_pilot_orbiting_moon', name: 'Orbiting Moon', rarity: 'epic' },
  { id: 'animated_pilot_glitch_skull', name: 'Glitch Skull', rarity: 'epic' },
  { id: 'animated_pilot_rotating_blackhole', name: 'Black Hole', rarity: 'epic' },
  { id: 'animated_pilot_phoenix_wing', name: 'Phoenix Wing', rarity: 'epic' },
  { id: 'animated_pilot_eye_of_void', name: 'Eye of the Void', rarity: 'epic' },
  { id: 'animated_pilot_plasma_core', name: 'Plasma Core', rarity: 'epic' },
  { id: 'lb_frame_gold_filigree', name: 'Gold Filigree', rarity: 'epic' },
  { id: 'lb_frame_electric_arc', name: 'Electric Arc', rarity: 'epic' },
  { id: 'lb_frame_nebula_swirl', name: 'Nebula Swirl', rarity: 'epic' },
  { id: 'lb_frame_glitch_rgb', name: 'RGB Glitch', rarity: 'epic' },
  { id: 'title_style_rainbow_shimmer', name: 'Rainbow Shimmer', rarity: 'epic' },
  { id: 'title_style_blue_flame', name: 'Blue Flame', rarity: 'epic' },
  { id: 'title_style_liquid_chrome', name: 'Liquid Chrome', rarity: 'epic' },
  { id: 'weapon_trail_void', name: 'Void Trail', rarity: 'mythic' },
  { id: 'weapon_trail_solar', name: 'Solar Trail', rarity: 'mythic' },
  { id: 'weapon_trail_phoenix_fire', name: 'Phoenix Fire Trail', rarity: 'mythic' },
  { id: 'kill_fx_coin_burst', name: 'Coin Burst', rarity: 'mythic' },
  { id: 'kill_fx_supernova', name: 'Supernova', rarity: 'mythic' },
  { id: 'meteor_fx_gold_lightning', name: 'Gold Lightning', rarity: 'mythic' },
  { id: 'lb_frame_eclipse_crown', name: 'Eclipse Crown', rarity: 'mythic' },
];
const COSMETIC_BY_ID = new Map(CHEST_COSMETICS.map((c) => [c.id, c]));

// wardrobeData marks Eclipse Crown "Elite chest only", so a duplicate swap never hands it out from a lower chest.
const ELITE_ONLY = new Set(['lb_frame_eclipse_crown']);

// Owns every cosmetic of that rarity → fragments instead (Rob, 21 Oct).
export const ALL_OWNED_FRAGMENTS = { epic: 150, mythic: 450 };

export type ChestItem = { sku: string; quantity: number };
export type CosmeticGrant = { won: string; given: string | null; swap: 'none' | 'swapped' | 'fragments'; fragments?: number };
export type Granted = { gold: number; star_fragments: number; cosmetics: CosmeticGrant[] };

// Omen sends { kind:'bundle', items:[…] } or a single { kind:'product', sku, quantity? }. quantity is
// omitted when 1. Returns null if the shape is not understood.
export function normaliseItems(rewardPayload: any): ChestItem[] | null {
  if (!rewardPayload || typeof rewardPayload !== 'object') return null;
  const list = rewardPayload.kind === 'bundle' ? rewardPayload.items : [rewardPayload];
  if (!Array.isArray(list) || list.length === 0) return null;
  const out: ChestItem[] = [];
  for (const it of list) {
    if (!it || typeof it.sku !== 'string' || !it.sku) return null;
    const q = it.quantity === undefined ? 1 : Number(it.quantity);
    if (!Number.isInteger(q) || q < 1 || q > 100) return null;
    out.push({ sku: it.sku, quantity: q });
  }
  return out;
}

export function unknownSkus(items: ChestItem[]): string[] {
  return items
    .map((i) => i.sku)
    .filter((s) => !(s in GOLD_SKUS) && !(s in FRAGMENT_SKUS) && !(s.startsWith('chest_') && COSMETIC_BY_ID.has(s.slice(6))));
}

export function cosmeticName(id: string | null | undefined): string {
  return (id && COSMETIC_BY_ID.get(id)?.name) || id || '';
}

// Decide what the prize becomes for THIS player's current save. Call only when unknownSkus() is empty.
export function planGrant(items: ChestItem[], saveData: any, chestKey: string): Granted {
  const owned = new Set<string>(Array.isArray(saveData?.owned_chest_cosmetics) ? saveData.owned_chest_cosmetics : []);
  const g: Granted = { gold: 0, star_fragments: 0, cosmetics: [] };
  for (const it of items) {
    if (it.sku in GOLD_SKUS) { g.gold += GOLD_SKUS[it.sku] * it.quantity; continue; }
    if (it.sku in FRAGMENT_SKUS) { g.star_fragments += FRAGMENT_SKUS[it.sku] * it.quantity; continue; }
    const won = it.sku.slice(6);
    for (let n = 0; n < it.quantity; n++) {
      if (!owned.has(won)) { owned.add(won); g.cosmetics.push({ won, given: won, swap: 'none' }); continue; }
      const rarity = COSMETIC_BY_ID.get(won)!.rarity;
      const pool = CHEST_COSMETICS.filter((c) => c.rarity === rarity && !owned.has(c.id) && (chestKey === 'elite' || !ELITE_ONLY.has(c.id)));
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)].id;
        owned.add(pick);
        g.cosmetics.push({ won, given: pick, swap: 'swapped' });
      } else {
        const f = ALL_OWNED_FRAGMENTS[rarity];
        g.star_fragments += f;
        g.cosmetics.push({ won, given: null, swap: 'fragments', fragments: f });
      }
    }
  }
  return g;
}

// Put a decided grant on the save, with its stamp, in ONE atomic step. Returns true if it wrote,
// false if the stamp was already there (nothing changed). Bumping save_data.updated_at makes the
// player's next sync adopt the cloud copy, the same as claimDailyLogin.
export async function atomicGrant(db: any, saveId: string, receiptId: string, granted: Granted): Promise<boolean> {
  const now = Date.now();
  const inc: Record<string, number> = {};
  if (granted.gold) inc['save_data.gold'] = Number(granted.gold);
  if (granted.star_fragments) inc['save_data.starFragments'] = Number(granted.star_fragments);
  const given = (granted.cosmetics || []).map((c) => c.given).filter((x): x is string => !!x);
  const addToSet: Record<string, unknown> = { [`save_data.${STAMP_KEY}`]: receiptId };
  if (given.length) addToSet['save_data.owned_chest_cosmetics'] = { $each: given };
  const op: Record<string, Record<string, unknown>> = { $addToSet: addToSet, $set: { 'save_data.updated_at': now, updated_at: now } };
  if (Object.keys(inc).length) op.$inc = inc;
  const res: any = await with429Retry(
    () => db.entities.PlayerSave.updateMany({ id: saveId, [`save_data.${STAMP_KEY}`]: { $ne: receiptId } }, op),
    'PlayerSave.updateMany',
  );
  return Number(res?.updated || 0) > 0;
}

export function hasStamp(saveData: any, receiptId: string): boolean {
  return Array.isArray(saveData?.[STAMP_KEY]) && saveData[STAMP_KEY].includes(receiptId);
}

export async function with429Retry<T>(fn: () => Promise<T>, label = 'op'): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await fn(); } catch (err: any) {
      lastErr = err;
      const status = err?.status || err?.response?.status;
      const msg = String(err?.message || '').toLowerCase();
      if (!(status === 429 || msg.includes('rate limit') || msg.includes('429')) || attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt + Math.random() * 200));
      console.warn(`[vipChests] ${label} 429 — retry ${attempt + 1}/3`);
    }
  }
  throw lastErr;
}

export function parseSave(record: any): any {
  return typeof record?.save_data === 'string' ? JSON.parse(record.save_data) : (record?.save_data || {});
}

export async function findSave(db: any, wallet: string): Promise<any | null> {
  const rows = await with429Retry(() => db.entities.PlayerSave.filter({ wallet_address: wallet }), 'PlayerSave.filter');
  return rows?.[0] || null;
}

// Grant a receipt onto the wallet's save (decides the grant first if the receipt has none yet), then
// re-read after a pause and put it back if a concurrent write undid it. Returns the outcome.
// recheck: the webhook waits and re-checks for a few seconds; the on-load path doesn't need to (it runs
// again next load).
export async function grantReceipt(db: any, receipt: any, opts: { recheck?: boolean } = { recheck: true }): Promise<'granted' | 'held' | 'already'> {
  const save = await findSave(db, receipt.wallet_address);
  if (!save) {
    if (receipt.status !== 'held') await db.entities.VipChestReceipt.update(receipt.id, { status: 'held' });
    return 'held';
  }
  const saveData = parseSave(save);
  let granted: Granted = receipt.granted;
  if (!granted || !Array.isArray(granted.cosmetics)) {
    granted = planGrant(receipt.items || [], saveData, receipt.chest_key || '');
    await db.entities.VipChestReceipt.update(receipt.id, { granted });
  }
  const wrote = await atomicGrant(db, save.id, receipt.open_receipt_id, granted);
  // Re-check: an old-style whole-save write that overlapped ours drops our stamp and grant together.
  // Put them back (the stamp condition makes this safe to repeat).
  let reapplied = 0;
  for (let i = 0; opts.recheck !== false && i < 3; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const again = await findSave(db, receipt.wallet_address);
    if (hasStamp(parseSave(again), receipt.open_receipt_id)) break;
    if (await atomicGrant(db, again.id, receipt.open_receipt_id, granted)) reapplied++;
  }
  await db.entities.VipChestReceipt.update(receipt.id, {
    status: 'granted',
    granted_at: receipt.granted_at || new Date().toISOString(),
    error: '',
    ...(reapplied ? { reapplied_count: Number(receipt.reapplied_count || 0) + reapplied } : {}),
  });
  return wrote ? 'granted' : 'already';
}

export function describeGrant(g: Granted | null | undefined): string {
  if (!g) return '';
  const parts: string[] = [];
  if (g.gold) parts.push(`${g.gold.toLocaleString('en-GB')} gold`);
  if (g.star_fragments) parts.push(`${g.star_fragments} star fragments`);
  for (const c of g.cosmetics || []) {
    if (c.swap === 'none') parts.push(cosmeticName(c.given));
    else if (c.swap === 'swapped') parts.push(`${cosmeticName(c.given)} (already had ${cosmeticName(c.won)})`);
    else parts.push(`+${c.fragments} fragments instead of ${cosmeticName(c.won)} (owns every one)`);
  }
  return parts.join(' · ');
}

// Discord ping to the chest channel. Never throws. Secret: DISCORD_CHEST_WEBHOOK.
export async function pingChestDiscord(content: string): Promise<void> {
  const url = Deno.env.get('DISCORD_CHEST_WEBHOOK');
  if (!url) { console.warn('[vipChests] DISCORD_CHEST_WEBHOOK not set — ping skipped:', content); return; }
  try {
    await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: content.slice(0, 1900), allowed_mentions: { parse: [] } }) });
  } catch (e) { console.warn('[vipChests] Discord ping failed:', (e as any)?.message); }
}

export function shortWallet(w: string): string {
  return w ? `${w.slice(0, 6)}…${w.slice(-4)}` : '?';
}
