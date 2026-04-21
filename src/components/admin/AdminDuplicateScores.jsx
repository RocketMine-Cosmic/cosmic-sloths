import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Trash2 } from 'lucide-react';
import moment from 'moment';

function getCurrentWeekId() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${year}-W${String(isoWeek).padStart(2, '0')}`;
}

export default function AdminDuplicateScores({ walletAddress }) {
    const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
    const [period, setPeriod] = useState(getCurrentWeekId());
    const [deleting, setDeleting] = useState({});
    const [msg, setMsg] = useState('');
    const qc = useQueryClient();

    const { data: scores, isLoading } = useQuery({
        queryKey: ['adminAllScores', period],
        queryFn: () => base44.functions.invoke('getAdminDataExtended', {
            type: 'scores', period: 'all', walletAddress, accessToken: authData?.accessToken
        }).then(r => (r.data?.scores || []).filter(s => period === 'all' || s.week_id === period)),
        enabled: !!walletAddress && !!authData?.accessToken,
    });

    // Find duplicates — same wallet, same week, more than one score
    const dupeGroups = (() => {
        if (!scores) return [];
        const map = {};
        scores.forEach(s => {
            const key = `${s.wallet_address}_${s.week_id}`;
            if (!map[key]) map[key] = [];
            map[key].push(s);
        });
        return Object.values(map).filter(g => g.length > 1).sort((a, b) => b.length - a.length);
    })();

    const deleteScore = async (scoreId) => {
        setDeleting(d => ({ ...d, [scoreId]: true }));
        try {
            await base44.entities.RunScore.delete(scoreId);
            qc.invalidateQueries(['adminAllScores']);
            setMsg('✓ Score deleted');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setMsg(`✗ ${e.message}`);
        }
        setDeleting(d => ({ ...d, [scoreId]: false }));
    };

    const keepBestDeleteRest = async (group) => {
        const sorted = [...group].sort((a, b) => b.score - a.score);
        const toDelete = sorted.slice(1);
        for (const s of toDelete) await deleteScore(s.id);
    };

    return (
        <div className="bg-[#0b0416]/80 border border-yellow-900/50 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <h2 className="text-base font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={16} /> Duplicate Score Detector
                </h2>
                <div className="ml-auto flex items-center gap-2">
                    <input
                        type="text"
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        placeholder="e.g. 2026-W16 or all"
                        className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-yellow-500 w-36"
                    />
                    {msg && <span className={`text-xs font-mono ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</span>}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-yellow-500"></div></div>
            ) : dupeGroups.length === 0 ? (
                <div className="text-center text-emerald-400 py-8 text-sm font-bold">✓ No duplicates found for this period.</div>
            ) : (
                <div className="space-y-3">
                    <div className="text-xs text-slate-400 mb-2">{dupeGroups.length} player(s) with multiple scores in <span className="text-yellow-400 font-mono">{period}</span></div>
                    {dupeGroups.map(group => (
                        <div key={group[0].wallet_address + group[0].week_id} className="bg-slate-900/60 border border-yellow-800/40 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="font-bold text-white text-xs">{group[0].player_name}</span>
                                    <span className="text-[10px] text-slate-500 font-mono ml-2">{group[0].wallet_address?.slice(0,8)}...</span>
                                    <span className="ml-2 text-[10px] bg-yellow-900/50 text-yellow-400 px-1.5 py-0.5 rounded font-bold">{group.length} scores</span>
                                </div>
                                <button onClick={() => keepBestDeleteRest(group)}
                                    className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded font-bold transition-colors">
                                    Keep Best, Delete Rest
                                </button>
                            </div>
                            <div className="space-y-1">
                                {group.sort((a, b) => b.score - a.score).map((s, i) => (
                                    <div key={s.id} className="flex items-center justify-between bg-slate-800/60 rounded px-3 py-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold ${i === 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{i === 0 ? '👑 BEST' : `#${i+1}`}</span>
                                            <span className="text-xs font-mono text-white">{s.score.toLocaleString()}</span>
                                            <span className="text-[10px] text-slate-500">{moment(s.created_date).format('MMM D HH:mm')}</span>
                                        </div>
                                        {i > 0 && (
                                            <button onClick={() => deleteScore(s.id)} disabled={deleting[s.id]}
                                                className="text-xs bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors">
                                                <Trash2 size={10} /> {deleting[s.id] ? '...' : 'Delete'}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}