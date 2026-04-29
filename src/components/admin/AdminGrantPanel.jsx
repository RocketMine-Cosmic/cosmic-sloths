import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Gift, Search } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

// Quick-grant tool for support tickets — lets staff add gold/fragments/seasonal points
// to a player's save without diving into the full PlayerSaveEditor.
// Uses the existing adminPatchSave function (which already enforces 'edit_players' perm
// and writes to the audit log automatically).

const GRANT_TYPES = [
    { id: 'gold',            label: '💰 Gold',            saveKey: 'gold' },
    { id: 'relicFragments',  label: '🔮 Relic Fragments', saveKey: 'relicFragments' },
    { id: 'starFragments',   label: '⭐ Star Fragments',  saveKey: 'starFragments' },
    { id: 'seasonalPoints',  label: '🏆 Seasonal Points', saveKey: 'seasonalPoints' },
];

export default function AdminGrantPanel({ walletAddress }) {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [selected, setSelected] = useState(null);
    const [grantType, setGrantType] = useState('gold');
    const [amount, setAmount] = useState(1000);
    const [reason, setReason] = useState('');
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');

    const search = async () => {
        if (!query.trim()) return;
        setSearching(true); setResults([]); setSelected(null); setMsg('');
        try {
            const res = await base44.functions.invoke('getAdminDataExtended', { type: 'playerSearch', query: query.trim() });
            setResults(res.data?.players || []);
            if (!(res.data?.players || []).length) setMsg('✗ No players found.');
        } catch (e) { setMsg(`✗ ${e.message}`); }
        setSearching(false);
    };

    const grant = async () => {
        if (!selected) return;
        setBusy(true); setMsg('');
        try {
            const key = GRANT_TYPES.find(g => g.id === grantType).saveKey;
            const current = Number(selected.save_data?.[key] || 0);
            const next = current + Number(amount);
            const res = await base44.functions.invoke('adminPatchSave', {
                saveId: selected.id,
                patch: { [key]: next, _lastGrant: { type: grantType, amount: Number(amount), reason: reason.trim(), at: Date.now() } },
                adminKey: sessionStorage.getItem('admin_key') || undefined,
            });
            if (res.data?.error) throw new Error(res.data.error);
            setMsg(`✓ Granted ${Number(amount).toLocaleString()} ${GRANT_TYPES.find(g => g.id === grantType).label} → ${selected.save_data?.pilotName || selected.wallet_address?.slice(0, 8)} (${current.toLocaleString()} → ${next.toLocaleString()})`);
            setSelected(s => ({ ...s, save_data: { ...s.save_data, [key]: next } }));
            setAmount(1000); setReason('');
        } catch (e) { setMsg(`✗ ${e.message}`); }
        setBusy(false); setConfirm(false);
    };

    return (
        <div className="bg-[#0b0416]/80 border border-emerald-900/50 rounded-xl p-4">
            <h2 className="text-base font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Gift size={16} /> Grant Items / Currency
            </h2>
            <div className="text-xs text-slate-400 mb-4">
                Quick support-ticket tool. Adds the chosen amount to the player's save and writes to the audit log automatically.
            </div>

            {/* Search */}
            <div className="flex gap-2 mb-3">
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                    placeholder="Wallet address or player name…"
                    className="flex-1 bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500" />
                <button onClick={search} disabled={searching}
                    className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold text-sm flex items-center gap-2">
                    <Search size={14} /> {searching ? '…' : 'Find'}
                </button>
            </div>

            {/* Results */}
            {results.length > 0 && !selected && (
                <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
                    {results.map(p => (
                        <button key={p.id} onClick={() => setSelected(p)}
                            className="w-full text-left bg-slate-900/60 border border-slate-700 hover:border-emerald-600 rounded px-3 py-1.5 transition-colors">
                            <div className="text-sm font-bold text-white">{p.save_data?.pilotName || p.player_name || 'Unnamed'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{p.wallet_address?.slice(0,10)}…{p.wallet_address?.slice(-6)} · {(p.save_data?.gold || 0).toLocaleString()} G</div>
                        </button>
                    ))}
                </div>
            )}

            {/* Form */}
            {selected && (
                <div className="bg-slate-900/60 border border-emerald-700/40 rounded-lg p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                            <div className="text-sm font-bold text-white">{selected.save_data?.pilotName || 'Unnamed'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{selected.wallet_address}</div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                Current: 💰 {(selected.save_data?.gold || 0).toLocaleString()} · 🔮 {(selected.save_data?.relicFragments || 0).toLocaleString()} · ⭐ {(selected.save_data?.starFragments || 0).toLocaleString()} · 🏆 {(selected.save_data?.seasonalPoints || 0).toLocaleString()}
                            </div>
                        </div>
                        <button onClick={() => { setSelected(null); setResults([]); setQuery(''); }}
                            className="text-[10px] text-slate-400 hover:text-white">← change player</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-slate-500 uppercase">Item</label>
                            <select value={grantType} onChange={e => setGrantType(e.target.value)} style={{ colorScheme: 'dark' }}
                                className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500">
                                {GRANT_TYPES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-slate-500 uppercase">Amount</label>
                            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value) || 0)}
                                className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-mono" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-slate-500 uppercase">Reason (audit log)</label>
                            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                                placeholder="e.g. Refund for ticket #123"
                                className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500" />
                        </div>
                    </div>

                    <button onClick={() => setConfirm(true)} disabled={!amount || amount <= 0}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold text-sm">
                        Grant {Number(amount).toLocaleString()} {GRANT_TYPES.find(g => g.id === grantType).label}
                    </button>
                </div>
            )}

            {msg && <div className={`mt-3 text-sm font-mono ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</div>}

            <ConfirmDialog
                open={confirm}
                onClose={() => !busy && setConfirm(false)}
                onConfirm={grant}
                busy={busy}
                title="Confirm grant"
                description={selected ? `Grant ${Number(amount).toLocaleString()} ${GRANT_TYPES.find(g => g.id === grantType).label} to ${selected.save_data?.pilotName || selected.wallet_address?.slice(0, 10)}?${reason ? ` Reason: "${reason}"` : ' No reason provided.'}` : ''}
                confirmLabel="Grant"
            />
        </div>
    );
}