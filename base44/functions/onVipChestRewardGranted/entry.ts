// onVipChestRewardGranted — Omen Arcade VIP chest webhook (vip_chest.reward_granted).
// URL for the Omen dev portal: https://cosmic-sloths.com/functions/onVipChestRewardGranted
// Design + Rob's decisions: claude/handoffs/VIP_CHESTS.md (21 Oct 2026). Grant logic: shared/vipChests.ts.
//
// Omen's contract: HMAC-SHA256 over `${timestamp}.${rawBody}` (secret incl. whsec_), headers
// x-omenx-webhook-signature: sha256=<hex> and x-omenx-webhook-timestamp: <unix s>, ±5 min window.
// Idempotency key = open.openReceiptId (NOT the delivery id). Reply 2xx only after a durable write.
//
// Order, always: verify → write the receipt → decide → grant. A retry finds the receipt and does nothing.
// Secrets: OMENX_VIP_CHEST_WEBHOOK_SECRET (same value as the Omen portal), DISCORD_CHEST_WEBHOOK.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import {
  normaliseItems, unknownSkus, grantReceipt, describeGrant, pingChestDiscord, shortWallet, with429Retry,
} from '../../shared/vipChests.ts';

const WINDOW_SECONDS = 300;

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time compare of two hex strings.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const ok = (body: Record<string, unknown>) => Response.json({ ok: true, ...body }, { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });

  const secret = Deno.env.get('OMENX_VIP_CHEST_WEBHOOK_SECRET');
  if (!secret) {
    // Not configured yet. 503 so Omen's side shows a failure rather than a silent success.
    console.error('[vipChest] OMENX_VIP_CHEST_WEBHOOK_SECRET is not set');
    return Response.json({ error: 'not configured' }, { status: 503 });
  }

  // 1. Verify. Nothing is written for a bad signature.
  const raw = await req.text();
  const ts = req.headers.get('x-omenx-webhook-timestamp') || '';
  const sigHeader = req.headers.get('x-omenx-webhook-signature') || '';
  const given = sigHeader.startsWith('sha256=') ? sigHeader.slice(7) : '';
  const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(ts));
  if (!ts || !Number.isFinite(skew) || skew > WINDOW_SECONDS) {
    return Response.json({ error: 'timestamp outside window' }, { status: 401 });
  }
  if (!given || !safeEqual(given.toLowerCase(), await hmacHex(secret, `${ts}.${raw}`))) {
    return Response.json({ error: 'bad signature' }, { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  if (payload?.event && payload.event !== 'vip_chest.reward_granted') return ok({ ignored: payload.event });

  const receiptId = String(payload?.open?.openReceiptId || '');
  const wallet = String(payload?.walletAddress || '').toLowerCase();
  if (!receiptId || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return Response.json({ error: 'missing openReceiptId or walletAddress' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  // 2. Receipt first. A retried delivery finds it and stops here.
  const existing = await with429Retry(() => db.entities.VipChestReceipt.filter({ open_receipt_id: receiptId }), 'Receipt.filter');
  if (existing.length) return ok({ duplicate: true, status: existing[0].status });

  const items = normaliseItems(payload?.reward?.rewardPayload);
  const isTestnet = payload?.open?.isTestnet === true;
  let banned = false;
  try { banned = (await db.entities.BlacklistedWallet.filter({ wallet_address: wallet })).length > 0; } catch { /* non-fatal */ }

  let receipt: any;
  try {
    receipt = await with429Retry(() => db.entities.VipChestReceipt.create({
      open_receipt_id: receiptId,
      wallet_address: wallet,
      chest_key: String(payload?.open?.chestKey || ''),
      chest_name: String(payload?.open?.chestDisplayName || ''),
      is_testnet: isTestnet,
      reward_label: String(payload?.reward?.displayLabel || ''),
      items: items || [],
      status: 'received',
      banned,
      seen_by_player: false,
      received_at: new Date().toISOString(),
      delivery_id: req.headers.get('x-omenx-delivery-id') || '',
      raw_body: raw,
    }), 'Receipt.create');
  } catch (e: any) {
    // Two copies of the same delivery racing: the unique key refused the second. Treat as duplicate.
    const again = await db.entities.VipChestReceipt.filter({ open_receipt_id: receiptId }).catch(() => []);
    if (again.length) return ok({ duplicate: true, status: again[0].status });
    console.error('[vipChest] receipt write failed', e?.message);
    return Response.json({ error: 'could not record' }, { status: 500 }); // no durable write -> not 2xx
  }

  const who = `${shortWallet(wallet)}${banned ? ' (banned wallet)' : ''}`;
  const chest = receipt.chest_name || receipt.chest_key || 'Chest';

  // 3. Decide.
  if (isTestnet) {
    await db.entities.VipChestReceipt.update(receipt.id, { status: 'test' });
    return ok({ status: 'test' });
  }
  const unknown = items ? unknownSkus(items) : ['(unreadable reward)'];
  if (!items || unknown.length) {
    const error = `unknown item(s): ${unknown.join(', ')}`;
    await db.entities.VipChestReceipt.update(receipt.id, { status: 'needs_rob', error });
    await pingChestDiscord(`⚠️ **VIP chest needs Rob** — ${chest} for ${who}: ${error}. Nothing granted. Admin → VIP chests.`);
    return ok({ status: 'needs_rob' });
  }

  // 4. Grant (or hold for a wallet with no save yet).
  try {
    const outcome = await grantReceipt(db, receipt);
    if (outcome === 'held') {
      await pingChestDiscord(`🎁 ${chest} for ${who} — **held** (never played yet; given on first login). ${receipt.reward_label}`);
      return ok({ status: 'held' });
    }
    const fresh = await db.entities.VipChestReceipt.get(receipt.id);
    await pingChestDiscord(`🎁 ${chest} for ${who} — granted: ${describeGrant(fresh?.granted)}`);
    return ok({ status: 'granted' });
  } catch (e: any) {
    // The receipt is durable, so this is still a 2xx — the admin list retries it.
    const error = String(e?.message || e).slice(0, 500);
    console.error('[vipChest] grant failed', error);
    await db.entities.VipChestReceipt.update(receipt.id, { status: 'failed', error }).catch(() => {});
    await pingChestDiscord(`❌ **VIP chest grant failed** — ${chest} for ${who}: ${error}. Retry from Admin → VIP chests.`);
    return ok({ status: 'failed' });
  }
});
