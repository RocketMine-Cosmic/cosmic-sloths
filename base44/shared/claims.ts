// Claim buttons — each reward goes on the save together with its "claimed" marker in ONE atomic database step.
// Stage 3a of the save-write fix (claude/handoffs/SAVE_WRITES.md, 21 Oct 2026). Same idea as shared/dailyLogin.ts:
// PlayerSave.updateMany({ id, <still claimable> }, { $inc reward, $set marker }). Only the claim's own fields are
// touched, so a run saving at the same moment can't undo it and it can't undo the run; two taps pay once.
// If an OLD-style whole-save writer later undoes it, reward and marker roll back together (claimable again).
import { with429Retry, findSave, parseSave } from './vipChests.ts';

export type ClaimResult = { status: number; body: Record<string, any>; fresh?: any };
const R = (status: number, body: Record<string, any>, fresh?: any): ClaimResult => ({ status, body, fresh });
const isoDay = (d: Date) => d.toISOString().split('T')[0];
const CURRENCY_FIELD: Record<string, string> = { gold: 'gold', fragment: 'relicFragments', token: 'cosmicTokens' };

async function apply(db: any, id: string, query: Record<string, unknown>, update: Record<string, unknown>): Promise<boolean> {
  const now = Date.now();
  const op: any = { ...update, $set: { ...((update as any).$set || {}), 'save_data.updated_at': now, updated_at: now } };
  const res: any = await with429Retry(() => db.entities.PlayerSave.updateMany({ id, ...query }, op), 'PlayerSave.updateMany');
  return Number(res?.updated || 0) > 0;
}

// ---- Daily task -------------------------------------------------------------------------------------------
export async function claimDailyTaskFor(db: any, wallet: string, taskId: string, now: Date = new Date()): Promise<ClaimResult> {
  const record = await findSave(db, wallet);
  if (!record) return R(404, { error: 'We couldn\'t find your save. Please play a run first.' });
  const save = parseSave(record);
  const dt = save.dailyTasks;
  if (!dt || !Array.isArray(dt.tasks)) return R(400, { error: 'No daily tasks available — play a run to refresh.' });
  const today = isoDay(now);
  if (dt.date && dt.date !== today) return R(400, { error: 'These tasks are from yesterday — play a run to refresh today\'s tasks.' });
  const i = dt.tasks.findIndex((t: any) => t && t.id === taskId);
  if (i < 0) return R(404, { error: 'This task is no longer available.' });
  const task = dt.tasks[i];
  if (task.claimed) return R(409, { error: 'You\'ve already claimed this task.', alreadyClaimed: true });
  if ((task.progress || 0) < (task.target || 0)) return R(400, { error: 'You haven\'t finished this task yet.' });

  const gold = Number(task.rewardGold || 0), frags = Number(task.rewardFragments || 0);
  const inc: Record<string, number> = {};
  if (gold > 0) inc['save_data.gold'] = gold;
  if (frags > 0) inc['save_data.relicFragments'] = frags;
  // Same task, same slot, same day, not yet claimed — at the moment the database applies it.
  const q: Record<string, unknown> = { [`save_data.dailyTasks.tasks.${i}.id`]: taskId, [`save_data.dailyTasks.tasks.${i}.claimed`]: { $ne: true } };
  if (dt.date) q['save_data.dailyTasks.date'] = dt.date;
  const ok = await apply(db, record.id, q, { ...(Object.keys(inc).length ? { $inc: inc } : {}), $set: { [`save_data.dailyTasks.tasks.${i}.claimed`]: true } });
  if (!ok) return R(409, { error: 'You\'ve already claimed this task.', alreadyClaimed: true });
  const fresh = parseSave(await findSave(db, wallet));
  return R(200, { success: true, reward: { gold, fragments: frags }, saveData: { gold: fresh.gold, relicFragments: fresh.relicFragments, dailyTasks: fresh.dailyTasks } }, fresh);
}

// ---- Bounty / daily mission ---------------------------------------------------------------------------------
export async function claimBountyFor(db: any, wallet: string, type: string, bountyIndex?: number): Promise<ClaimResult> {
  const record = await findSave(db, wallet);
  if (!record) return R(404, { error: 'We couldn\'t find your save. Please play a run first to create one.' });
  const save = parseSave(record);
  const b = save.bounties;
  if (!b) return R(400, { error: 'No bounties available yet — play a run to refresh.' });

  let bounty: any, path: string;
  if (type === 'bounty') {
    if (!Array.isArray(b.active) || !b.active[bountyIndex!]) return R(404, { error: 'This bounty is no longer available.' });
    bounty = b.active[bountyIndex!]; path = `save_data.bounties.active.${bountyIndex}`;
  } else {
    bounty = b.dailyMission;
    if (!bounty) return R(404, { error: 'No daily mission available right now.' });
    path = 'save_data.bounties.dailyMission';
  }
  if (bounty.claimed) return R(409, { error: 'You\'ve already claimed this bounty.', alreadyClaimed: true });
  if ((bounty.progress || 0) < (bounty.target || 0)) return R(400, { error: 'You haven\'t finished this bounty yet.' });

  const amount = Number(bounty.reward || 0);
  const field = type === 'dailyMission' ? 'seasonalPoints' : CURRENCY_FIELD[bounty.currency];
  const q: Record<string, unknown> = { [`${path}.claimed`]: { $ne: true } };
  if (bounty.id !== undefined) q[`${path}.id`] = bounty.id;          // same bounty still in that slot
  const bDate = b.date || b.lastReset;
  if (bDate) q[b.date ? 'save_data.bounties.date' : 'save_data.bounties.lastReset'] = bDate; // same day's list
  const ok = await apply(db, record.id, q, { ...(field && amount > 0 ? { $inc: { [`save_data.${field}`]: amount } } : {}), $set: { [`${path}.claimed`]: true } });
  if (!ok) return R(409, { error: 'You\'ve already claimed this bounty.', alreadyClaimed: true });
  const fresh = parseSave(await findSave(db, wallet));
  return R(200, {
    success: true,
    reward: { amount: bounty.reward, currency: bounty.currency || 'seasonalPoints' },
    saveData: { gold: fresh.gold, relicFragments: fresh.relicFragments, cosmicTokens: fresh.cosmicTokens, seasonalPoints: fresh.seasonalPoints, bounties: fresh.bounties },
  }, fresh);
}

// ---- Seasonal skin (spend 100 points, unlock one skin) ------------------------------------------------------
export const SEASONAL_POINTS_PER_SKIN = 100;
export const SEASONAL_SKIN_ALLOWLIST = new Set([
  'neobyte_neon_vanguard', 'pandypaws_golden_sov', 'novabyte_galactic_enforcer', 'glitch_toxic_phantom',
  'holodrift_quantum_drifter', 'codebreaker_cyber_ninja', 'dataphantom_abyssal_wraith', 'neonvortex_supernova_elite',
  'synthbeats_astro_dj', 'skybyte_nebula_ace',
]);

export async function claimSeasonalSkinFor(db: any, wallet: string, skinId: string): Promise<ClaimResult> {
  if (!SEASONAL_SKIN_ALLOWLIST.has(skinId)) return R(400, { error: 'That skin isn\'t claimable here.' });
  const record = await findSave(db, wallet);
  if (!record) return R(404, { error: 'We couldn\'t find your save. Please play a run first to create one.' });
  const save = parseSave(record);
  const pts = Number(save.seasonalPoints || 0);
  if (pts < SEASONAL_POINTS_PER_SKIN) {
    return R(400, { error: `You need ${SEASONAL_POINTS_PER_SKIN} Seasonal Points to claim this skin. You have ${pts}.` });
  }
  if (Array.isArray(save.unlockedSkins) && save.unlockedSkins.includes(skinId)) {
    return R(409, { error: 'You\'ve already unlocked this skin.', alreadyOwned: true });
  }
  // Only if they STILL have the points and STILL don't own it when the database applies it.
  const ok = await apply(db, record.id,
    { 'save_data.seasonalPoints': { $gte: SEASONAL_POINTS_PER_SKIN }, 'save_data.unlockedSkins': { $ne: skinId } },
    { $inc: { 'save_data.seasonalPoints': -SEASONAL_POINTS_PER_SKIN }, $addToSet: { 'save_data.unlockedSkins': skinId } });
  const fresh = parseSave(await findSave(db, wallet));
  if (!ok) {
    if (Array.isArray(fresh.unlockedSkins) && fresh.unlockedSkins.includes(skinId)) return R(409, { error: 'You\'ve already unlocked this skin.', alreadyOwned: true });
    return R(400, { error: `You need ${SEASONAL_POINTS_PER_SKIN} Seasonal Points to claim this skin. You have ${Number(fresh.seasonalPoints || 0)}.` });
  }
  return R(200, { success: true, skinId, saveData: { seasonalPoints: fresh.seasonalPoints, unlockedSkins: fresh.unlockedSkins } }, fresh);
}

// ---- Global Raid boss milestone ----------------------------------------------------------------------------
// The "claimed" marker lives on GlobalBossContribution (not the save). Old code: read rows, check, then a
// read-change-write of the marker — two claims at the same instant could both pass the check and both be paid.
// Now the marker is "add this level only if it isn't there" on the player's first row, the gold an atomic add.
export function currentIsoWeekId(now: Date = new Date()): string {
  const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const isoYear = tmp.getUTCFullYear();
  const isoWeek = Math.ceil(((tmp.getTime() - Date.UTC(isoYear, 0, 1)) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

export type BossClaim = ClaimResult & { creditError?: string; goldReward?: number };

export async function claimBossRewardFor(db: any, walletAsLinked: string, levelNum: number, weekId: string = currentIsoWeekId()): Promise<BossClaim> {
  const bosses = await db.entities.GlobalBoss.filter({ week_id: weekId });
  if (!bosses || bosses.length === 0) return R(404, { error: 'No raid running this week.' });
  if (levelNum >= (bosses[0].level || 1)) return R(400, { error: 'This level hasn\'t been defeated yet.' });

  // submitBossDamage writes one row per run; contributions are keyed by the wallet as linked (original casing).
  const contribs: any[] = await db.entities.GlobalBossContribution.filter({ week_id: weekId, user_id: walletAsLinked });
  // Pick the oldest row OURSELVES: the database ignored a sort argument on 21 Oct (the first live claim marked the
  // newer row). A row made by a raid finishing mid-claim must never become "the" marker row, or two claims could
  // mark different rows and both pay.
  contribs?.sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)) || String(a.id).localeCompare(String(b.id)));
  if (!contribs || contribs.length === 0) return R(404, { error: 'You haven\'t contributed to the raid this week yet.' });
  if (contribs.some((c) => Array.isArray(c.claimed_milestones) && c.claimed_milestones.includes(levelNum))) {
    return R(409, { status: 'error', error: 'You\'ve already claimed this reward.' });
  }
  const walletLower = walletAsLinked.toLowerCase();
  const record = await findSave(db, walletLower);
  if (!record) return R(404, { error: 'We couldn\'t find your save. Please play a run first to create one.' });

  // The OLDEST row always carries the marker, so every claim for this player races on the same row.
  const marked: any = await with429Retry(() => db.entities.GlobalBossContribution.updateMany(
    { id: contribs[0].id, claimed_milestones: { $ne: levelNum } },
    { $addToSet: { claimed_milestones: levelNum } },
  ), 'mark_claimed');
  if (Number(marked?.updated || 0) === 0) return R(409, { status: 'error', error: 'You\'ve already claimed this reward.' });

  const goldReward = levelNum * 250;
  try {
    const ok = await apply(db, record.id, {}, { $inc: { 'save_data.gold': goldReward } });
    if (!ok) throw new Error('gold credit matched no save');
  } catch (e: any) {
    return { ...R(500, { error: 'Your reward was logged but couldn\'t be credited right now. Our team has been alerted — please wait a moment.' }), creditError: String(e?.message || e), goldReward };
  }
  const fresh = parseSave(await findSave(db, walletLower));
  return { ...R(200, { status: 'success', reward: { type: 'gold', id: goldReward.toString() }, saveData: { gold: fresh.gold } }, fresh), goldReward };
}
