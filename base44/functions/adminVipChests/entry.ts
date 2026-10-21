// adminVipChests — Admin → 🎁 VIP Chests. Lists chest receipts and retries / resolves the odd ones.
//   { action: 'list', filter?: 'attention' | 'all' }
//   { action: 'retry', id }      failed or held → try the grant again (same receipt, never pays twice)
//   { action: 'resolve', id, note } needs_rob → mark handled by hand (e.g. after a manual 🎁 grant)
// Auth: same as the other player-ops tools — 'edit_players' or 'owner' (session or admin key).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { grantReceipt, describeGrant, unknownSkus } from '../../shared/vipChests.ts';

const ATTENTION = ['needs_rob', 'failed', 'held', 'received'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    let caller = 'EMERGENCY_KEY';
    if (!(body.adminKey && body.adminKey === Deno.env.get('AdminDash'))) {
      let me: any = null;
      try { me = await base44.auth.me(); } catch { /* */ }
      if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      caller = String(me.wallet_address || '').toLowerCase();
      const rows = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: caller });
      const perms: string[] = rows[0]?.permissions || [];
      if (!perms.includes('edit_players') && !perms.includes('owner')) {
        return Response.json({ error: "Forbidden — 'edit_players' permission required" }, { status: 403 });
      }
    }
    const db = base44.asServiceRole;

    if (body.action === 'retry' || body.action === 'resolve') {
      const r = await db.entities.VipChestReceipt.get(String(body.id || '')).catch(() => null);
      if (!r) return Response.json({ error: 'Receipt not found' }, { status: 404 });

      if (body.action === 'resolve') {
        if (r.status !== 'needs_rob' && r.status !== 'failed') return Response.json({ error: `Only needs_rob / failed can be resolved (this is ${r.status})` }, { status: 400 });
        await db.entities.VipChestReceipt.update(r.id, { status: 'resolved', error: `${r.error || ''} | resolved by ${caller}: ${String(body.note || '').slice(0, 300)}` });
      } else {
        if (!['failed', 'held', 'received'].includes(r.status)) return Response.json({ error: `Nothing to retry (status ${r.status})` }, { status: 400 });
        if (unknownSkus(r.items || []).length) return Response.json({ error: 'Has unknown items — resolve by hand instead' }, { status: 400 });
        try {
          const outcome = await grantReceipt(db, r);
          if (outcome === 'held') return Response.json({ ok: true, status: 'held', note: 'Still no save for this wallet — it will be given on their first login.' });
        } catch (e: any) {
          await db.entities.VipChestReceipt.update(r.id, { status: 'failed', error: String(e?.message || e).slice(0, 500) });
          return Response.json({ error: `Retry failed: ${e?.message || e}` }, { status: 500 });
        }
      }
      await db.entities.AdminChangesLog.create({
        wallet_address: caller, action_type: 'player_action',
        description: `VIP chest ${body.action} for ${r.wallet_address}`,
        details: { receipt: r.open_receipt_id, from: r.status },
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    // list
    const query = body.filter === 'all' ? {} : { status: { $in: ATTENTION } };
    const rows = await db.entities.VipChestReceipt.filter(query, '-received_at', 200);
    return Response.json({
      receipts: rows.map((r: any) => ({
        id: r.id, status: r.status, wallet: r.wallet_address, chest: r.chest_name || r.chest_key,
        label: r.reward_label, granted: describeGrant(r.granted), banned: !!r.banned, testnet: !!r.is_testnet,
        seen: !!r.seen_by_player, reapplied: Number(r.reapplied_count || 0), error: r.error || '',
        received_at: r.received_at, granted_at: r.granted_at || '',
      })),
    });
  } catch (e: any) {
    console.error('[adminVipChests]', e?.message);
    return Response.json({ error: e?.message || 'failed' }, { status: 500 });
  }
});
