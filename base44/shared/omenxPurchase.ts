// Direct REST call to OmenX's purchase endpoint.
//
// Replaces `sdk.createPurchase` from the `@omen.foundation/game-sdk` npm
// package. That package builds part of itself at runtime (eval / new Function),
// which the Deno isolate blocks — importing it makes a function fail to
// initialize, so no request ever reaches the handler. That silently killed
// purchases AND the scheduled settlement monitor.
//
// Error contract: we throw `Error("<status> <CODE> <raw body>")`. The raw JSON
// body is kept in the message on purpose — the settlement probes parse
// `"code":"..."` out of it, and purchaseSku matches on status/code substrings.
// This keeps every existing branch working exactly as it did under the SDK.

export interface OmenXPurchasePayload {
    playerWallet: string;
    skuId: string;
    quantity: number;
    idempotencyKey: string;
    paymentCurrency: string;
    paymentAmount: number;
}

export async function createPurchase(
    apiKey: string,
    apiBaseUrl: string,
    payload: OmenXPurchasePayload,
) {
    const base = (apiBaseUrl || 'https://api.omen.foundation').replace(/\/$/, '');
    const res = await fetch(`${base}/v1/purchases`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': payload.idempotencyKey,
        },
        body: JSON.stringify(payload),
    });
    const raw = await res.text();
    let body: any = null;
    try { body = raw ? JSON.parse(raw) : null; } catch {}
    if (!res.ok) {
        const code = body?.code || body?.error?.code || '';
        throw new Error(`${res.status} ${code} ${raw}`.trim());
    }
    return body;
}