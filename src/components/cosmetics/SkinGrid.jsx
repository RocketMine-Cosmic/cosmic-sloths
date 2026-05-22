import React from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { CHARACTERS, SKIN_COSMETICS } from '../../game/Constants';
import { SoundManager } from '../../game/SoundManager';

function GmtIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/d6e704606_4694-1734211863980.webp" className={className} alt="GMT" />;
}

const QUEST_POINTS_PER_SKIN = 100;

/**
 * Skin selector + grid. Extracted from pages/Upgrades.jsx — the per-character
 * skin browser. Drives the parent's preview/buy/equip/claim handlers.
 */
export default function SkinGrid({
    save, unlockedChars, skinCharIndex, setSkinCharIndex,
    previewSkinColor, setPreviewSkinColor,
    omenxBalance, gmtCost, usdCost, omenxBlocked, omenxBlockedMsg, purchasing,
    claimingSkinId, onBuy, onClaimQuest, onConfirmTokenPurchase,
}) {
    const currentChar = CHARACTERS.find(c => c.id === unlockedChars[skinCharIndex % unlockedChars.length]) || CHARACTERS[0];
    const charSkins = SKIN_COSMETICS.filter(s => s.charId === currentChar.id);
    const equippedSkinId = save.cosmetics?.skins?.[currentChar.id] || `${currentChar.id}_default`;
    const equippedSkin = SKIN_COSMETICS.find(s => s.id === equippedSkinId) || charSkins[0];
    const displayColor = previewSkinColor || equippedSkin?.color || currentChar.color;
    const unlockedSkins = save.unlockedSkins || [];

    return (
        <div>
            {/* Skin color preview */}
            <div className="mb-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                <div className="relative shrink-0">
                    <div
                        className="w-16 h-16 rounded-full border-4 border-slate-600 overflow-hidden bg-slate-900 flex items-center justify-center shadow-lg"
                        style={{ boxShadow: `0 0 20px ${displayColor}60` }}
                    >
                        {currentChar.image
                            ? <img src={currentChar.image} alt={currentChar.name} className="w-full h-full object-cover" style={{ filter: `drop-shadow(0 0 6px ${displayColor})` }} />
                            : <div className="w-10 h-10 rounded-full" style={{ background: displayColor }} />
                        }
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800" style={{ background: displayColor }} />
                </div>
                <div>
                    <div className="font-bold text-white text-sm">{currentChar.name}</div>
                    {previewSkinColor
                        ? <div className="text-xs text-amber-400 font-bold mt-0.5">👁 Previewing color</div>
                        : <div className="text-xs text-pink-400 font-bold mt-0.5">Equipped: {equippedSkin?.name || 'Default'}</div>
                    }
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-3 h-3 rounded-full border border-slate-600" style={{ background: displayColor }} />
                        <span className="text-[10px] text-slate-500 font-mono">{displayColor}</span>
                    </div>
                </div>
            </div>

            {/* Character selector */}
            <div className="flex items-center justify-between bg-slate-800 p-2 rounded-xl mb-4 border border-slate-700">
                <button
                    onClick={() => { SoundManager.playUIClick(); setSkinCharIndex(i => (i - 1 + unlockedChars.length) % unlockedChars.length); setPreviewSkinColor(null); }}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-500" style={{ borderColor: currentChar.color }}>
                        {currentChar.image ? <img src={currentChar.image} alt={currentChar.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800" />}
                    </div>
                    <div className="font-bold text-white">
                        {currentChar.name}
                        <div className="text-xs text-slate-500 font-normal">{skinCharIndex % unlockedChars.length + 1} / {unlockedChars.length}</div>
                    </div>
                </div>
                <button
                    onClick={() => { SoundManager.playUIClick(); setSkinCharIndex(i => (i + 1) % unlockedChars.length); setPreviewSkinColor(null); }}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                {charSkins.map(skin => {
                    const isOwned = skin.goldCost === 0 || unlockedSkins.includes(skin.id);
                    const isEquipped = equippedSkinId === skin.id;

                    return (
                        <div key={skin.id} className={`bg-slate-800 p-3 rounded-xl border-2 flex flex-col gap-2 transition-all ${isEquipped ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-slate-700 hover:border-slate-600'}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full border-2 shrink-0" style={{ background: skin.color, borderColor: skin.color + '80' }} />
                                <div>
                                    <div className="font-bold text-sm text-white leading-tight">{skin.name}</div>
                                    {isEquipped && <div className="text-[10px] text-pink-400 font-bold">EQUIPPED</div>}
                                    {!isOwned && <div className="text-[10px] text-slate-500 font-bold">LOCKED</div>}
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">
                                {skin.isSeasonalReward
                                    ? 'Quest Milestone Reward: Earn Quest Points from Daily Missions to unlock!'
                                    : skin.desc}
                            </p>
                            {isOwned ? (
                                <button
                                    onClick={() => onBuy(skin, 'skin', 'gold')}
                                    disabled={isEquipped}
                                    className={`w-full py-1.5 rounded-lg font-bold transition-colors text-xs ${isEquipped ? 'bg-pink-700 text-pink-200 cursor-default' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                                >
                                    {isEquipped ? '✓ EQUIPPED' : 'EQUIP'}
                                </button>
                            ) : (
                                <div className="flex gap-1.5 w-full flex-col">
                                    <button
                                        onClick={() => onBuy(skin, 'skin', 'preview')}
                                        className={`w-full py-1 rounded-lg font-bold transition-colors text-xs ${previewSkinColor === skin.color ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                    >
                                        {previewSkinColor === skin.color ? '👁 Previewing' : '👁 Preview'}
                                    </button>
                                    {skin.isSeasonalReward ? (() => {
                                        const points = save.seasonalPoints || 0;
                                        const canClaim = points >= QUEST_POINTS_PER_SKIN;
                                        const isClaimingThis = claimingSkinId === skin.id;
                                        return (
                                            <button
                                                onClick={() => canClaim && !claimingSkinId && onClaimQuest(skin)}
                                                disabled={!canClaim || !!claimingSkinId}
                                                title={canClaim ? `Spend ${QUEST_POINTS_PER_SKIN} Quest Points to claim this skin` : `You need ${QUEST_POINTS_PER_SKIN - points} more Quest Points`}
                                                className={`w-full py-1.5 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-1 ${
                                                    canClaim && !isClaimingThis
                                                        ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 shadow-[0_0_10px_rgba(234,179,8,0.4)] animate-pulse'
                                                        : 'bg-slate-900 text-slate-500 border border-slate-700 cursor-not-allowed'
                                                }`}
                                            >
                                                {isClaimingThis ? '…' : canClaim ? <>🏆 Claim ({QUEST_POINTS_PER_SKIN} Pts)</> : <><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {points} / {QUEST_POINTS_PER_SKIN} Pts</>}
                                            </button>
                                        );
                                    })() : (skin.tokenCost > 0 && (() => {
                                        // Flat GMT pricing — same GMT amount for every cosmetic.
                                        const canAffordGmt = (omenxBalance ?? 0) >= gmtCost;
                                        return (
                                            <button
                                                onClick={() => !purchasing && !omenxBlocked && onConfirmTokenPurchase(skin, 'skin')}
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
                                                        <span className="flex items-center gap-1"><GmtIcon className="w-5 h-5" /> {gmtCost.toFixed(2)} GMT</span>
                                                        {usdCost > 0 && <span className="text-[10px] opacity-80">≈ ${usdCost.toFixed(2)}</span>}
                                                    </>
                                                ) : 'Loading…'}
                                            </button>
                                        );
                                    })())}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}