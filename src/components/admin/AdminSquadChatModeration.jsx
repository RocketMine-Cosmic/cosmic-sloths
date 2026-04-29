import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Trash2, RefreshCw, Search } from 'lucide-react';
import moment from 'moment';
import ConfirmDialog from './ConfirmDialog';

export default function AdminSquadChatModeration({ walletAddress }) {
    const qc = useQueryClient();
    const [filter, setFilter] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');

    const { data: messages = [], isLoading, refetch } = useQuery({
        queryKey: ['squadMessagesAll'],
        queryFn: () => base44.functions.invoke('getAdminDataExtended', { type: 'squadMessages' })
            .then(r => r.data?.messages || []),
    });

    const filtered = messages.filter(m => {
        if (!filter.trim()) return true;
        const q = filter.toLowerCase();
        return m.content?.toLowerCase().includes(q)
            || m.player_name?.toLowerCase().includes(q)
            || m.squad_name?.toLowerCase().includes(q)
            || m.wallet_address?.toLowerCase().includes(q);
    });

    const handleDelete = async () => {
        if (!confirm) return;
        setBusy(true); setMsg('');
        try {
            const res = await base44.functions.invoke('deleteSquadMessage', {
                messageId: confirm.id,
                adminKey: sessionStorage.getItem('admin_key') || undefined,
            });
            if (res.data?.error) throw new Error(res.data.error);
            qc.invalidateQueries(['squadMessagesAll']);
            setMsg(`✓ Deleted message from ${confirm.player_name}`);
            setConfirm(null);
        } catch (e) { setMsg(`✗ ${e.message}`); }
        setBusy(false);
    };

    return (
        <div className="bg-[#0b0416]/80 border border-orange-900/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h2 className="text-base font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={16} /> Squad Chat Moderation
                </h2>
                <span className="text-[10px] text-slate-500">Last 200 messages</span>
                <button onClick={() => refetch()} className="ml-auto text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded font-bold flex items-center gap-1">
                    <RefreshCw size={11} /> Refresh
                </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
                <Search size={14} className="text-slate-500" />
                <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
                    placeholder="Filter by content, player, squad, or wallet…"
                    className="flex-1 bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500" />
            </div>

            {msg && <div className={`text-xs font-mono mb-2 ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</div>}

            {isLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-orange-500"></div></div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-slate-500 py-6 text-sm">No messages match.</div>
            ) : (
                <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                    {filtered.map(m => (
                        <div key={m.id} className="bg-slate-900/60 border border-orange-800/30 rounded px-3 py-2 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-white text-xs">{m.player_name}</span>
                                    <span className="text-[10px] text-orange-400 font-mono">[{m.squad_name}]</span>
                                    <span className="text-[10px] text-slate-500">{moment(m.created_date).fromNow()}</span>
                                </div>
                                <div className="text-sm text-slate-200 mt-1 break-words whitespace-pre-wrap">{m.content}</div>
                                <div className="text-[9px] text-slate-600 font-mono mt-1">{m.wallet_address?.slice(0, 10)}…{m.wallet_address?.slice(-6)}</div>
                            </div>
                            <button onClick={() => setConfirm(m)}
                                className="bg-red-900/60 hover:bg-red-800 text-red-200 text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-colors shrink-0">
                                <Trash2 size={11} /> Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={!!confirm}
                onClose={() => !busy && setConfirm(null)}
                onConfirm={handleDelete}
                busy={busy}
                title="Delete squad message"
                description={confirm ? `Permanently delete this message from ${confirm.player_name} in [${confirm.squad_name}]?` : ''}
                items={confirm ? [`"${(confirm.content || '').slice(0, 200)}"`] : []}
                confirmLabel="Delete message"
            />
        </div>
    );
}