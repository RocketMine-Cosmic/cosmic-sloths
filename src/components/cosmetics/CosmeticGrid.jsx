import React from 'react';
import { Coins } from 'lucide-react';

function OmenXIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/01838179d_omenx_logo.png" className={className} alt="OMENX" />;
}

/**
 * Grid for trail & kill-effect cosmetics. Extracted from pages/Upgrades.jsx
 * verbatim (visuals + button wiring unchanged) so the standalone page renders
 * the exact same way the old Cosmetics tab did. GMT-only pricing wires in
 * separately once getTokenPrices is plumbed into the buy buttons.
 */
export default function CosmeticGrid({
    list, slot, save, unlockKey, freeId, equippedId,
    omenxBalance, omenxBlocked, omenxBlockedMsg, purchasing,
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
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => onBuy(cosmetic, slot, 'gold')}
                                        disabled={!canAffordGold || purchasing}
                                        className={`flex-1 py-1.5 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-1 ${
                                            canAffordGold && !purchasing
                                                ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
                                                : 'bg-slate-900 text-slate-500 border border-slate-700'
                                        }`}
                                    >
                                        <Coins className="w-3 h-3 fill-current" /> {cosmetic.goldCost.toLocaleString()} Gold
                                    </button>
                                    {cosmetic.tokenCost > 0 && (
                                        <button
                                            onClick={() => !purchasing && !omenxBlocked && onConfirmTokenPurchase(cosmetic, slot)}
                                            disabled={!canAffordToken || purchasing || omenxBlocked}
                                            title={omenxBlocked ? (omenxBlockedMsg || 'OMENX purchases are temporarily disabled.') : undefined}
                                            className={`flex-1 py-1.5 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-1 ${
                                                omenxBlocked ? 'bg-slate-900 text-slate-500 border border-slate-700 cursor-not-allowed' :
                                                canAffordToken && !purchasing ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                                                'bg-slate-900 text-slate-500 border border-slate-700'
                                            }`}
                                        >
                                            {omenxBlocked ? '🔒 PAUSED' : <><OmenXIcon className="w-3 h-3" /> {cosmetic.tokenCost.toLocaleString()} OMENX</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}