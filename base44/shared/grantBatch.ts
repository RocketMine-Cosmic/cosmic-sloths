// ONE PLACE that sends a rank band to Omen's grant-batch, and replays a band whose answer never came.
// Used by manuallyDistributeRewards and distributeKillPool (T-002, 2 Nov 2026).
//
// Why: on 26 Oct (W43) the kill payout sent rank 3 to Omen and got no answer for ~110 s. The payment had
// landed on chain ~45 s in; Omen's reply was simply late. Base44's HTTP edge cuts any server-to-server call
// at 120 s, so the whole step died, rank 3 was left "maybe paid" and ranks 4–10 waited for Rob.
//
// What Omen promises (checked 2 Nov 2026 in @omen.foundation/game-sdk 2.4.0, API_ENDPOINTS.md "Game rewards"
// and CHANGELOG): grant-batch's idempotencyKey is scoped per (gameId, key) and matched against the whole
// recipient set. Re-sending the SAME batch with the SAME key returns the original result (200, replayed: true)
// and never pays again; the same key with different recipients/amounts answers 409 IDEMPOTENCY_KEY_REUSED.
// A grant Omen stopped waiting for answers 502 GRANT_PENDING — "retry with the same idempotencyKey to read the
// outcome. Never resend under a new key." 409 GRANT_NOT_REPLAYABLE means reconcile, not "unpaid".
//
// So: give every send its own timeout (well under the 120 s edge), treat any answer that is not a clear yes or
// a clear no as UNCLEAR (pending rows stay, exactly as before), and resolve an unclear band later by re-sending
// the byte-for-byte same batch and key. Only a 2xx from Omen ever marks a band paid.

export const OMEN_FETCH_TIMEOUT_MS = 50_000;

// Bands sent before the idempotency key went live (K-B8, 21 Oct 2026) must NEVER be replayed: Omen would not
// know the key and would pay them again. Markers carry Date.now(); anything older than this is left for Rob.
export const KEYED_SINCE_MS = Date.UTC(2026, 9, 22); // 22 Oct 2026 00:00 UTC

// Omen's "never pay twice" key for grant-batch (K-B8). Same batch (same wallets, same amounts) -> same key.
// Moved here unchanged from the two payout functions so the send and the replay can never disagree.
export async function batchIdempotencyKey(prefix: string, payments: { walletAddress: string, amount: number }[]) {
    const s = payments.map(p => `${String(p.walletAddress).toLowerCase()}:${p.amount}`).sort().join(',');
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    const h = [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${prefix}-${h}`.replace(/[^A-Za-z0-9:_-]/g, '-').slice(0, 128);
}

export type GrantOutcome = {
    outcome: 'paid' | 'rejected' | 'unclear';
    status: number;          // HTTP status, 0 for timeout / network
    txId: string;
    code: string;            // Omen error code, 'TIMEOUT' or 'NETWORK'
    replayed: boolean;
    detail: string;
    request: string;         // the exact JSON body sent (tests compare send vs replay)
};

// Sends one grant-batch. 'paid' = Omen said yes (2xx). 'rejected' = Omen said a clear no before paying
// (400/401/403/429 etc.) — safe to delete the pending rows and try again later. 'unclear' = anything else:
// timeout, network, 5xx (incl. 502 GRANT_PENDING), 409 (key reused / not replayable), 422 (stored failure) —
// pending rows stay and a person or a replay decides.
export async function sendGrantBatch(opts: {
    apiBaseUrl: string, apiKey: string, gameId: string, gameName: string, note: string,
    payments: { walletAddress: string, amount: number }[], idempotencyKey: string,
    timeoutMs?: number, fetchImpl?: typeof fetch,
}): Promise<GrantOutcome> {
    const doFetch = opts.fetchImpl || fetch;
    const request = JSON.stringify({
        payments: opts.payments.map(p => ({ walletAddress: p.walletAddress, amount: p.amount })),
        gameId: opts.gameId, gameName: opts.gameName, note: opts.note,
        idempotencyKey: opts.idempotencyKey,
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? OMEN_FETCH_TIMEOUT_MS);
    let res: Response;
    try {
        res = await doFetch(`${opts.apiBaseUrl}/v1/game-rewards/grant-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${opts.apiKey}` },
            body: request,
            signal: ctrl.signal,
        });
    } catch (e: any) {
        clearTimeout(timer);
        const timedOut = ctrl.signal.aborted;
        return { outcome: 'unclear', status: 0, txId: '', code: timedOut ? 'TIMEOUT' : 'NETWORK', replayed: false,
            detail: timedOut ? `no answer from Omen within ${Math.round((opts.timeoutMs ?? OMEN_FETCH_TIMEOUT_MS) / 1000)} s` : String(e?.message || e), request };
    }
    let body: any = {};
    try { body = await res.json(); } catch { body = {}; }
    clearTimeout(timer);
    const code = String(body?.error?.code || body?.code || '');
    const detail = JSON.stringify(body).slice(0, 400);
    if (res.ok) {
        return { outcome: 'paid', status: res.status, txId: String(body?.transactionId || body?.txHash || ''), code: '',
            replayed: body?.replayed === true, detail, request };
    }
    if (res.status >= 500 || res.status === 409 || res.status === 422 || res.status === 408) {
        return { outcome: 'unclear', status: res.status, txId: '', code, replayed: false, detail, request };
    }
    return { outcome: 'rejected', status: res.status, txId: '', code, replayed: false, detail, request };
}

// pending-<period>-<ms>-[kills-]<band>  ->  { ms, band }
export function parseMarker(marker: string, period_id: string) {
    const prefix = `pending-${period_id}-`;
    if (!marker.startsWith(prefix)) return null;
    const m = marker.slice(prefix.length).match(/^(\d{10,})-(?:kills-)?(.+)$/);
    if (!m) return null;
    return { ms: Number(m[1]), band: m[2] };
}

// Re-sends ONE "maybe paid" band exactly as it was first sent (same wallets in rank order, same amounts, same
// key, same note) and, if Omen answers yes, writes the transaction onto those rows. Never creates or deletes
// a row, never pays anyone who was not in the original band.
export async function replayPendingBand(db: any, opts: {
    period_id: string, period_type: string, marker: string,
    apiBaseUrl: string, apiKey: string, gameId: string, gameName: string,
    noteFor: (band: string, rows: any[]) => string,
    timeoutMs?: number, fetchImpl?: typeof fetch,
}) {
    const parsed = parseMarker(opts.marker, opts.period_id);
    if (!parsed) return { resolved: false, final: true, reason: `not a band marker this job can replay: ${opts.marker}` };
    if (!(parsed.ms >= KEYED_SINCE_MS)) return { resolved: false, final: true, reason: `band was sent before Omen's idempotency key went live (K-B8) — replaying could pay twice; check it by hand` };
    if (parsed.band === 'staff') return { resolved: false, final: true, reason: 'staff band — check it by hand' };
    const rows = await db.entities.PayoutLog.filter({ period_id: opts.period_id, period_type: opts.period_type, tx_id: opts.marker }, 'rank', 100);
    if (!rows || rows.length === 0) return { resolved: true, final: true, reason: 'nothing pending under that marker any more', rows: 0 };
    const sorted = [...rows].sort((a: any, b: any) => Number(a.rank || 0) - Number(b.rank || 0));
    const payments = sorted.map((r: any) => ({ walletAddress: r.wallet_address, amount: Number(r.amount) }));
    const idempotencyKey = await batchIdempotencyKey(`cs-${opts.period_type}-${opts.period_id}-${parsed.band}`, payments);
    const ans = await sendGrantBatch({
        apiBaseUrl: opts.apiBaseUrl, apiKey: opts.apiKey, gameId: opts.gameId, gameName: opts.gameName,
        note: opts.noteFor(parsed.band, sorted), payments, idempotencyKey, timeoutMs: opts.timeoutMs, fetchImpl: opts.fetchImpl,
    });
    if (ans.outcome === 'paid') {
        for (const r of sorted) { try { await db.entities.PayoutLog.update(r.id, { tx_id: ans.txId || `replay-confirmed-${opts.marker.slice(8)}` }); } catch {} }
        return { resolved: true, final: true, rows: sorted.length, band: parsed.band, tx_id: ans.txId, replayed: ans.replayed, idempotencyKey, request: ans.request };
    }
    // 409 (key reused / not replayable) and 422 (stored failure) will not change by waiting: hand to Rob.
    // A 429 (rate limit) is worth waiting out; any other clear refusal is not.
    const final = (ans.outcome === 'rejected' && ans.status !== 429) || ans.status === 409 || ans.status === 422;
    return { resolved: false, final, rows: sorted.length, band: parsed.band, status: ans.status, code: ans.code,
        reason: `replay answered ${ans.status || ans.code}: ${ans.detail}`, idempotencyKey, request: ans.request };
}
