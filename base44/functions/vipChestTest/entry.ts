// vipChestTest — THROWAWAY TEST HARNESS (21 Oct 2026). Delete once VIP chests are live.
// Drives the REAL handler (shared/vipChestWebhook.ts) with a TEST secret against two made-up wallets,
// captures the Discord messages instead of sending them, and deletes everything it created.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { handleDelivery } from '../../shared/vipChestWebhook.ts';
import { grantReceipt, atomicGrant, hasStamp, findSave, parseSave, CHEST_COSMETICS, STAMP_KEY } from '../../shared/vipChests.ts';

const KEY = 'chest-test-21oct-b71e';
const SECRET = 'whsec_test_harness_only_0000000000000000000000000000000000000000';
const W1 = '0x00000000000000000000000000000000c0ffee01'; // has a save
const W2 = '0x00000000000000000000000000000000c0ffee02'; // never played
const PREFIX = 'TEST-21OCT-';

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const item = (sku: string, quantity = 1) => ({ kind: 'product', sku, grantType: 'consumable', ...(quantity > 1 ? { quantity } : {}) });
function body(id: string, wallet: string, chestKey: string, items: any[], testnet = false) {
  return JSON.stringify({
    event: 'vip_chest.reward_granted', deliveryId: crypto.randomUUID(), timestamp: new Date().toISOString(), walletAddress: wallet,
    open: { openReceiptId: PREFIX + id, chestKey, chestDisplayName: `${chestKey[0].toUpperCase()}${chestKey.slice(1)} Chest`, isTestnet: testnet, openedAt: new Date().toISOString() },
    reward: { rewardType: 'DEVELOPER_GAME_REWARD', displayLabel: `test ${id}`, rewardPayload: { kind: 'bundle', items } },
  });
}
async function headers(raw: string, opts: { badSig?: boolean; tsOffset?: number } = {}) {
  const ts = String(Math.floor(Date.now() / 1000) + (opts.tsOffset || 0));
  const sig = await hmacHex(opts.badSig ? 'whsec_wrong' : SECRET, `${ts}.${raw}`);
  return new Headers({ 'x-omenx-webhook-timestamp': ts, 'x-omenx-webhook-signature': `sha256=${sig}`, 'x-omenx-delivery-id': 'test' });
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;
  const reqBody = await req.json().catch(() => ({}));
  if (reqBody.key !== KEY) return Response.json({ error: 'no' }, { status: 403 });

  const pings: string[] = [];
  const ping = async (m: string) => { pings.push(m); };
  const R: Record<string, unknown> = {};
  const snap = async (w: string) => {
    const s = await findSave(db, w); if (!s) return null;
    const d = parseSave(s);
    return { gold: d.gold, frags: d.starFragments, owned: d.owned_chest_cosmetics, stamps: (d[STAMP_KEY] || []).length };
  };
  const receipt = async (id: string) => (await db.entities.VipChestReceipt.filter({ open_receipt_id: PREFIX + id }))[0] || null;
  const deliver = async (id: string, w: string, chest: string, items: any[], o: any = {}) => {
    const raw = body(id, w, chest, items, o.testnet);
    return handleDelivery(db, raw, await headers(raw, o), SECRET, ping);
  };
  const cleanup = async () => {
    for (const r of await db.entities.VipChestReceipt.filter({ wallet_address: { $in: [W1, W2] } })) await db.entities.VipChestReceipt.delete(r.id);
    for (const w of [W1, W2]) { const s = await findSave(db, w); if (s) await db.entities.PlayerSave.delete(s.id); }
  };

  try {
    await cleanup();
    await db.entities.PlayerSave.create({ wallet_address: W1, save_data: { gold: 1000, starFragments: 10, owned_chest_cosmetics: [] }, updated_at: Date.now() });
    const GOLD = [item('chest-ingame-gold-50k'), item('chest_animated_pilot_orbiting_moon'), item('ingame-star-fragments-10')];

    R.s01_bad_signature = (await deliver('bad', W1, 'gold', GOLD, { badSig: true })).status;
    R.s02_stale_timestamp = (await deliver('stale', W1, 'gold', GOLD, { tsOffset: -400 })).status;
    R.s02_receipts_written = (await db.entities.VipChestReceipt.filter({ wallet_address: W1 })).length; // expect 0
    R.s03_testnet = (await deliver('testnet', W1, 'gold', GOLD, { testnet: true })).body;
    R.s04_unknown = (await deliver('unknown', W1, 'gold', [item('chest-ingame-gold-50k'), item('mystery-thing')])).body;
    R.s04_save = await snap(W1); // expect untouched 1000 / 10 / []

    R.s05_gold_chest = (await deliver('gold1', W1, 'gold', GOLD)).body;
    R.s05_save = await snap(W1); // expect 51000 / 160 / [moon] / 1 stamp
    R.s06_same_again = (await deliver('gold1', W1, 'gold', GOLD)).body;
    R.s06_save = await snap(W1); // unchanged

    R.s07_duplicate_moon = (await deliver('gold2', W1, 'gold', GOLD)).body;
    R.s07_granted = (await receipt('gold2'))?.granted;          // expect swap 'swapped' to another epic
    R.s07_save = await snap(W1);                                  // 101000 / 310 / 2 cosmetics

    // Own every epic -> epic duplicate falls back to 150 fragments.
    const s = await findSave(db, W1); const d = parseSave(s);
    d.owned_chest_cosmetics = CHEST_COSMETICS.filter((c) => c.rarity === 'epic').map((c) => c.id)
      .concat(CHEST_COSMETICS.filter((c) => c.rarity === 'mythic' && c.id !== 'lb_frame_eclipse_crown').map((c) => c.id));
    await db.entities.PlayerSave.update(s.id, { save_data: d });
    R.s08_all_epics = (await deliver('gold3', W1, 'gold', GOLD)).body;
    R.s08_granted = (await receipt('gold3'))?.granted;           // expect fragments 150 + 150 = 300 total
    // Owns every mythic except Eclipse Crown (Elite-only) -> a Diamond duplicate must NOT get the Crown.
    R.s09_diamond_dup = (await deliver('dia1', W1, 'diamond', [item('chest-ingame-gold-100k'), item('ingame-star-fragments-10', 3), item('chest_kill_fx_supernova')])).body;
    R.s09_granted = (await receipt('dia1'))?.granted;             // expect fragments fallback 450 (+450 = 900)
    R.s09_save = await snap(W1);

    // Race: an old-style writer reads the save, our grant lands, the old writer writes its stale copy back.
    const before = parseSave(await findSave(db, W1)); const sid = (await findSave(db, W1)).id;
    const p = deliver('race1', W1, 'bronze', [item('chest-ingame-gold-10k'), item('ingame-star-fragments')]);
    await new Promise((r) => setTimeout(r, 1200));
    await db.entities.PlayerSave.update(sid, { save_data: before }); // the clobber
    R.s10_race = (await p).body;
    R.s10_receipt = { status: (await receipt('race1'))?.status, reapplied: (await receipt('race1'))?.reapplied_count };
    R.s10_save = await snap(W1);                                  // expect gold = before.gold + 10000 exactly

    // Backstop on load: wipe a granted chest after the receiver finished; the load path must put it back once.
    const pre = parseSave(await findSave(db, W1));
    await deliver('load1', W1, 'bronze', [item('chest-ingame-gold-10k'), item('ingame-star-fragments')]);
    await db.entities.PlayerSave.update(sid, { save_data: pre });      // undo it
    const r1 = await receipt('load1');
    const missing = !hasStamp(parseSave(await findSave(db, W1)), r1.open_receipt_id);
    const put1 = await atomicGrant(db, sid, r1.open_receipt_id, r1.granted);
    const put2 = await atomicGrant(db, sid, r1.open_receipt_id, r1.granted); // second time must do nothing
    R.s11_backstop = { stamp_missing_after_wipe: missing, first_putback: put1, second_putback: put2 };
    R.s11_save = await snap(W1); R.s11_expect_gold = Number(pre.gold) + 10000;

    // Held: never-played wallet, then a save appears and the on-load path hands it over.
    R.s12_held = (await deliver('held1', W2, 'bronze', [item('chest-ingame-gold-10k'), item('ingame-star-fragments')])).body;
    await db.entities.PlayerSave.create({ wallet_address: W2, save_data: { gold: 0 }, updated_at: Date.now() });
    R.s12_handover = await grantReceipt(db, await receipt('held1'), { recheck: false });
    R.s12_save = await snap(W2);                                   // expect 10000 / 15

    R.pings = pings;
  } catch (e: any) {
    R.error = String(e?.stack || e?.message || e);
  } finally {
    try { await cleanup(); R.cleaned = true; } catch (e: any) { R.cleaned = String(e?.message || e); }
  }
  return Response.json(R);
});
