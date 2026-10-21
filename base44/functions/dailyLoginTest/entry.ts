// dailyLoginTest — THROWAWAY TEST HARNESS (21 Oct 2026). Drives the REAL claim (shared/dailyLogin.ts) on a
// made-up wallet, then deletes the save it made. Delete this function once stage 2 is signed off.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { claimDailyLoginFor } from '../../shared/dailyLogin.ts';
import { findSave, parseSave } from '../../shared/vipChests.ts';

const KEY = 'daily-test-21oct-4c2d';
const W = '0x00000000000000000000000000000000da11e001';

Deno.serve(async (req) => {
  const db = createClientFromRequest(req).asServiceRole;
  if ((await req.json().catch(() => ({}))).key !== KEY) return Response.json({ error: 'no' }, { status: 403 });
  const R: Record<string, unknown> = {};
  const today = new Date().toISOString().split('T')[0];
  const y = new Date(); y.setUTCDate(y.getUTCDate() - 1); const yesterday = y.toISOString().split('T')[0];
  const snap = async () => { const d = parseSave(await findSave(db, W)); return { gold: d.gold, relicFragments: d.relicFragments, dailyLogin: d.dailyLogin, keep: d.keep }; };
  const setLogin = async (dl: any, extra: any = {}) => {
    const s = await findSave(db, W); const d = parseSave(s);
    if (dl === null) delete d.dailyLogin; else d.dailyLogin = dl;
    Object.assign(d, extra);
    await db.entities.PlayerSave.update(s.id, { save_data: d });
  };
  const cleanup = async () => { const s = await findSave(db, W); if (s) await db.entities.PlayerSave.delete(s.id); };
  try {
    await cleanup();
    await db.entities.PlayerSave.create({ wallet_address: W, save_data: { gold: 1000, relicFragments: 5, keep: 'untouched' }, updated_at: Date.now() });

    const d1 = await claimDailyLoginFor(db, W);
    R.d1_first_ever = { status: d1.status, reward: d1.body.reward, streak: d1.body.streak, returned: d1.body.saveData }; // 200, 400 gold, streak 1
    R.d1_save = await snap();                                                                                         // gold 1400, keep untouched
    R.d2_again_same_day = (await claimDailyLoginFor(db, W)).status;                                                   // 409
    R.d2_save = await snap();                                                                                         // still 1400

    await setLogin({ lastDate: yesterday, streak: 3, claimed: true });
    const d3 = await claimDailyLoginFor(db, W);
    R.d3_streak_continues = { status: d3.status, streak: d3.body.streak, reward: d3.body.reward };                   // streak 4, 1 fragment
    R.d3_save = await snap();                                                                                         // relicFragments 6

    await setLogin({ lastDate: '2026-01-01', streak: 9, claimed: true });
    R.d4_broken_streak = (await claimDailyLoginFor(db, W)).body.streak;                                               // 1

    // Five taps at once from yesterday's state: exactly one pays.
    await setLogin({ lastDate: yesterday, streak: 1, claimed: true });
    const g0 = Number((await snap()).gold);
    const five = await Promise.all(Array.from({ length: 5 }, () => claimDailyLoginFor(db, W)));
    R.d5_five_taps = five.map((r) => r.status);                                                                       // one 200, four 409
    R.d5_gold_added = Number((await snap()).gold) - g0;                                                               // 800 exactly (day 2)

    // Old-style writer undoes the claim: reward and marker go together, so the player can claim again; net once.
    await setLogin({ lastDate: yesterday, streak: 1, claimed: true });
    const before = parseSave(await findSave(db, W)); const sid = (await findSave(db, W)).id;
    const g1 = Number(before.gold);
    const c1 = await claimDailyLoginFor(db, W);
    await db.entities.PlayerSave.update(sid, { save_data: before });                                                 // the stale write-back
    R.d6_after_undo = await snap();                                                                                   // gold back to g1, dailyLogin = yesterday
    const c2 = await claimDailyLoginFor(db, W);
    R.d6_claims = [c1.status, c2.status];                                                                              // [200, 200]
    R.d6_net_gold = Number((await snap()).gold) - g1;                                                                 // 800 (paid once overall)
    R.d6_third = (await claimDailyLoginFor(db, W)).status;                                                            // 409

    // Marker for today but not claimed (legacy shape) -> claim allowed.
    await setLogin({ lastDate: today, streak: 2, claimed: false });
    R.d7_today_unclaimed = (await claimDailyLoginFor(db, W)).status;                                                  // 200

    // No dailyLogin at all on an existing save -> allowed (covered by d1), and a wallet with no save -> 404.
    R.d8_no_save = (await claimDailyLoginFor(db, '0x00000000000000000000000000000000da11e0ff')).status;              // 404
  } catch (e: any) {
    R.error = String(e?.stack || e?.message || e);
  } finally {
    try { await cleanup(); R.cleaned = true; } catch (e: any) { R.cleaned = String(e?.message || e); }
  }
  return Response.json(R);
});
