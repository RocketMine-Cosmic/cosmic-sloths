import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw } from 'lucide-react';

// Admin → 🎁 VIP Chests. Every chest win Omen sends lands here (VipChestReceipt).
// "Needs attention" = needs_rob / failed / held / received. Design: claude/handoffs/VIP_CHESTS.md.

const STATUS_STYLE = {
  granted: 'text-green-400', held: 'text-amber-300', test: 'text-slate-400', needs_rob: 'text-red-400',
  failed: 'text-red-400', received: 'text-amber-300', resolved: 'text-slate-300',
};
const STATUS_TEXT = {
  granted: 'Granted', held: 'Held — not played yet', test: 'Test chest', needs_rob: 'Needs you',
  failed: 'Failed', received: 'Received, not processed', resolved: 'Resolved by hand',
};

export default function AdminVipChests() {
  const [filter, setFilter] = useState('attention');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const adminKey = sessionStorage.getItem('admin_key') || undefined;

  const load = async (f = filter) => {
    setLoading(true); setMsg('');
    try {
      const res = await base44.functions.invoke('adminVipChests', { action: 'list', filter: f, adminKey });
      if (res.data?.error) throw new Error(res.data.error);
      setRows(res.data.receipts || []);
    } catch (e) { setMsg(`❌ ${e.message}`); }
    setLoading(false);
  };
  useEffect(() => { load(filter); }, [filter]);

  const act = async (action, id) => {
    let note;
    if (action === 'resolve') {
      note = window.prompt('What did you do? (e.g. "granted by hand via 🎁")');
      if (note === null) return;
    }
    setBusy(id); setMsg('');
    try {
      const res = await base44.functions.invoke('adminVipChests', { action, id, note, adminKey });
      if (res.data?.error) throw new Error(res.data.error);
      setMsg(res.data?.note ? `ℹ️ ${res.data.note}` : `✅ Done`);
      await load();
    } catch (e) { setMsg(`❌ ${e.message}`); }
    setBusy('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-white mr-2">🎁 VIP Chests</h2>
        {[['attention', 'Needs attention'], ['all', 'All wins']].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded text-sm ${filter === k ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{label}</button>
        ))}
        <button onClick={() => load()} className="ml-auto p-1.5 rounded bg-slate-800 text-slate-300" title="Refresh">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>
      {msg && <div className="text-sm text-slate-200">{msg}</div>}
      {!loading && rows.length === 0 && (
        <div className="text-slate-400 text-sm">{filter === 'attention' ? 'Nothing needs you. 👍' : 'No chest wins yet.'}</div>
      )}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg bg-slate-900/80 border border-slate-700 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={`font-semibold ${STATUS_STYLE[r.status] || 'text-white'}`}>{STATUS_TEXT[r.status] || r.status}</span>
              <span className="text-white">{r.chest}</span>
              <span className="font-mono text-slate-400">{r.wallet.slice(0, 6)}…{r.wallet.slice(-4)}</span>
              {r.banned && <span className="text-red-300">(banned wallet)</span>}
              <span className="text-slate-500 ml-auto">{r.received_at ? new Date(r.received_at).toUTCString().slice(5, 22) + ' UTC' : ''}</span>
            </div>
            <div className="text-slate-300 mt-1">Omen: {r.label || '—'}</div>
            {r.granted && <div className="text-green-300 mt-1">Given: {r.granted}</div>}
            {r.error && <div className="text-red-300 mt-1 break-words">{r.error}</div>}
            {r.reapplied > 0 && <div className="text-amber-300 mt-1">Put back {r.reapplied}× after another save write undid it.</div>}
            <div className="flex gap-2 mt-2">
              {['failed', 'held', 'received'].includes(r.status) && (
                <button disabled={busy === r.id} onClick={() => act('retry', r.id)} className="px-3 py-1 rounded bg-purple-600 text-white disabled:opacity-50">
                  {busy === r.id ? 'Working…' : 'Retry grant'}</button>
              )}
              {['needs_rob', 'failed'].includes(r.status) && (
                <button disabled={busy === r.id} onClick={() => act('resolve', r.id)} className="px-3 py-1 rounded bg-slate-700 text-white disabled:opacity-50">
                  Mark handled by hand</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
