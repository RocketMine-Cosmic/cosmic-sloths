import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function AdminDataWipe({ walletAddress }) {
    const { toast } = useToast();
    const [adminKey, setAdminKey] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);

    const handleWipe = async (e) => {
        e.preventDefault();
        if (confirm !== 'RESET_ALL_PLAYER_DATA') {
            toast({ title: 'Wrong confirmation', description: 'Type exactly: RESET_ALL_PLAYER_DATA', variant: 'destructive' });
            return;
        }
        setLoading(true);
        setResults(null);
        try {
            const res = await base44.functions.invoke('resetAllPlayerData', { adminKey, confirm });
            if (res.data?.error) throw new Error(res.data.error);
            setResults(res.data.deleted);
            toast({ title: '✅ Wipe Complete', description: 'All player data has been deleted.' });
        } catch (err) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
        setLoading(false);
    };

    return (
        <div className="max-w-xl space-y-6">
            <div className="bg-red-950/40 border-2 border-red-600 rounded-xl p-5 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                <div>
                    <h2 className="text-red-400 font-black uppercase tracking-widest mb-1">⚠️ Full Data Wipe</h2>
                    <p className="text-slate-300 text-sm">This permanently deletes <strong>all</strong> RunScores, PlayerSaves, TokenPools, SpendLogs, PayoutLogs, Squads, Members, Messages, GlobalBosses, Contributions, and Events. <strong>This cannot be undone.</strong></p>
                </div>
            </div>

            <form onSubmit={handleWipe} className="bg-slate-900/60 border border-slate-700 rounded-xl p-5 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Admin Secret Key</label>
                    <input
                        type="password"
                        value={adminKey}
                        onChange={e => setAdminKey(e.target.value)}
                        placeholder="Enter AdminDash secret"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm font-mono outline-none focus:border-red-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Type to confirm</label>
                    <input
                        type="text"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="RESET_ALL_PLAYER_DATA"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm font-mono outline-none focus:border-red-500"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || confirm !== 'RESET_ALL_PLAYER_DATA'}
                    className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3 rounded-lg uppercase tracking-widest transition-colors"
                >
                    {loading ? 'Wiping...' : '🗑️ Wipe All Data'}
                </button>
            </form>

            {results && (
                <div className="bg-slate-900/60 border border-emerald-700 rounded-xl p-4">
                    <h3 className="text-emerald-400 font-bold mb-2">Deleted Records</h3>
                    <div className="space-y-1">
                        {Object.entries(results).map(([entity, count]) => (
                            <div key={entity} className="flex justify-between text-sm">
                                <span className="text-slate-400">{entity}</span>
                                <span className="text-white font-mono">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}