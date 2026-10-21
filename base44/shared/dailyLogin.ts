// Daily login claim — the reward and the "claimed today" marker go on the save in ONE atomic step.
// Stage 2 of the save-write fix (claude/handoffs/SAVE_WRITES.md, Rob 21 Oct 2026: "need to fix it properly
// then so it dont effect daily login either").
//
// Before: read the whole save, add gold, write the whole save back. A run saving at the same moment could
// undo the reward, or the reward could undo the run (probe: 20 overlapping read-change-writes -> 1 survives).
// Now: PlayerSave.updateMany({ id, not-claimed-today }, { $inc reward, $set dailyLogin }). The database does it,
// so it touches nothing else on the save, and two claims at once can only pay once. If an OLD-style writer
// later undoes it, the reward and the marker go together, so the player can simply claim again — never lost,
// never doubled.
import { with429Retry, findSave, parseSave } from './vipChests.ts';

export const DAILY_REWARDS = [
  { day: 1, reward: 400, currency: 'gold' },
  { day: 2, reward: 800, currency: 'gold' },
  { day: 3, reward: 1000, currency: 'gold' },
  { day: 4, reward: 1, currency: 'fragment' },
  { day: 5, reward: 2000, currency: 'gold' },
  { day: 6, reward: 2, currency: 'fragment' },
  { day: 7, reward: 4000, currency: 'gold' },
];

const FIELD: Record<string, string> = { gold: 'gold', fragment: 'relicFragments', token: 'cosmicTokens' };

const isoDay = (d: Date) => d.toISOString().split('T')[0];

export type ClaimResult = { status: number; body: Record<string, any>; wallet?: string; today?: string; newStreak?: number };

// `now` is injectable for tests only.
export async function claimDailyLoginFor(db: any, walletLower: string, now: Date = new Date()): Promise<ClaimResult> {
  const today = isoDay(now);
  const y = new Date(now); y.setUTCDate(y.getUTCDate() - 1);
  const yesterday = isoDay(y);

  const record = await findSave(db, walletLower);
  if (!record) return { status: 404, body: { error: 'We couldn\'t find your save. Please play a run first to create one.' } };

  const saveData = parseSave(record);
  const login = saveData.dailyLogin || { lastDate: '', streak: 0, claimed: false };
  if (login.lastDate === today && login.claimed) {
    return { status: 409, body: { error: 'You\'ve already claimed today\'s reward — come back tomorrow!', alreadyClaimed: true } };
  }

  const newStreak = (login.lastDate === yesterday ? Number(login.streak || 0) : 0) + 1;
  const rewardDay = DAILY_REWARDS[(newStreak - 1) % 7];
  const field = FIELD[rewardDay.currency];
  const nowMs = Date.now();

  // One step, and only if today hasn't been claimed by the time the database applies it.
  const res: any = await with429Retry(() => db.entities.PlayerSave.updateMany(
    { id: record.id, $or: [{ 'save_data.dailyLogin.lastDate': { $ne: today } }, { 'save_data.dailyLogin.claimed': { $ne: true } }] },
    {
      $inc: { [`save_data.${field}`]: rewardDay.reward },
      $set: { 'save_data.dailyLogin': { lastDate: today, streak: newStreak, claimed: true }, 'save_data.updated_at': nowMs, updated_at: nowMs },
    },
  ), 'PlayerSave.updateMany');

  if (Number(res?.updated || 0) === 0) {
    // Someone else's claim got there first (double tap, two tabs).
    return { status: 409, body: { error: 'You\'ve already claimed today\'s reward — come back tomorrow!', alreadyClaimed: true } };
  }

  // Fresh values for the screen (it copies these straight onto the local save).
  const fresh = parseSave(await findSave(db, walletLower));
  return {
    status: 200,
    wallet: walletLower, today, newStreak,
    body: {
      success: true,
      reward: rewardDay,
      streak: newStreak,
      saveData: {
        gold: fresh.gold,
        cosmicTokens: fresh.cosmicTokens,
        relicFragments: fresh.relicFragments,
        dailyLogin: fresh.dailyLogin,
      },
    },
  };
}
