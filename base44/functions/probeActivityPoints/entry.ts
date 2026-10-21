import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// PROBE — Omen activity points, run by hand before anything goes live (promised to Omen, 19 Sept).
// Admin only. One step per call, chosen by body.step, so each stage is its own click:
//   { "step": "keys" }      GET /v1/auth/me on each OMENX_POINTS_API_KEY* — scope present? (changes nothing)
//   { "step": "grant1" }    grant 1 point to the test wallet
//   { "step": "replay" }    send the SAME grant again — expect 200 duplicate:true, nothing credited
//   { "step": "over100" }   grant 101 — expect 400 GRANT_POINTS_FAILED (over per-grant max)
//   { "step": "notplayed" } grant 1 to a wallet that has never played — expect 404 PLAYER_NOT_FOUND
//   { "step": "ceiling" }   grant 100 at a time until the per-player ceiling (2,000) refuses — expect 400
// Optional body.wallet overrides the test wallet. Plan: claude/handoffs/ACTIVITY_POINTS.md.

const TEST_WALLET = '0xd2ebe0c69df70b97e3218fecffa8295a00dd9b21'; // Rob's own wallet (21 Oct)
const NEVER_PLAYED = '0x000000000000000000000000000000000000dead';
const KEY_NAMES = ['OMENX_POINTS_API_KEY', 'OMENX_POINTS_API_KEY_2', 'OMENX_POINTS_API_KEY_3', 'OMENX_POINTS_API_KEY_4'];

function baseUrl() {
    let b = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
    if (!b.startsWith('http')) b = `https://${b}`;
    return b.replace(/\/$/, '');
}

async function readBody(res: Response) {
    const text = await res.text().catch(() => '');
    try { return JSON.parse(text); } catch { return text.slice(0, 300); }
}

async function grant(key: string, wallet: string, amount: number, idemKey: string) {
    const res = await fetch(`${baseUrl()}/v1/activity/grant-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Idempotency-Key': idemKey },
        body: JSON.stringify({ wallet, amount, questId: 'probe' }),
    });
    return { status: res.status, retryAfter: res.headers.get('retry-after'), warning: res.headers.get('warning'), body: await readBody(res) };
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    let me = null;
    try { me = await base44.auth.me(); } catch {}
    if (!me || me.role !== 'admin') return Response.json({ error: 'admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const step = body.step;
    const wallet = String(body.wallet || TEST_WALLET).toLowerCase();
    const key = Deno.env.get('OMENX_POINTS_API_KEY');
    const day = new Date().toISOString().slice(0, 10);

    try {
        if (step === 'keys') {
            const out = [];
            for (const name of KEY_NAMES) {
                const k = Deno.env.get(name);
                if (!k) { out.push({ key: name, status: 'not set' }); continue; }
                const res = await fetch(`${baseUrl()}/v1/auth/me`, { headers: { 'Authorization': `Bearer ${k}` } });
                const b: any = await readBody(res);
                const d = b?.data || b;
                out.push({
                    key: name, status: res.status, keyName: d?.keyName, environment: d?.environment,
                    hasActivityScope: Array.isArray(d?.scopes) ? d.scopes.includes('activity_points:write') : null,
                    scopes: d?.scopes, rateLimit: d?.rateLimit,
                });
            }
            return Response.json({ step, out });
        }
        if (!key) return Response.json({ error: 'OMENX_POINTS_API_KEY not set' }, { status: 500 });

        if (step === 'grant1' || step === 'replay') {
            // Same key both times on the same day, so "replay" must come back as a duplicate.
            const r = await grant(key, wallet, 1, `ap-probe-grant1-${day}-${wallet}`);
            return Response.json({ step, wallet, expect: step === 'grant1' ? '200, credited 1' : '200, duplicate true', ...r });
        }
        if (step === 'over100') {
            const r = await grant(key, wallet, 101, `ap-probe-over100-${day}-${wallet}`);
            return Response.json({ step, wallet, expect: '400 GRANT_POINTS_FAILED (over max per grant)', ...r });
        }
        if (step === 'notplayed') {
            const r = await grant(key, NEVER_PLAYED, 1, `ap-probe-notplayed-${day}-${NEVER_PLAYED}`);
            return Response.json({ step, wallet: NEVER_PLAYED, expect: '404 PLAYER_NOT_FOUND', ...r });
        }
        if (step === 'ceiling') {
            const tries = [];
            let total = 0;
            for (let i = 1; i <= 25; i++) {
                const r = await grant(key, wallet, 100, `ap-probe-ceiling-${day}-${i}-${wallet}`);
                const credited = Number((r.body as any)?.data?.credited || 0);
                total += credited;
                tries.push({ n: i, status: r.status, credited, error: (r.body as any)?.error });
                if (r.status !== 200) break;
                await new Promise(res => setTimeout(res, 700)); // stay well under any rate limit
            }
            return Response.json({ step, wallet, expect: 'grants of 100 until a 400 names the per-player ceiling', creditedThisStep: total, tries });
        }
        return Response.json({ error: 'body.step must be one of keys, grant1, replay, over100, notplayed, ceiling' }, { status: 400 });
    } catch (e) {
        return Response.json({ step, error: String((e as any)?.message || e) }, { status: 500 });
    }
});
