import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AdminRefundOmenx({ walletAddress }) {
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);

    const handleDryRun = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await base44.functions.invoke('refundAllOmenx', {
                dry_run: true,
            });
            if (res.data?.error) {
                setError(res.data.error);
            } else {
                setPreview(res.data);
                setConfirmStep(true);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await base44.functions.invoke('refundAllOmenx', {
                confirm_refund: true,
            });
            if (res.data?.error) {
                setError(res.data.error);
            } else {
                setResult(res.data);
                setConfirmStep(false);
                setPreview(null);
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
                    {result.txId && <p className="text-slate-400">TX: {result.txId}</p>}
                    <button
                        onClick={() => { setResult(null); setPreview(null); setConfirmStep(false); }}
                        className="mt-4 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-xs font-bold"
                    >
                        Reset
                    </button>
                </div>
            ) : confirmStep && preview ? (
                <div className="space-y-4">
                    <div className="p-3 bg-orange-950/50 border border-orange-700/50 rounded text-sm">
                        <p className="text-orange-300 font-bold mb-2">DRY RUN PREVIEW:</p>
                        <p className="text-slate-300 mb-1">Wallets: {preview.refunded}</p>
                        <p className="text-slate-300 mb-3">Total OMENX: {preview.totalAmount}</p>
                        {preview.payments && preview.payments.length > 0 && (
                            <div className="text-xs text-slate-400 max-h-32 overflow-y-auto">
                                <p className="font-bold mb-1">Sample (first 10):</p>
                                {preview.payments.map((p, i) => (
                                    <p key={i}>{p.walletAddress}: {p.amount} OMENX</p>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-red-300 text-sm font-bold">Confirm to execute refund. This cannot be undone.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-2 rounded font-bold text-sm transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {loading ? 'Processing...' : 'CONFIRM REFUND'}
                        </button>
                        <button
                            onClick={() => { setConfirmStep(false); setPreview(null); }}
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
                        onClick={handleDryRun}
                        disabled={loading}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-6 py-2 rounded font-bold text-sm transition-colors"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {loading ? 'Preview...' : 'Preview Refund (Dry Run)'}
                    </button>
                </div>
            )}
        </div>
    );
}