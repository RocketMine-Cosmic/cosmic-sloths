// getMyChestRewards — the signed-in player's VIP chest wins. Called by the game on load.
//   { action: 'list' }            → hands over HELD prizes (wallet had no save when the chest arrived),
//                                   puts back any grant whose stamp is missing from the save (an old-style
//                                   whole-save write undid it), and returns the wins not yet shown.
//   { action: 'seen', ids: [...] } → marks those wins as shown (own wins only).
// Design: claude/handoffs/VIP_CHESTS.md. Grant logic: shared/vipChests.ts.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { grantReceipt, atomicGrant, hasStamp, findSave, parseSave, describeGrant, cosmeticName, with429Retry, pingChestDiscord, shortWallet } from '../../shared/vipChests.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let me: any = null;
    try { me = await base44.auth.me(); } catch { /* not signed in */ }
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const wallet = String(me.wallet_address || '').toLowerCase();
    if (!wallet) return Response.json({ rewards: [] });

    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    if (body.action === 'seen') {
      const ids: string[] = Array.isArray(body.ids) ? body.ids.slice(0, 50).map(String) : [];
      let marked = 0;
      for (const id of ids) {
        const r = await db.entities.VipChestReceipt.get(id).catch(() => null);
        if (r && r.wallet_address === wallet && !r.seen_by_player) {
          await db.entities.VipChestReceipt.update(id, { seen_by_player: true });
          marked++;
        }
      }
      return Response.json({ marked });
    }

    const receipts = await with429Retry(() => db.entities.VipChestReceipt.filter({ wallet_address: wallet }), 'Receipt.filter');
    let saveChanged = false;

    // Held prizes → give them now if the save exists.
    for (const r of receipts.filter((x: any) => x.status === 'held')) {
      try {
        const outcome = await grantReceipt(db, r, { recheck: false });
        if (outcome !== 'held') {
          saveChanged = true;
          const fresh = await db.entities.VipChestReceipt.get(r.id);
          await pingChestDiscord(`🎁 Held ${r.chest_name || 'chest'} handed over to ${shortWallet(wallet)} on login: ${describeGrant(fresh?.granted)}`);
        }
      } catch (e: any) {
        await db.entities.VipChestReceipt.update(r.id, { status: 'failed', error: `held hand-over: ${String(e?.message || e).slice(0, 400)}` }).catch(() => {});
      }
    }

    // Granted wins whose stamp went missing → put back.
    const granted = receipts.filter((x: any) => x.status === 'granted' && x.granted);
    if (granted.length) {
      const save = await findSave(db, wallet);
      const data = save ? parseSave(save) : null;
      for (const r of granted) {
        if (!save || hasStamp(data, r.open_receipt_id)) continue;
        if (await atomicGrant(db, save.id, r.open_receipt_id, r.granted)) {
          saveChanged = true;
          await db.entities.VipChestReceipt.update(r.id, { reapplied_count: Number(r.reapplied_count || 0) + 1 });
          console.warn(`[getMyChestRewards] re-applied ${r.open_receipt_id} for ${wallet} (stamp was missing)`);
        }
      }
    }

    // Wins to show once, oldest first.
    const all = await with429Retry(() => db.entities.VipChestReceipt.filter({ wallet_address: wallet, status: 'granted', seen_by_player: false }), 'Receipt.filter');
    const rewards = all
      .sort((a: any, b: any) => String(a.received_at).localeCompare(String(b.received_at)))
      .map((r: any) => ({
        id: r.id,
        chest: r.chest_name || r.chest_key || 'VIP Chest',
        chest_key: r.chest_key || '',
        gold: Number(r.granted?.gold || 0),
        star_fragments: Number(r.granted?.star_fragments || 0),
        cosmetics: (r.granted?.cosmetics || []).map((c: any) => ({
          won: cosmeticName(c.won), given: c.given ? cosmeticName(c.given) : null, swap: c.swap, fragments: c.fragments || 0,
        })),
      }));

    return Response.json({ rewards, saveChanged });
  } catch (e: any) {
    console.error('[getMyChestRewards]', e?.message);
    return Response.json({ rewards: [], error: 'unavailable' }, { status: 200 });
  }
});
