import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

function GmtIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/01838179d_omenx_logo.png" className={className} alt="GMT" />;
}

/**
 * GMT balance header for Cosmetics page — shows live GMT spot price
 * and a simple "Loading..." state if the price fetch fails.
 */
export default function GmtHeader() {
    const [gmtBalance, setGmtBalance] = useState(0);
    const [gmtPrice, setGmtPrice] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGmtData = async () => {
            try {
                const res = await base44.functions.invoke('getTokenPrices', {});
                const gmtUsd = res.data?.prices?.GMT?.usd;
                if (typeof gmtUsd === 'number' && gmtUsd > 0) {
                    setGmtPrice(gmtUsd);
                }
            } catch (err) {
                console.error('[GmtHeader] Failed to fetch GMT price:', err?.message);
            } finally {
                setLoading(false);
            }
        };
        fetchGmtData();
    }, []);

    // Display $2.50 / GMT-USD spot price
    const displayBalance = gmtPrice ? (2.50 / gmtPrice).toFixed(2) : '?';

    return (
        <div className="flex items-center gap-3">
            <div className="bg-purple-900/40 border border-purple-500/50 px-3 py-2 rounded-lg flex items-center gap-2 font-bold text-sm">
                <GmtIcon className="w-4 h-4" />
                <span className={loading ? 'text-slate-500' : 'text-purple-300'}>
                    {loading ? 'Loading…' : `${displayBalance} GMT`}
                </span>
            </div>
        </div>
    );
}