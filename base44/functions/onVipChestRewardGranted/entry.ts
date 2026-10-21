// onVipChestRewardGranted — Omen Arcade VIP chest webhook (vip_chest.reward_granted).
// URL for the Omen dev portal: https://cosmic-sloths.com/functions/onVipChestRewardGranted
// Design + Rob's decisions: claude/handoffs/VIP_CHESTS.md (21 Oct 2026).
// This is only the HTTP shell: it reads the REAL secret and hands everything to
// shared/vipChestWebhook.ts (verify → receipt → decide → grant), whose grant logic is shared/vipChests.ts.
// Secrets (Rob sets these): OMENX_VIP_CHEST_WEBHOOK_SECRET (same value as the Omen portal — never
// regenerate it during the switch), DISCORD_CHEST_WEBHOOK (the chest channel).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { handleDelivery } from '../../shared/vipChestWebhook.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });
  const secret = Deno.env.get('OMENX_VIP_CHEST_WEBHOOK_SECRET');
  if (!secret) {
    // Not configured yet. 503 so Omen's side shows a failure rather than a silent success.
    console.error('[vipChest] OMENX_VIP_CHEST_WEBHOOK_SECRET is not set');
    return Response.json({ error: 'not configured' }, { status: 503 });
  }
  const raw = await req.text();
  const db = createClientFromRequest(req).asServiceRole;
  const { status, body } = await handleDelivery(db, raw, req.headers, secret);
  return Response.json(body, { status });
});
