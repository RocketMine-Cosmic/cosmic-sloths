import React from 'react';

function GmtIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/1d2e14d4e_gen-fcaff17865d0f2ed8e19ed81cc1fc502.png" className={className} alt="GMT" />;
}

/**
 * Grid for trail & kill-effect cosmetics. Extracted from pages/Upgrades.jsx
 * verbatim (visuals + button wiring unchanged) so the standalone page renders
 * the exact same way the old Cosmetics tab did. GMT-only pricing wires in
 * separately once getTokenPrices is plumbed into the buy buttons.
 */
export default function CosmeticGrid({
    list, slot, save, unlockKey, freeId, equippedId,
    omenxBalance, gmtCost, usdCost, omenxBlocked, omenxBlockedMsg, purchasing,
    onBuy, onPreview, onConfirmTokenPurchase,
}) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {list.map(cosmetic => {
                const unlocked = save[unlockKey] || [freeId];
                const isOwned = unlocked.includes(cosmetic.id);
                const isEquipped = equippedId === cosmetic.id;
                const canAffordGold = save.gold >= cosmetic.goldCost;
                const canAffordToken = (omenxBalance ?? 0) >= cosmetic.tokenCost;

                return (
                    <div
                        key={cosmetic.id}
                        className={`bg-slate-800 p-3 rounded-xl border-2 flex flex-col gap-2 transition-all ${
                            isEquipped ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-slate-700 hover:border-slate-600'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{cosmetic.icon}</span>
                            <div>
                                <div className="font-bold text-sm text-white leading-tight">{cosmetic.name}</div>
                                {isEquipped && <div className="text-[10px] text-pink-400 font-bold">EQUIPPED</div>}
                                {!isOwned && cosmetic.goldCost > 0 && <div className="text-[10px] text-slate-500 font-bold">LOCKED</div>}
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{cosmetic.desc}</p>

                        {isOwned ? (
                            <button
                                onClick={() => onBuy(cosmetic, slot, 'gold')}
                                disabled={isEquipped}
                                className={`w-full py-1.5 rounded-lg font-bold transition-colors text-xs ${
                                    isEquipped ? 'bg-pink-700 text-pink-200 cursor-default' : 'bg-slate-700 text-white hover:bg-slate-600'
                                }`}
                            >
                                {isEquipped ? '✓ EQUIPPED' : 'EQUIP'}
                            </button>
                        ) : (
                            <div className="flex gap-1.5 w-full flex-col">
                                <button
                                    onClick={() => onPreview(cosmetic, slot)}
                                    className="w-full py-1 rounded-lg font-bold transition-colors text-xs bg-slate-700 text-slate-300 hover:bg-slate-600"
                                >
                                    👁 Preview
                                </button>
                                {cosmetic.tokenCost > 0 && (() => {
                                    // Flat GMT pricing — same GMT amount for every cosmetic.
                                    const canAffordGmt = (omenxBalance ?? 0) >= gmtCost;
                                    return (
                                        <button
                                            onClick={() => !purchasing && !omenxBlocked && onConfirmTokenPurchase(cosmetic, slot)}
                                            disabled={!canAffordGmt || purchasing || omenxBlocked}
                                            title={omenxBlocked ? (omenxBlockedMsg || 'GMT purchases are temporarily disabled.') : undefined}
                                            className={`w-full py-1.5 rounded-lg font-bold transition-colors text-xs flex flex-col items-center justify-center leading-tight ${
                                                omenxBlocked ? 'bg-slate-900 text-slate-500 border border-slate-700 cursor-not-allowed' :
                                                canAffordGmt && !purchasing ? 'bg-orange-600 hover:bg-orange-500 text-white' :
                                                'bg-slate-900 text-slate-500 border border-slate-700'
                                            }`}
                                        >
                                            {omenxBlocked ? '🔒 PAUSED' : gmtCost > 0 ? (
                                                <>
                                                    <span className="relative w-full flex items-center justify-center">
                                                        <GmtIcon className="absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12" />
                                                        <span>{gmtCost.toFixed(2)} GMT</span>
                                                    </span>
                                                    {usdCost > 0 && <span className="text-[10px] opacity-80">≈ ${usdCost.toFixed(2)}</span>}
                                                </>
                                            ) : 'Loading…'}
                                        </button>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}