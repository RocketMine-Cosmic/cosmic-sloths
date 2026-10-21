// Squad Treasury buff — the EFFECT side (added 2026-10-21, live from 2026-W44).
//
// Until this file existed the treasury buff was sold but never applied: the shop
// (squadActions activateBuff) charged the treasury and moved the buff between
// the pending/active slots, but nothing in a run, saveScore or the boss
// functions ever read it (flagged in docs/s8/AUDIT_04 and GAME_OPERATIONS K-F2).
//
// Rob, 21 Oct 2026: make it do what the treasury screen says.
//   - XP  = the player's LEVELLING XP inside a run (not squad XP).
//   - gold = gold credited when a run saves.
//   - boss damage = Global Raid boss AND Squad Meteor.
//
// Who applies what:
//   - XP: the browser, at run start, from `getMyTreasuryBuff` (server answer,
//     never a browser cache). It only changes how fast you level in that run.
//   - gold: saveScore, on the server, after the run's gold is validated/capped.
//   - boss damage: submitBossDamage / submitSquadMeteorDamage, on the server,
//     after the per-call damage clamp.
// The squad is ALWAYS found from the player's real SquadMember row, never from
// a squad id the browser sends.
//
// Ships at the W43 -> W44 rollover (Mon 26 Oct 2026 00:00 UTC). Before that
// week every lookup returns "no buff", so publishing early changes nothing.

export const TREASURY_BUFF_START_WEEK = '2026-W44';

// Percentages, matching the tier cards on the Squad Treasury panel.
export const TREASURY_BUFF_EFFECTS: Record<string, { xp_pct: number; gold_pct: number; boss_pct: number }> = {
    bronze:   { xp_pct: 5,  gold_pct: 0,  boss_pct: 0 },
    silver:   { xp_pct: 10, gold_pct: 5,  boss_pct: 0 },
    gold:     { xp_pct: 20, gold_pct: 10, boss_pct: 3 },
    platinum: { xp_pct: 30, gold_pct: 15, boss_pct: 8 },
};

// Canonical ISO week (Mon 00:00 – Sun 23:59:59 UTC), same formula as every other
// function in the app.
export function currentWeekId(now: Date = new Date()): string {
    const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const isoYear = tmp.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const isoWeek = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

// Which tier is in force for `weekId`. The squad row's slots only get rotated
// when someone opens the Squads page (resetPeriods), so a buff bought for this
// week can still be sitting in the PENDING slot. Check both, active first.
export function effectiveBuffTier(squad: any, weekId: string): string {
    if (!squad) return '';
    if (squad.active_buff_tier && squad.active_buff_week_id === weekId) return squad.active_buff_tier;
    if (squad.pending_buff_tier && squad.pending_buff_week_id === weekId) return squad.pending_buff_tier;
    return '';
}

export type TreasuryBuff = {
    tier: string;
    squad_id: string;
    week_id: string;
    xp_pct: number;
    gold_pct: number;
    boss_pct: number;
};

function noBuff(weekId: string): TreasuryBuff {
    return { tier: '', squad_id: '', week_id: weekId, xp_pct: 0, gold_pct: 0, boss_pct: 0 };
}

// Looks up the buff for a wallet. `db` is base44.asServiceRole.
// Pass `squadId` only when the caller has ALREADY resolved it from the player's
// own SquadMember row (saves a read). Never pass a browser-supplied squad id.
// Fails closed: any error means "no buff", never a blocked run.
export async function getTreasuryBuffForWallet(
    db: any,
    wallet: string,
    opts: { weekId?: string; squadId?: string } = {},
): Promise<TreasuryBuff> {
    const weekId = opts.weekId || currentWeekId();
    if (!wallet || weekId < TREASURY_BUFF_START_WEEK) return noBuff(weekId);
    try {
        let squadId = opts.squadId || '';
        if (!squadId) {
            const lower = String(wallet).toLowerCase();
            let members = await db.entities.SquadMember.filter({ wallet_address: lower });
            if ((!members || members.length === 0) && lower !== wallet) {
                members = await db.entities.SquadMember.filter({ wallet_address: wallet });
            }
            squadId = members?.[0]?.squad_id || '';
        }
        if (!squadId) return noBuff(weekId);
        const squad = await db.entities.Squad.get(squadId);
        const tier = effectiveBuffTier(squad, weekId);
        const fx = TREASURY_BUFF_EFFECTS[tier];
        if (!fx) return { ...noBuff(weekId), squad_id: squadId };
        return { tier, squad_id: squadId, week_id: weekId, ...fx };
    } catch (e) {
        console.warn('[treasuryBuff] lookup failed, no buff applied:', (e as any)?.message || e);
        return noBuff(weekId);
    }
}

// Whole-number bonus on top of `base` (never negative, rounds down).
export function bonusOf(base: number, pct: number): number {
    if (!pct || !(base > 0)) return 0;
    return Math.floor(base * pct / 100);
}
