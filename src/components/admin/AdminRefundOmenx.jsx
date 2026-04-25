import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AdminRefundOmenx({ walletAddress }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);

    const handleRefund = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await base44.functions.invoke('refundAllOmenx', {
                adminKey: sessionStorage.getItem('admin_key'),
                confirm_refund: true,
            });
            if (res.data?.error) {
                setError(res.data.error);
            } else {
                setResult(res.data);
                setConfirmStep(false);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border-2 border-orange-600 p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-bold text-orange-400">⚠️ Refund All OMENX</h3>
            </div>

            {result ? (
                <div className="space-y-2 text-sm">
                    <p className="text-green-400 font-bold">✓ Refund Complete</p>
                    <p>Wallets refunded: {result.refunded}</p>
                    <p>Total OMENX: {result.totalAmount}</p>
                    {result.failedWallets && (
                        <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-xs">
                            <p className="font-bold mb-2">Failed wallets ({result.failedCount}):</p>
                            {result.failedWallets.map((w, i) => (
                                <p key={i}>{w.walletAddress}: {w.reason}</p>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => { setResult(null); setConfirmStep(false); }}
                        className="mt-4 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-xs font-bold"
                    >
                        Reset
                    </button>
                </div>
            ) : confirmStep ? (
                <div className="space-y-4">
                    <p className="text-red-300 text-sm font-bold">This will refund ALL OMENX tokens ever spent by all players. This cannot be undone.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={handleRefund}
                            disabled={loading}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-2 rounded font-bold text-sm transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {loading ? 'Processing...' : 'CONFIRM REFUND'}
                        </button>
                        <button
                            onClick={() => setConfirmStep(false)}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded font-bold text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-slate-300 text-sm">Calculates total OMENX spent by all players and issues refunds via OmenX API.</p>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button
                        onClick={() => setConfirmStep(true)}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded font-bold text-sm"
                    >
                        Initiate Refund
                    </button>
                </div>
            )}
        </div>
    );
}