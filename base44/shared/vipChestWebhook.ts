// The VIP chest webhook handler, separated from its HTTP shell so it can be driven with a test secret.
// The live shell (functions/onVipChestRewardGranted) passes the REAL secret from the app's secrets;
// nothing here reads a secret itself. Design: claude/handoffs/VIP_CHESTS.md. Grant logic: vipChests.ts.
//
// Omen's contract: HMAC-SHA256 over `${timestamp}.${rawBody}` (secret incl. whsec_), headers
// x-omenx-webhook-signature: sha256=<hex> and x-omenx-webhook-timestamp: <unix s>, ±5 min window.
// Idempotency key = open.openReceiptId (NOT the delivery id). Reply 2xx only after a durable write.
// Order, always: verify → write the receipt → decide → grant. A retry finds the receipt and does nothing.
import {
  normaliseItems, unknownSkus, grantReceipt, describeGrant, pingChestDiscord, shortWallet, with429Retry,
} from './vipChests.ts';

const WINDOW_SECONDS = 300;

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export type DeliveryResult = { status: number; body: Record<string, unknown> };
const ok = (body: Record<string, unknown>): DeliveryResult => ({ status: 200, body: { ok: true, ...body } });
const fail = (status: number, error: string): DeliveryResult => ({ status, body: { error } });

export async function handleDelivery(
  db: any, raw: string, headers: Headers, secret: string,
  ping: (msg: string) => Promise<void> = pingChestDiscord,
): Promise<DeliveryResult> {
  // 1. Verify. Nothing is written for a bad signature or a stale timestamp.
  const ts = headers.get('x-omenx-webhook-timestamp') || '';
  const sigHeader = headers.get('x-omenx-webhook-signature') || '';
  const given = sigHeader.startsWith('sha256=') ? sigHeader.slice(7) : '';
  const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(ts));
  if (!ts || !Number.isFinite(skew) || skew > WINDOW_SECONDS) return fail(401, 'timestamp outside window');
  if (!given || !safeEqual(given.toLowerCase(), await hmacHex(secret, `${ts}.${raw}`))) return fail(401, 'bad signature');

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return fail(400, 'bad json'); }
  if (payload?.event && payload.event !== 'vip_chest.reward_granted') return ok({ ignored: payload.event });

  const receiptId = String(payload?.open?.openReceiptId || '');
  const wallet = String(payload?.walletAddress || '').toLowerCase();
  if (!receiptId || !/^0x[0-9a-f]{40}$/.test(wallet)) return fail(400, 'missing openReceiptId or walletAddress');

  // 2. Receipt first. A retried delivery finds it and stops here.
  const existing: any[] = await with429Retry<any[]>(() => db.entities.VipChestReceipt.filter({ open_receipt_id: receiptId }), 'Receipt.filter');
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
      delivery_id: headers.get('x-omenx-delivery-id') || '',
      raw_body: raw,
    }), 'Receipt.create');
  } catch (e: any) {
    // Two copies of one delivery racing: the unique key refused the second. Treat as duplicate.
    const again: any[] = await db.entities.VipChestReceipt.filter({ open_receipt_id: receiptId }).catch(() => []);
    if (again.length) return ok({ duplicate: true, status: again[0].status });
    console.error('[vipChest] receipt write failed', e?.message);
    return fail(500, 'could not record'); // no durable write -> not 2xx
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
    await ping(`⚠️ **VIP chest needs Rob** — ${chest} for ${who}: ${error}. Nothing granted. Admin → VIP Chests.`);
    return ok({ status: 'needs_rob' });
  }

  // 4. Grant (or hold for a wallet with no save yet).
  try {
    const outcome = await grantReceipt(db, receipt);
    if (outcome === 'held') {
      await ping(`🎁 ${chest} for ${who} — **held** (never played yet; given on first login). ${receipt.reward_label}`);
      return ok({ status: 'held' });
    }
    const fresh = await db.entities.VipChestReceipt.get(receipt.id);
    await ping(`🎁 ${chest} for ${who} — granted: ${describeGrant(fresh?.granted)}`);
    return ok({ status: 'granted' });
  } catch (e: any) {
    // The receipt is durable, so this is still a 2xx — the admin list retries it.
    const error = String(e?.message || e).slice(0, 500);
    console.error('[vipChest] grant failed', error);
    await db.entities.VipChestReceipt.update(receipt.id, { status: 'failed', error }).catch(() => {});
    await ping(`❌ **VIP chest grant failed** — ${chest} for ${who}: ${error}. Retry from Admin → VIP Chests.`);
    return ok({ status: 'failed' });
  }
}
