import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, User } from 'lucide-react';
import moment from 'moment';

export default function AdminPlayers({ walletAddress }) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();

    const handleSearch = async () => {
        if (!search.trim()) return;
        setLoading(true);
        setSelected(null);
        try {
            const res = await base44.functions.invoke('getAdminDataExtended', { type: 'playerSearch', query: search.trim(), walletAddress, accessToken: authData?.accessToken });
            setResults(res.data?.players || []);
        } catch (e) {
            setResults([]);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="bg-[#0b0416]/80 border border-cyan-900/50 rounded-xl p-4">
                <h2 className="text-base font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2"><User size={16} /> Player Search</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Wallet address or player name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="flex-1 bg-slate-900 border border-cyan-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                    />
                    <button onClick={handleSearch} disabled={loading}
                        className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2">
                        <Search size={14} /> {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {results !== null && !selected && (
                    <div className="mt-4">
                        {results.length === 0 ? (
                            <div className="text-slate-500 text-sm">No players found.</div>
                        ) : (
                            <div className="space-y-2">
                                {results.map(p => (
                                    <button key={p.id} onClick={() => setSelected(p)}
                                        className="w-full text-left bg-slate-900/60 border border-slate-700 hover:border-cyan-600 rounded-lg p-3 transition-colors">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-white text-sm">{p.wallet_address}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">Last updated: {moment(p.updated_date).fromNow()}</div>
                                            </div>
                                            <span className="text-xs text-cyan-400 font-bold">View →</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {selected && (
                    <div className="mt-4">
                        <button onClick={() => setSelected(null)} className="text-xs text-slate-400 hover:text-white mb-3 flex items-center gap-1">← Back to results</button>
                        <div className="bg-slate-900/60 border border-cyan-700/50 rounded-xl p-4">
                            <div className="text-sm font-bold text-cyan-300 mb-3 font-mono">{selected.wallet_address}</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-[10px] text-slate-500 uppercase">Gold</div>
                                    <div className="font-mono font-bold text-yellow-400">{selected.save_data?.gold?.toLocaleString() || 0}</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-[10px] text-slate-500 uppercase">Relic Frags</div>
                                    <div className="font-mono font-bold text-fuchsia-400">{selected.save_data?.relicFragments || 0}</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-[10px] text-slate-500 uppercase">Total Kills</div>
                                    <div className="font-mono font-bold text-red-400">{selected.save_data?.totalKills?.toLocaleString() || 0}</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-[10px] text-slate-500 uppercase">Characters</div>
                                    <div className="font-mono font-bold text-green-400">{selected.save_data?.unlockedCharacters?.length || 0}</div>
                                </div>
                            </div>
                            <div className="bg-slate-950 rounded-lg p-3 max-h-64 overflow-y-auto">
                                <div className="text-[10px] text-slate-500 uppercase mb-2">Raw Save Data</div>
                                <pre className="text-[10px] text-slate-300 whitespace-pre-wrap break-all">
                                    {JSON.stringify(selected.save_data, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}