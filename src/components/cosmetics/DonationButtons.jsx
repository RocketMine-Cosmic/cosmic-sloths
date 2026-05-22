import React from 'react';

function GmtIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/1d2e14d4e_gen-fcaff17865d0f2ed8e19ed81cc1fc502.png" className={className} alt="GMT" />;
}

/**
 * Three dev-support donation buttons ($5 / $10 / $15) priced in GMT at live
 * spot price. Sits at the top of the Cosmetics page, above the catalog.
 * Backend handled via the donation-gmt-* SKUs registered in the OmenX portal —
 * see lib/skuMap.js for the mapping. Donations are pure tips: no grant.
 */
const TIERS = [
    { usd: 5,  emoji: '💜', label: 'Tip' },
    { usd: 10, emoji: '💖', label: 'Support' },
    { usd: 15, emoji: '🌟', label: 'Champion' },
];

export default function DonationButtons({
    gmtPerDollar, gmtBalance, purchasing, omenxBlocked, omenxBlockedMsg, onDonate,
}) {
    return (
        <div className="mb-4 md:mb-5 bg-gradient-to-r from-pink-950/40 via-fuchsia-950/30 to-purple-950/40 border border-pink-500/30 rounded-xl px-3 py-3 md:px-4 md:py-4">
            <div className="flex items-center justify-between mb-2 md:mb-3 gap-2">
                <div>
                    <div className="text-sm md:text-base font-black text-pink-200 uppercase tracking-wider">💜 Tip the Devs</div>
                    <div className="text-[10px] md:text-xs text-pink-300/80">One-click GMT tips — keeps the lights on.</div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
                {TIERS.map(tier => {
                    const gmtAmount = gmtPerDollar > 0 ? gmtPerDollar * tier.usd : 0;
                    const canAfford = (gmtBalance ?? 0) >= gmtAmount && gmtAmount > 0;
                    return (
                        <button
                            key={tier.usd}
                            onClick={() => !purchasing && !omenxBlocked && canAfford && onDonate(tier.usd, gmtAmount)}
                            disabled={!canAfford || purchasing || omenxBlocked}
                            title={omenxBlocked ? (omenxBlockedMsg || 'GMT purchases are temporarily disabled.') : `Tip $${tier.usd} (${gmtAmount.toFixed(2)} GMT)`}
                            className={`relative py-2 md:py-2.5 rounded-lg font-bold transition-colors text-xs md:text-sm flex flex-col items-center justify-center leading-tight ${
                                omenxBlocked ? 'bg-slate-900 text-slate-500 border border-slate-700 cursor-not-allowed' :
                                canAfford && !purchasing ? 'bg-gradient-to-b from-pink-600 to-fuchsia-700 hover:from-pink-500 hover:to-fuchsia-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]' :
                                'bg-slate-900 text-slate-500 border border-slate-700'
                            }`}
                        >
                            <GmtIcon className="absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12" />
                            <span className="font-black">${tier.usd}</span>
                            <span className="text-[9px] md:text-[10px] opacity-90">
                                {gmtAmount > 0 ? `${gmtAmount.toFixed(2)} GMT` : 'Loading…'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}