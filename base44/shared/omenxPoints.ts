// Omen activity points — the grant side (added 2026-10-21).
//
// Plan and the reasons behind it: project doc claude/handoffs/ACTIVITY_POINTS.md.
// Omen contract (read from the live docs 21 Oct, proven by probeActivityPoints the same day):
//   POST /v1/activity/grant-points  { wallet, amount, questId? }  header Idempotency-Key
//   200 { data: { credited, duplicate, ... } }   a replay is 200 duplicate:true and credits nothing
//   400 GRANT_POINTS_FAILED  final refusal; the MESSAGE says why (over 100, wallet ceiling, pool empty,
//                            daily cap, granting paused)
//   404 PLAYER_NOT_FOUND     final (not played / unknown wallet). Not enforced by Omen on 21 Oct — a
//                            never-played wallet was credited — but handled anyway.
//   429 / 503                nothing applied; wait, then retry WITH THE SAME KEY
//
// Rules this file keeps:
//   - Points are a bonus. grantActivityPoints never throws, and callers wrap it in grantSafely, so a
//     points problem can never fail a login, bounty, task or payout.
//   - Log first: a PointGrantLog row exists (pending) before Omen is called, keyed by the same
//     deterministic idempotency key, so a crash mid-call is found and retried with the same key.
//   - Our own caps are checked before calling Omen (we promised Omen we would not use their refusals
//     as flow control).
//   - Off unless AppConfig 'points_config'.enabled is true.

export const POINTS_CONFIG_KEY = 'points_config';

export const DEFAULT_POINTS_CONFIG = {
    enabled: false,
    amounts: {
        login: 10, bounties: 10, tasks: 10, mission: 5,
        streak3: 25, streak7: 50, streak14: 100, streak30: 100,
        // weekly boards: [1st, 2nd, 3rd, 4th-10th]
        wscore: [100, 75, 50, 25], wkills: [100, 75, 50, 25],
        war: 10, champs: 100,
    },
    guards: {
        monthly_pool: 45000,        // of Omen's 50,000
        per_player_month: 1900,     // of Omen's 2,000
        per_player_day: 135,        // daily-loop events only: a perfect day (35) + a 100 streak day
    },
};

export const STREAK_MILESTONES = [3, 7, 14, 30];
export const DAILY_EVENTS = ['login', 'bounties', 'tasks', 'mission', 'streak3', 'streak7', 'streak14', 'streak30'];

const KEY_NAMES = ['OMENX_POINTS_API_KEY', 'OMENX_POINTS_API_KEY_2', 'OMENX_POINTS_API_KEY_3', 'OMENX_POINTS_API_KEY_4'];

export function utcDay(d: Date = new Date()): string {
    return d.toISOString().slice(0, 10);
}
export function utcMonth(d: Date = new Date()): string {
    return d.toISOString().slice(0, 7);
}
// dayKey minus n days, as YYYY-MM-DD.
export function daysBefore(dayKey: string, n: number): string {
    const d = new Date(`${dayKey}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - n);
    return utcDay(d);
}

export async function loadPointsConfig(db: any) {
    try {
        const rows = await db.entities.AppConfig.filter({ key: POINTS_CONFIG_KEY });
        const v = rows?.[0]?.value || {};
        return {
            enabled: v.enabled === true,
            amounts: { ...DEFAULT_POINTS_CONFIG.amounts, ...(v.amounts || {}) },
            guards: { ...DEFAULT_POINTS_CONFIG.guards, ...(v.guards || {}) },
        };
    } catch (e) {
        console.warn('[omenxPoints] config read failed, points off:', (e as any)?.message || e);
        return { ...DEFAULT_POINTS_CONFIG, enabled: false };
    }
}

function baseUrl() {
    let b = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
    if (!b.startsWith('http')) b = `https://${b}`;
    return b.replace(/\/$/, '');
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type OmenAnswer = { kind: 'granted' | 'refused' | 'not_in_game' | 'error'; credited: number; reason: string; attempts: number };

// Calls Omen with the same Idempotency-Key on every attempt. On 429/503 it waits first, then moves to
// the next key (Rob's experience is that keys add capacity; Omen's docs say they share one bucket —
// waiting covers either case).
async function callOmen(wallet: string, amount: number, idemKey: string, event: string): Promise<OmenAnswer> {
    const keys = KEY_NAMES.map(n => Deno.env.get(n)).filter(Boolean) as string[];
    if (keys.length === 0) return { kind: 'error', credited: 0, reason: 'no OMENX_POINTS_API_KEY set', attempts: 0 };
    let last = 'no answer';
    const maxAttempts = 4;
    for (let i = 0; i < maxAttempts; i++) {
        const key = keys[i % keys.length];
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        try {
            const res = await fetch(`${baseUrl()}/v1/activity/grant-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Idempotency-Key': idemKey },
                body: JSON.stringify({ wallet, amount, questId: event }),
                signal: ctrl.signal,
            });
            clearTimeout(timer);
            let body: any = null;
            try { body = await res.json(); } catch {}
            const code = body?.error?.code || '';
            const msg = body?.error?.message || '';
            if (res.status === 200 || res.status === 201) {
                const credited = Number(body?.data?.credited ?? amount);
                const dup = body?.data?.duplicate === true;
                return { kind: 'granted', credited, reason: dup ? 'duplicate (already credited earlier)' : '', attempts: i + 1 };
            }
            if (res.status === 400) return { kind: 'refused', credited: 0, reason: `${code}: ${msg}`.slice(0, 400), attempts: i + 1 };
            if (res.status === 404) return { kind: 'not_in_game', credited: 0, reason: `${code}: ${msg}`.slice(0, 400), attempts: i + 1 };
            last = `${res.status} ${code}: ${msg}`.slice(0, 400);
            if (res.status === 429 || res.status === 503) {
                const ra = Number(res.headers.get('retry-after'));
                await sleep(Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1000, 3000));
                continue;
            }
            // 401/403 (key problem) or 5xx: try the next key after a short pause.
            await sleep(300);
        } catch (e) {
            clearTimeout(timer);
            last = `network: ${(e as any)?.message || e}`.slice(0, 400);
            await sleep(300);
        }
    }
    return { kind: 'error', credited: 0, reason: last, attempts: maxAttempts };
}

function sumCredited(rows: any[], filter: (r: any) => boolean = () => true) {
    let t = 0;
    for (const r of rows || []) {
        if (!filter(r)) continue;
        if (r.outcome === 'granted') t += Number(r.credited || 0);
        else if (r.outcome === 'pending' || r.outcome === 'error') t += Number(r.amount || 0); // reserved
    }
    return t;
}

export type GrantResult = { outcome: string; event: string; amount: number; credited: number; already?: boolean; reason?: string };

// `db` is base44.asServiceRole. Never throws.
export async function grantActivityPoints(db: any, opts: {
    wallet: string; event: string; amount: number; idempotencyKey: string;
    dayKey?: string; periodId?: string; config?: any;
}): Promise<GrantResult> {
    const { event, amount, idempotencyKey } = opts;
    const base: GrantResult = { outcome: 'skipped', event, amount, credited: 0 };
    try {
        const config = opts.config || await loadPointsConfig(db);
        if (!config.enabled) return { ...base, outcome: 'disabled' };
        const wallet = String(opts.wallet || '').toLowerCase();
        if (!/^0x[0-9a-f]{40}$/.test(wallet)) return { ...base, outcome: 'skipped', reason: 'bad wallet' };
        if (!Number.isInteger(amount) || amount < 1 || amount > 100) return { ...base, outcome: 'skipped', reason: 'amount out of range' };

        const now = new Date();
        const dayKey = opts.dayKey || utcDay(now);
        const monthKey = dayKey.slice(0, 7);

        // Already handled this occurrence?
        const existing = (await db.entities.PointGrantLog.filter({ idempotency_key: idempotencyKey }))?.[0];
        if (existing && ['granted', 'refused', 'not_in_game', 'guard'].includes(existing.outcome)) {
            return { ...base, outcome: existing.outcome, credited: Number(existing.credited || 0), already: true };
        }

        // Our own caps, before calling Omen. Skipped when retrying an existing pending/error row
        // (it was already counted as reserved).
        if (!existing) {
            const g = config.guards;
            const mine = await db.entities.PointGrantLog.filter({ wallet_address: wallet, month_key: monthKey }, '-created_date', 2000);
            let stop = '';
            if (sumCredited(mine) + amount > g.per_player_month) stop = `our per-player monthly cap (${g.per_player_month})`;
            else if (DAILY_EVENTS.includes(event) &&
                sumCredited(mine, r => r.day_key === dayKey && DAILY_EVENTS.includes(r.event)) + amount > g.per_player_day) {
                stop = `our per-player daily cap (${g.per_player_day})`;
            } else {
                const all = await db.entities.PointGrantLog.filter({ month_key: monthKey }, '-created_date', 10000);
                if (sumCredited(all) + amount > g.monthly_pool) stop = `our monthly pool cap (${g.monthly_pool})`;
            }
            if (stop) {
                try {
                    await db.entities.PointGrantLog.create({
                        idempotency_key: idempotencyKey, wallet_address: wallet, event, amount, credited: 0,
                        outcome: 'guard', reason: stop, day_key: dayKey, month_key: monthKey,
                        period_id: opts.periodId || '', attempts: 0,
                    });
                } catch {}
                return { ...base, outcome: 'guard', reason: stop };
            }
        }

        // Log first.
        let row = existing;
        if (!row) {
            try {
                row = await db.entities.PointGrantLog.create({
                    idempotency_key: idempotencyKey, wallet_address: wallet, event, amount, credited: 0,
                    outcome: 'pending', reason: '', day_key: dayKey, month_key: monthKey,
                    period_id: opts.periodId || '', attempts: 0,
                });
            } catch (e) {
                // Unique key clash = another request is handling this occurrence right now.
                return { ...base, outcome: 'already', already: true, reason: 'concurrent claim' };
            }
        }

        const ans = await callOmen(wallet, amount, idempotencyKey, event);
        const outcome = ans.kind;
        try {
            await db.entities.PointGrantLog.update(row.id, {
                outcome, credited: ans.credited, reason: ans.reason,
                attempts: Number(row.attempts || 0) + ans.attempts,
            });
        } catch (e) {
            console.warn('[omenxPoints] log update failed:', (e as any)?.message || e);
        }
        if (outcome !== 'granted') console.log(`[omenxPoints] ${event} ${wallet} -> ${outcome} ${ans.reason}`);
        return { ...base, outcome, credited: ans.credited, reason: ans.reason };
    } catch (e) {
        console.warn('[omenxPoints] grant failed (non-fatal):', (e as any)?.message || e);
        return { ...base, outcome: 'error', reason: String((e as any)?.message || e) };
    }
}

// For claim hooks: runs a list of grants with an overall time cap so a slow Omen can't hold up the
// player's claim. A grant cut off by the cap stays 'pending' in the log and is retried later with the
// same key (retryActivityPoints).
export async function grantSafely(db: any, grants: Array<Parameters<typeof grantActivityPoints>[1]>, capMs = 9000): Promise<GrantResult[]> {
    if (!grants.length) return [];
    try {
        const config = await loadPointsConfig(db);
        if (!config.enabled) return [];
        const work = (async () => {
            const out: GrantResult[] = [];
            for (const g of grants) out.push(await grantActivityPoints(db, { ...g, config }));
            return out;
        })();
        const timeout = new Promise<GrantResult[]>(r => setTimeout(() => r([]), capMs));
        return await Promise.race([work, timeout]);
    } catch (e) {
        console.warn('[omenxPoints] grantSafely failed (non-fatal):', (e as any)?.message || e);
        return [];
    }
}

// What the Star Ops strip shows: points this UTC day and month for one wallet.
export async function pointsSummary(db: any, wallet: string) {
    const w = String(wallet || '').toLowerCase();
    const dayKey = utcDay();
    const rows = await db.entities.PointGrantLog.filter({ wallet_address: w, month_key: dayKey.slice(0, 7) }, '-created_date', 2000);
    let today = 0, month = 0;
    const earnedToday: string[] = [];
    for (const r of rows || []) {
        if (r.outcome !== 'granted') continue;
        const c = Number(r.credited || 0);
        month += c;
        if (r.day_key === dayKey) { today += c; earnedToday.push(r.event); }
    }
    return { today, month, earnedToday };
}

// Builds the daily-loop key: ap-<event>-<day>-<wallet>.
export function dailyKey(event: string, dayKey: string, wallet: string) {
    return `ap-${event}-${dayKey}-${String(wallet).toLowerCase()}`;
}
