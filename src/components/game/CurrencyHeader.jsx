import React from 'react';
import { Star, Puzzle, Coins } from 'lucide-react';
import { useCurrency } from '@/lib/CurrencyContext';
import { maskWallet } from '@/lib/maskWallet';

function OmenXIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/01838179d_omenx_logo.png" className={className} alt="OMENX" />;
}

function GmtIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/d6e704606_4694-1734211863980.webp" className={className} alt="GMT" />;
}

export default function CurrencyHeader({ omenxAs = 'OMENX' }) {
    const { save, omenxBalance, gmtBalance, loading: omenxLoading } = useCurrency();
    // Cosmetics page swaps the OMENX pill for a GMT pill so users see their
    // actual GMT wallet balance — same visual, different token.
    const showGmt = omenxAs === 'GMT';
    const displayedBalance = showGmt ? gmtBalance : omenxBalance;
    const tokenLabel = showGmt ? 'GMT' : 'OMENX';
    const tooltip = showGmt ? 'GMT Wallet Balance (real-time)' : 'OMENX Wallet Balance (real-time)';

    const formatBalance = (bal) => {
        if (bal === null || bal === undefined) return '…';
        return bal.toFixed(2);
    };

    return (
        <div className="flex flex-wrap justify-end gap-1.5 md:gap-3">
            <div className="flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-yellow-300 bg-yellow-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]" title="Star Fragments">
                <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" /> {save.starFragments || 0}
            </div>
            <div className="flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-fuchsia-300 bg-fuchsia-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-fuchsia-700/50 shadow-[0_0_10px_rgba(217,70,239,0.2)]" title="Relic Fragments">
                <Puzzle className="w-3 h-3 md:w-4 md:h-4 fill-fuchsia-400 text-fuchsia-400" /> {save.relicFragments || 0}
            </div>
            <div
                className={`flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-orange-300 bg-orange-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-orange-500/50 shadow-[0_0_10px_rgba(234,88,12,0.3)] transition-all ${omenxLoading ? 'opacity-60' : ''}`}
                title={tooltip}
            >
                {showGmt ? <GmtIcon className="w-5 h-5 md:w-6 md:h-6" /> : <OmenXIcon className="w-5 h-5 md:w-6 md:h-6" />}
                <span className={displayedBalance === null ? 'opacity-40' : ''}>
                    {omenxLoading && displayedBalance === null ? '…' : formatBalance(displayedBalance)}
                </span>
                <span className="text-[9px] md:text-[10px] text-orange-500 font-bold tracking-wider">{tokenLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-yellow-400 bg-amber-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]" title="Gold">
                <Coins className="w-3 h-3 md:w-4 md:h-4 fill-yellow-500 text-yellow-500" /> {save.gold}
            </div>
        </div>
    );
}