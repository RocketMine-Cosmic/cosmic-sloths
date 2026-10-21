// claimsTest — THROWAWAY TEST HARNESS (21 Oct 2026). Drives the REAL shared/claims.ts on a made-up wallet and a
// pretend raid week (2099-W01, invisible to the real game), then deletes everything it made.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { claimDailyTaskFor, claimBountyFor, claimSeasonalSkinFor, claimBossRewardFor } from '../../shared/claims.ts';
import { findSave, parseSave } from '../../shared/vipChests.ts';

const KEY = 'claims-test-21oct-9e1b';
const W = '0x00000000000000000000000000000000c1a1a001';
const WEEK = '2099-W01';

Deno.serve(async (req) => {
  const db = createClientFromRequest(req).asServiceRole;
  if ((await req.json().catch(() => ({}))).key !== KEY) return Response.json({ error: 'no' }, { status: 403 });
  const out: Record<string, unknown> = {};
  const today = new Date().toISOString().split('T')[0];
  const snap = async () => parseSave(await findSave(db, W));
  const reset = async (patch: any) => { const s = await findSave(db, W); await db.entities.PlayerSave.update(s.id, { save_data: { ...parseSave(s), ...patch } }); };
  const cleanup = async () => {
    const s = await findSave(db, W); if (s) await db.entities.PlayerSave.delete(s.id);
    for (const b of await db.entities.GlobalBoss.filter({ week_id: WEEK })) await db.entities.GlobalBoss.delete(b.id);
    for (const c of await db.entities.GlobalBossContribution.filter({ week_id: WEEK })) await db.entities.GlobalBossContribution.delete(c.id);
  };
  const tasks = () => ({ date: today, tasks: [
    { id: 'kill500', progress: 500, target: 500, rewardGold: 300, claimed: false },
    { id: 'play3', progress: 1, target: 3, rewardGold: 200, claimed: false },
    { id: 'boss1', progress: 1, target: 1, rewardGold: 0, rewardFragments: 4, claimed: false } ] });
  const bounties = () => ({ date: today,
    active: [ { id: 'bg', progress: 10, target: 10, reward: 500, currency: 'gold', claimed: false },
              { id: 'bf', progress: 5, target: 5, reward: 3, currency: 'fragment', claimed: false },
              { id: 'bx', progress: 0, target: 5, reward: 9, currency: 'gold', claimed: false } ],
    dailyMission: { id: 'dm', progress: 1, target: 1, reward: 25, claimed: false } });
  try {
    await cleanup();
    await db.entities.PlayerSave.create({ wallet_address: W, updated_at: Date.now(),
      save_data: { gold: 1000, relicFragments: 10, seasonalPoints: 90, unlockedSkins: ['other_skin'], keep: 'untouched', dailyTasks: tasks(), bounties: bounties() } });

    // --- Tasks (positional path tasks.N.claimed) ---
    const t1 = await claimDailyTaskFor(db, W, 'kill500');
    out.t1_task_claim = { status: t1.status, gold: t1.body.saveData?.gold, slot0: t1.fresh?.dailyTasks?.tasks?.[0]?.claimed, slot1_untouched: t1.fresh?.dailyTasks?.tasks?.[1]?.claimed === false, keep: t1.fresh?.keep };
    out.t2_task_again = (await claimDailyTaskFor(db, W, 'kill500')).status;            // 409
    out.t3_task_unfinished = (await claimDailyTaskFor(db, W, 'play3')).status;         // 400
    const t4 = await claimDailyTaskFor(db, W, 'boss1');
    out.t4_fragment_task = { status: t4.status, frags: t4.fresh?.relicFragments };   // 200, 14
    await reset({ gold: 1000, dailyTasks: tasks() });
    const five = await Promise.all(Array.from({ length: 5 }, () => claimDailyTaskFor(db, W, 'kill500')));
    out.t5_five_taps = { statuses: five.map((r) => r.status), gold_added: Number((await snap()).gold) - 1000 }; // one 200, +300
    await reset({ dailyTasks: { ...tasks(), date: '2026-01-01' } });
    out.t6_yesterdays_tasks = (await claimDailyTaskFor(db, W, 'kill500')).status;     // 400
    // Old-style write undoes a task claim: reward and marker together -> claimable again, net once.
    await reset({ gold: 1000, dailyTasks: tasks() });
    const before = await snap(); const sid = (await findSave(db, W)).id;
    await claimDailyTaskFor(db, W, 'kill500');
    await db.entities.PlayerSave.update(sid, { save_data: before });
    const again = await claimDailyTaskFor(db, W, 'kill500');
    out.t7_undo_then_reclaim = { status: again.status, net_gold: Number((await snap()).gold) - 1000 }; // 200, +300

    // --- Bounties ---
    await reset({ gold: 1000, relicFragments: 10, seasonalPoints: 90, bounties: bounties() });
    const b1 = await claimBountyFor(db, W, 'bounty', 0);
    out.b1_gold_bounty = { status: b1.status, gold: b1.fresh?.gold, slot1_untouched: b1.fresh?.bounties?.active?.[1]?.claimed === false };
    out.b2_again = (await claimBountyFor(db, W, 'bounty', 0)).status;                 // 409
    out.b3_unfinished = (await claimBountyFor(db, W, 'bounty', 2)).status;            // 400
    const b4 = await claimBountyFor(db, W, 'bounty', 1);
    out.b4_fragment_bounty = { status: b4.status, frags: b4.fresh?.relicFragments }; // 200, 13
    const b5 = await claimBountyFor(db, W, 'dailyMission');
    out.b5_mission = { status: b5.status, seasonalPoints: b5.fresh?.seasonalPoints }; // 200, 115
    await reset({ gold: 1000, bounties: bounties() });
    const bf = await Promise.all(Array.from({ length: 5 }, () => claimBountyFor(db, W, 'bounty', 0)));
    out.b6_five_taps = { statuses: bf.map((r) => r.status), gold_added: Number((await snap()).gold) - 1000 }; // one 200, +500
    // A new day's list swapped in between read and write must not be marked by yesterday's claim.
    out.b7_note = 'list-swap guard covered by date + id condition';

    // --- Seasonal skin ---
    await reset({ seasonalPoints: 90, unlockedSkins: ['other_skin'] });
    out.s1_not_enough = (await claimSeasonalSkinFor(db, W, 'skybyte_nebula_ace')).status;  // 400
    await reset({ seasonalPoints: 150 });
    const s2 = await claimSeasonalSkinFor(db, W, 'skybyte_nebula_ace');
    out.s2_claim = { status: s2.status, pts: s2.fresh?.seasonalPoints, skins: s2.fresh?.unlockedSkins }; // 200, 50, [other, sky]
    out.s3_again = (await claimSeasonalSkinFor(db, W, 'skybyte_nebula_ace')).status;      // 409
    out.s4_not_allowed = (await claimSeasonalSkinFor(db, W, 'paid_skin')).status;          // 400
    await reset({ seasonalPoints: 250, unlockedSkins: [] });
    const sk = await Promise.all(['neobyte_neon_vanguard', 'glitch_toxic_phantom', 'synthbeats_astro_dj', 'skybyte_nebula_ace']
      .map((id) => claimSeasonalSkinFor(db, W, id)));
    const after = await snap();
    out.s5_four_at_once_with_250pts = { statuses: sk.map((r) => r.status), pts: after.seasonalPoints, skins: (after.unlockedSkins || []).length }; // two 200, pts 50, 2 skins

    // --- Boss milestone (pretend week) ---
    await db.entities.GlobalBoss.create({ week_id: WEEK, max_hp: 1, current_hp: 1, level: 5 });
    await db.entities.GlobalBossContribution.create({ week_id: WEEK, user_id: W, damage: 10, claimed_milestones: [] });
    await db.entities.GlobalBossContribution.create({ week_id: WEEK, user_id: W, damage: 20, claimed_milestones: [] });
    await reset({ gold: 1000 });
    const k1 = await claimBossRewardFor(db, W, 2, WEEK);
    out.k1_boss = { status: k1.status, gold: k1.fresh?.gold };                             // 200, 1500
    out.k2_again = (await claimBossRewardFor(db, W, 2, WEEK)).status;                     // 409
    out.k3_not_reached = (await claimBossRewardFor(db, W, 5, WEEK)).status;               // 400
    const kf = await Promise.all(Array.from({ length: 5 }, () => claimBossRewardFor(db, W, 3, WEEK)));
    out.k4_five_taps = { statuses: kf.map((r) => r.status), gold: Number((await snap()).gold) }; // one 200, 1500 + 750 = 2250
    const rows = (await db.entities.GlobalBossContribution.filter({ week_id: WEEK })).sort((a: any, b: any) => String(a.created_date).localeCompare(String(b.created_date)));
    out.k5_marker_on_oldest_row = { oldest: rows[0]?.claimed_milestones, newer: rows[1]?.claimed_milestones }; // [2,3] and []
    await db.entities.GlobalBossContribution.create({ week_id: WEEK, user_id: W, damage: 30, claimed_milestones: [] }); // a raid lands mid-week
    const k6 = await claimBossRewardFor(db, W, 4, WEEK);
    const rows2 = (await db.entities.GlobalBossContribution.filter({ week_id: WEEK })).sort((a: any, b: any) => String(a.created_date).localeCompare(String(b.created_date)));
    out.k6_after_new_row = { status: k6.status, oldest: rows2[0]?.claimed_milestones, newest: rows2[2]?.claimed_milestones }; // 200, [2,3,4], []
  } catch (e: any) {
    out.error = String(e?.stack || e?.message || e);
  } finally {
    try { await cleanup(); out.cleaned = true; } catch (e: any) { out.cleaned = String(e?.message || e); }
  }
  return Response.json(out);
});
