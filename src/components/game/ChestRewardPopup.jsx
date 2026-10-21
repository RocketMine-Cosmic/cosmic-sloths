import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { SaveManager } from '../../game/SaveManager';

// 🎁 Chest reward popup — shown once per VIP chest win, the next time the player opens the game.
// Rob, 21 Oct 2026: every win gets it, "so the player knows their chest has been acknowledged without
// having to look to see if their gold went up". Also how a duplicate swap and a held prize (won before
// they ever played) are explained. Server: getMyChestRewards. Design: claude/handoffs/VIP_CHESTS.md.

const CHEST_ICON = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', diamond: '💠', legend: '🟣', elite: '👑' };
// Fields the chest grant writes (all server-owned). Pulled fresh so the new gold shows straight away.
const CHEST_FIELDS = ['gold', 'starFragments', 'owned_chest_cosmetics', 'vipChestReceiptsApplied'];

export default function ChestRewardPopup({ enabled, onSaveRefreshed }) {
  const [rewards, setRewards] = useState([]);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let retryTimer = null;
    const run = async (attempt) => {
      try {
        const res = await base44.functions.invoke('getMyChestRewards', { action: 'list' });
        // A brand-new player's save is created by their first sync, which can land after this call.
        // If a prize is still held, ask again a little later (twice at most).
        if (res.data?.stillHeld > 0 && attempt < 2 && alive) retryTimer = setTimeout(() => run(attempt + 1), 20000);
        const list = res.data?.rewards || [];
        if (!alive) return;
        if (res.data?.saveChanged || list.length) {
          try {
            const fresh = await base44.functions.invoke('loadSave', {});
            const cloud = fresh.data?.saveData;
            if (cloud && alive) {
              const merged = { ...SaveManager.load() };
              for (const k of CHEST_FIELDS) if (cloud[k] !== undefined) merged[k] = cloud[k];
              SaveManager.save(merged);
              onSaveRefreshed?.(merged);
            }
          } catch { /* the next sync adopts the cloud copy anyway */ }
        }
        if (alive && list.length) setRewards(list);
      } catch { /* never block the hub over this */ }
    };
    run(0);
    return () => { alive = false; if (retryTimer) clearTimeout(retryTimer); };
  }, [enabled]);

  if (!rewards.length) return null;

  const close = async () => {
    setClosing(true);
    try { await base44.functions.invoke('getMyChestRewards', { action: 'seen', ids: rewards.map((r) => r.id) }); } catch { /* shows again next load */ }
    setRewards([]);
    setClosing(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-purple-500/60 bg-slate-950 p-5 shadow-2xl">
        <div className="text-center text-2xl font-bold text-white">🎁 Chest reward{rewards.length > 1 ? 's' : ''}</div>
        <div className="mt-1 text-center text-sm text-slate-400">From your Omen VIP chest{rewards.length > 1 ? 's' : ''} — it's all in your account.</div>
        <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto">
          {rewards.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-700 bg-slate-900 p-3">
              <div className="font-semibold text-white">{CHEST_ICON[r.chest_key] || '🎁'} {r.chest}</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {r.gold > 0 && <li>🪙 {r.gold.toLocaleString()} gold</li>}
                {r.cosmetics.map((c, i) => (
                  <li key={i}>
                    {c.swap === 'none' && <>✨ {c.given}</>}
                    {c.swap === 'swapped' && <>✨ {c.given} <span className="text-slate-400">— you already had {c.won}, so you got this instead</span></>}
                    {c.swap === 'fragments' && <>🌟 +{c.fragments} star fragments <span className="text-slate-400">— you already own every one like {c.won}</span></>}
                  </li>
                ))}
                {r.star_fragments > 0 && <li>🌟 {r.star_fragments.toLocaleString()} star fragments{r.cosmetics.some((c) => c.swap === 'fragments') ? ' in total' : ''}</li>}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-2 text-center text-xs text-slate-500">Cosmetics are in your Wardrobe.</div>
        <button onClick={close} disabled={closing}
          className="mt-4 w-full rounded-xl bg-purple-600 py-2.5 font-semibold text-white hover:bg-purple-500 disabled:opacity-60">
          {closing ? '…' : 'Nice!'}
        </button>
      </div>
    </div>
  );
}
