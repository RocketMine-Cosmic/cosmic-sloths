// saveWriteProbe — THROWAWAY PROBE (21 Oct 2026). Delete with the SaveWriteProbe entity.
// Question: does Base44's updateMany with MongoDB operators give ATOMIC writes INSIDE save_data?
// Uses its own SaveWriteProbe table only. Never touches PlayerSave. Needs a probe key so it can't be
// triggered by anyone else.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';

const KEY = 'probe-21oct-7f3a9c';
const N = 20;

Deno.serve(async (req) => {
  const out: Record<string, unknown> = {};
  let rowId = '';
  const base44 = createClientFromRequest(req);
  const T = base44.asServiceRole.entities.SaveWriteProbe;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.key !== KEY) return Response.json({ error: 'no' }, { status: 403 });

    const row = await T.create({ wallet_address: '0xprobe', save_data: { gold: 0, rmw: 0, owned: [], ver: 4, keep: 'untouched' }, updated_at: 1 });
    rowId = row.id;
    const read = async () => (await T.get(rowId)).save_data;

    // 1. One $inc on a nested field — does the query-by-id match, and does the nested path work?
    out.inc_once = await T.updateMany({ id: rowId }, { $inc: { 'save_data.gold': 1 } }).catch((e: any) => ({ error: String(e?.message || e) }));
    out.after_inc_once = await read();

    // 2. N parallel $inc — atomic?
    await Promise.all(Array.from({ length: N }, () => T.updateMany({ id: rowId }, { $inc: { 'save_data.gold': 1 } })));
    out.after_parallel_inc_gold = (await read()).gold;  // expect 1 + N

    // 3. N parallel read-modify-write (today's pattern) — for comparison
    await Promise.all(Array.from({ length: N }, async () => {
      const s = await read();
      s.rmw = Number(s.rmw || 0) + 1;
      await T.update(rowId, { save_data: s });
    }));
    const afterRmw = await read();
    out.after_parallel_rmw = afterRmw.rmw;               // expect < N if racy
    out.gold_after_rmw = afterRmw.gold;                   // did whole-object writes keep gold?

    // 4. $addToSet twice with the same value + $push stamp
    await T.updateMany({ id: rowId }, { $addToSet: { 'save_data.owned': 'moon' } });
    await T.updateMany({ id: rowId }, { $addToSet: { 'save_data.owned': 'moon' } });
    out.owned_after_addToSet_twice = (await read()).owned;  // expect ['moon']

    // 5. Conditional write: only if a stamp is NOT already there (one write = grant + stamp)
    const g1 = await T.updateMany({ id: rowId, 'save_data.owned': { $ne: 'stamp-A' } }, { $inc: { 'save_data.gold': 1000 }, $addToSet: { 'save_data.owned': 'stamp-A' } });
    const g2 = await T.updateMany({ id: rowId, 'save_data.owned': { $ne: 'stamp-A' } }, { $inc: { 'save_data.gold': 1000 }, $addToSet: { 'save_data.owned': 'stamp-A' } });
    out.conditional_first = g1; out.conditional_second = g2; // expect updated 1 then 0
    out.gold_after_conditional = (await read()).gold;          // expect (1+N)+N-loss? -> see report

    // 6. Compare-and-swap on a version number
    out.cas_wrong_version = await T.updateMany({ id: rowId, 'save_data.ver': 5 }, { $set: { 'save_data.keep': 'changed' } });
    out.cas_right_version = await T.updateMany({ id: rowId, 'save_data.ver': 4 }, { $set: { 'save_data.keep': 'changed' }, $inc: { 'save_data.ver': 1 } });
    out.final = await read();

    // 7. The exact chest grant shape: stamp list MISSING, $each for several cosmetics, $inc on a
    //    field that doesn't exist yet, all in one conditional step; then the same again (must be a no-op).
    const grant = () => T.updateMany(
      { id: rowId, 'save_data.stamps': { $ne: 'rcpt-1' } },
      { $inc: { 'save_data.gold': 50000, 'save_data.starFragments': 150 },
        $addToSet: { 'save_data.owned': { $each: ['moon', 'skull', 'core'] }, 'save_data.stamps': 'rcpt-1' },
        $set: { 'save_data.updated_at': 123 } });
    out.chest_first = await grant();
    out.chest_second = await grant();
    out.chest_final = await read();
  } catch (e: any) {
    out.error = String(e?.message || e);
  } finally {
    if (rowId) { try { await T.delete(rowId); out.cleaned = true; } catch { out.cleaned = false; } }
  }
  return Response.json(out);
});
