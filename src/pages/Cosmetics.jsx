import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS, TRAIL_COSMETICS, KILL_COSMETICS, SKIN_COSMETICS } from '../game/Constants';
import { SoundManager } from '../game/SoundManager';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/CurrencyContext';
import { ensureNftsFetched, refreshBalance } from '@/lib/playerDataCache';
import { useOmenXConfirmation } from '@/hooks/useOmenXConfirmation';
import { useOmenXPurchasesDisabled } from '@/hooks/useOmenXPurchasesDisabled';
import { getCosmeticSku } from '@/lib/skuMap';
import OmenXConfirmation from '../components/game/OmenXConfirmation';
import OmenXGate from '../components/game/OmenXGate';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import CosmeticPreview from '../components/game/CosmeticPreview';
import CosmeticGrid from '../components/cosmetics/CosmeticGrid';
import SkinGrid from '../components/cosmetics/SkinGrid';

/**
 * Standalone Cosmetics page — promoted out of pages/Upgrades.jsx into its own
 * WarpMenu destination so cosmetics get the visibility they deserve. Foundation
 * step only: visuals + buy flows are extracted verbatim from the old tab.
 * Next step plumbs GMT-only pricing per docs/COSMETICS_GMT_PRICING.md and flips
 * grantType==='cosmetic' purchases to excluded_from_pool on the backend.
 */
export default function Cosmetics({ isCarousel }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());
    const { omenxBalance, nfts } = useCurrency();
    const { pending, confirm: confirmPurchase } = useOmenXConfirmation('cosmetics-page');
    const { disabled: omenxBlocked, message: omenxBlockedMsg } = useOmenXPurchasesDisabled();

    const [cosmeticTab, setCosmeticTab] = useState('trail'); // 'trail' | 'kill' | 'skin'
    const [skinCharIndex, setSkinCharIndex] = useState(0);
    const [previewSkinColor, setPreviewSkinColor] = useState(null);
    const [purchasing, setPurchasing] = useState(false);
    const [purchaseError, setPurchaseError] = useState(null);
    const [claimingSkinId, setClaimingSkinId] = useState(null);
    const [gmtPrices, setGmtPrices] = useState({}); // SKU → GMT cost

    useEffect(() => { ensureNftsFetched(); }, []);

    // Fetch GMT pricing for cosmetics from getTokenPrices backend function
    useEffect(() => {
        const fetchGmtPrices = async () => {
            try {
                const res = await base44.functions.invoke('getTokenPrices', { tokenType: 'GMT' });
                if (res.data?.prices) {
                    setGmtPrices(res.data.prices);
                }
            } catch (err) {
                console.error('[Cosmetics] Failed to fetch GMT prices:', err?.message);
            }
        };
        fetchGmtPrices();
    }, []);

    useEffect(() => {
        const handleSaveUpdated = (e) => setSave(e.detail);
        window.addEventListener('saveUpdated', handleSaveUpdated);
        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, []);

    // NFT-unlocked characters are visible on the skin tab via the char selector.
    const nftUnlockedChars = React.useMemo(() => {
        return (nfts || [])
            .map(nft => nft.metadata?.name?.toLowerCase())
            .filter(charId => charId && CHARACTERS.find(c => c.id === charId));
    }, [nfts]);

    const effectiveUnlockedCharacters = React.useMemo(() => {
        return [...new Set([...(save.unlockedCharacters || ['neobyte']), ...nftUnlockedChars])];
    }, [save.unlockedCharacters, nftUnlockedChars]);

    // Preview char for the trail/kill live preview — defaults to whichever char
    // the skin tab selector is on, so all three tabs feel cohesive.
    const previewCharId = effectiveUnlockedCharacters[skinCharIndex % effectiveUnlockedCharacters.length] || 'neobyte';

    const friendlyError = (errMsg) => {
        const m = (errMsg || '').toLowerCase();
        if (m.includes('429') || m.includes('rate')) return 'Server is busy. Please try again in a moment.';
        if (m.includes('502') || m.includes('503') || m.includes('504') || m.includes('gateway') || m.includes('timeout') || m.includes('network')) return 'OMENX network is busy. Please try again in a moment.';
        if (m.includes('not enough gold')) return "You don't have enough Gold for this.";
        if (m.includes('not enough') || m.includes('insufficient')) return "You don't have enough to buy this.";
        if (m.includes('already unlocked') || m.includes('already owned')) return 'You already own this cosmetic.';
        if (m.includes('unauthorized') || m.includes('401')) return 'Please sign in again to continue.';
        return 'Something went wrong. Please try again.';
    };

    const spendGold = async (grantInfo) => {
        setPurchaseError(null);
        setPurchasing(true);
        try {
            let res;
            try {
                res = await base44.functions.invoke('spendGold', { grantInfo });
            } catch (e) {
                const status = e?.response?.status;
                const serverMsg = e?.response?.data?.error || e?.message || '';
                setPurchaseError(friendlyError(`${status || ''} ${serverMsg}`));
                throw e;
            }
            const data = res.data;
            if (!data?.success) {
                setPurchaseError(friendlyError(data?.error || 'Unknown error'));
                throw new Error(data?.error || 'Unknown error');
            }
            if (data.saveData) {
                const s = SaveManager.load();
                const SERVER_FIELDS = ['gold', 'unlockedCosmetics', 'unlockedKillEffects', 'unlockedSkins', 'cosmetics'];
                for (const k of SERVER_FIELDS) {
                    if (data.saveData[k] !== undefined) s[k] = data.saveData[k];
                }
                SaveManager.save(s);
                setSave(s);
            }
            return data;
        } finally {
            setPurchasing(false);
        }
    };

    const purchaseSku = async (skuId, grantInfo = null) => {
        setPurchaseError(null);
        setPurchasing(true);
        if (!skuId) { setPurchaseError('Something went wrong. Please try again.'); setPurchasing(false); throw new Error('No SKU mapping'); }
        const playerName = save.pilotName || 'Pilot';
        try {
            let res;
            try {
                res = await base44.functions.invoke('purchaseSku', { skuId, quantity: 1, playerName, grantInfo });
            } catch (e) {
                const status = e?.response?.status;
                const serverMsg = e?.response?.data?.error || e?.message || '';
                setPurchaseError(friendlyError(`${status || ''} ${serverMsg}`));
                throw e;
            }
            const data = res.data;
            if (!data?.success) {
                setPurchaseError(friendlyError(data?.error || 'Unknown error'));
                throw new Error(data?.error || 'Unknown error');
            }
            if (data.saveData) {
                const s = SaveManager.load();
                const SERVER_FIELDS = ['unlockedCosmetics', 'unlockedKillEffects', 'unlockedSkins', 'cosmetics'];
                for (const k of SERVER_FIELDS) {
                    if (data.saveData[k] !== undefined) s[k] = data.saveData[k];
                }
                SaveManager.save(s);
                setSave(s);
            }
            return data;
        } finally {
            setPurchasing(false);
        }
    };

    const handleBuyCosmetic = (cosmetic, slot, currency) => {
        if (slot === 'skin') {
            const unlocked = save.unlockedSkins || [];
            const isOwned = unlocked.includes(cosmetic.id) || cosmetic.goldCost === 0;
            const cosmetics = save.cosmetics || {};
            const charSkins = cosmetics.skins || {};

            if (currency === 'preview') {
                setPreviewSkinColor(c => c === cosmetic.color ? null : cosmetic.color);
                SoundManager.playUIClick();
                return;
            }
            if (isOwned) {
                const newSave = { ...save, cosmetics: { ...cosmetics, skins: { ...charSkins, [cosmetic.charId]: cosmetic.id } } };
                SaveManager.save(newSave);
                setSave(newSave);
                SaveManager.syncToBackendImmediate();
                SoundManager.playUIClick();
                return;
            }
            if (currency === 'gold' && save.gold >= cosmetic.goldCost) {
                const grantInfo = { type: 'cosmetic', slot: 'skin', cosmeticId: cosmetic.id, charId: cosmetic.charId, goldCost: cosmetic.goldCost };
                spendGold(grantInfo).then(() => SoundManager.playUIClick()).catch(err => console.error('[Cosmetics skin] spendGold failed:', err));
            } else if (currency === 'token' && (omenxBalance ?? 0) >= cosmetic.tokenCost) {
                const skuId = getCosmeticSku('skin', cosmetic.name, cosmetic.goldCost);
                const grantInfo = { type: 'cosmetic', slot: 'skin', cosmeticId: cosmetic.id, charId: cosmetic.charId, goldCost: cosmetic.goldCost };
                purchaseSku(skuId, grantInfo).then(() => SoundManager.playUIClick()).catch(err => console.error('[Cosmetics skin] purchase failed:', err)).finally(() => refreshBalance());
            }
            return;
        }

        const unlockKey = slot === 'trail' ? 'unlockedCosmetics' : 'unlockedKillEffects';
        const freeId = slot === 'trail' ? 'default' : 'none';
        const unlocked = save[unlockKey] || [freeId];
        const cosmetics = save.cosmetics || { trail: 'default', killEffect: 'none' };
        const cosmeticKey = slot === 'trail' ? 'trail' : 'killEffect';

        if (currency === 'preview') {
            setSave(prev => ({ ...prev, cosmetics: { ...prev.cosmetics, [cosmeticKey]: cosmetic.id } }));
            SoundManager.playUIClick();
            return;
        }
        if (unlocked.includes(cosmetic.id)) {
            const newSave = { ...save, cosmetics: { ...cosmetics, [cosmeticKey]: cosmetic.id } };
            SaveManager.save(newSave);
            setSave(newSave);
            SaveManager.syncToBackendImmediate();
            SoundManager.playUIClick();
            return;
        }
        if (currency === 'gold' && save.gold >= cosmetic.goldCost) {
            const grantInfo = { type: 'cosmetic', slot, cosmeticId: cosmetic.id, goldCost: cosmetic.goldCost };
            spendGold(grantInfo).then(() => SoundManager.playUIClick()).catch(err => console.error('[Cosmetics trail/kill] spendGold failed:', err));
        } else if (currency === 'token' && (omenxBalance ?? 0) >= cosmetic.tokenCost) {
            const skuId = getCosmeticSku(slot, cosmetic.name, cosmetic.goldCost);
            const grantInfo = { type: 'cosmetic', slot, cosmeticId: cosmetic.id, goldCost: cosmetic.goldCost };
            purchaseSku(skuId, grantInfo).then(() => SoundManager.playUIClick()).catch(err => console.error('[Cosmetics trail/kill] purchase failed:', err)).finally(() => refreshBalance());
        }
    };

    const handleConfirmTokenPurchase = (cosmetic, slot) => {
        confirmPurchase(cosmetic.tokenCost, cosmetic.name, () => handleBuyCosmetic(cosmetic, slot, 'token'));
    };

    const handleClaimQuestSkin = async (skin) => {
        if (claimingSkinId) return;
        setPurchaseError(null);
        setClaimingSkinId(skin.id);
        try {
            let res;
            try {
                res = await base44.functions.invoke('claimSeasonalSkin', { skinId: skin.id });
            } catch (e) {
                const status = e?.response?.status;
                const serverMsg = e?.response?.data?.error || e?.message || '';
                setPurchaseError(friendlyError(`${status || ''} ${serverMsg}`));
                return;
            }
            const data = res.data;
            if (!data?.success) {
                setPurchaseError(data?.error || 'Try again.');
                return;
            }
            const s = SaveManager.load();
            if (data.saveData.seasonalPoints !== undefined) s.seasonalPoints = data.saveData.seasonalPoints;
            if (data.saveData.unlockedSkins !== undefined) s.unlockedSkins = data.saveData.unlockedSkins;
            // Auto-equip the freshly-claimed skin.
            s.cosmetics = { ...(s.cosmetics || {}), skins: { ...((s.cosmetics || {}).skins || {}), [skin.charId]: skin.id } };
            SaveManager.save(s);
            setSave(s);
            SaveManager.syncToBackendImmediate();
            SoundManager.playLevelUp();
        } finally {
            setClaimingSkinId(null);
        }
    };

    const equippedTrail = save.cosmetics?.trail || 'default';
    const equippedKill = save.cosmetics?.killEffect || 'none';

    return (
        <OmenXGate isCarousel={isCarousel}>
            <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} relative text-slate-200 p-2 pb-20 md:p-6 font-sans`}>
                {!isCarousel && <SpaceBackground />}
                <div className="max-w-5xl mx-auto">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 md:mb-6 border-b border-slate-800 pb-2 md:pb-4">
                        <div>
                            {!isCarousel && (
                                <button
                                    onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                                    className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                                >
                                    <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Main Menu
                                </button>
                            )}
                            <h1
                                className="text-2xl md:text-4xl font-black uppercase tracking-widest"
                                style={{ background: 'linear-gradient(90deg, #EC4899, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(236,72,153,0.5))' }}
                            >
                                ✨ Cosmic Wardrobe
                            </h1>
                            <p className="text-slate-400 mt-0.5 md:text-sm text-xs tracking-widest uppercase">Trails, kill effects &amp; pilot skins.</p>
                        </div>
                        <CurrencyHeader />
                    </header>

                    {/* Dev-support banner — sets the cosmetics-as-tip framing per
                        docs/COSMETICS_GMT_PRICING.md. Forward-looking copy: GMT
                        migration + pool exclusion ship in follow-up commits. */}
                    <div className="mb-4 md:mb-5 bg-gradient-to-r from-fuchsia-950/50 via-pink-950/40 to-purple-950/50 border border-fuchsia-500/40 rounded-xl px-3 py-2.5 md:px-4 md:py-3 flex items-start gap-3">
                        <div className="text-2xl shrink-0 leading-none">💜</div>
                        <div className="text-xs md:text-sm text-fuchsia-100 leading-snug">
                            <strong className="text-pink-300 block mb-0.5">Supporting the devs</strong>
                            Cosmetics are moving to GMT-only soon — every purchase will go directly to development costs instead of the weekly player/staff payout pool. For now, OMENX &amp; Gold still work as usual.
                        </div>
                    </div>

                    {omenxBlocked && (
                        <div className="mb-3 md:mb-4 bg-red-950/40 border border-red-700/60 rounded-lg p-3 flex items-start gap-2">
                            <span className="text-red-300 text-lg leading-none mt-0.5">🔒</span>
                            <div className="text-xs md:text-sm text-red-200 leading-snug">
                                <strong className="text-red-100">OMENX purchases are temporarily paused.</strong>
                                <div className="mt-0.5 opacity-90">{omenxBlockedMsg || 'The settlement service is being restored. Gold purchases are still available.'}</div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 bg-[#0b0416]/60 backdrop-blur-xl rounded-xl md:rounded-2xl p-2 md:p-6 border border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] min-h-[400px] md:min-h-[600px]">
                        {/* Live preview — hidden on the skin tab (skin tab has its own preview block) */}
                        {cosmeticTab !== 'skin' && (
                            <div className="mb-4">
                                <CosmeticPreview
                                    trailId={equippedTrail}
                                    killEffectId={equippedKill}
                                    charId={previewCharId}
                                    playerColor={SKIN_COSMETICS.find(s => s.id === (save.cosmetics?.skins?.[previewCharId] || `${previewCharId}_default`))?.color || CHARACTERS.find(c => c.id === previewCharId)?.color || '#00cfff'}
                                />
                                <div className="flex gap-3 mt-2 text-xs text-slate-400 justify-center">
                                    <span>Trail: <strong className="text-pink-400">{TRAIL_COSMETICS.find(t => t.id === equippedTrail)?.name}</strong></span>
                                    <span>Kill Effect: <strong className="text-pink-400">{KILL_COSMETICS.find(k => k.id === equippedKill)?.name}</strong></span>
                                </div>
                            </div>
                        )}

                        {/* Tab switcher */}
                        <div className="flex gap-2 mb-4 border-b border-slate-800 pb-2 flex-wrap">
                            <button
                                onClick={() => { SoundManager.playUIClick(); setCosmeticTab('trail'); setPreviewSkinColor(null); }}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${cosmeticTab === 'trail' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                ✨ Trails
                            </button>
                            <button
                                onClick={() => { SoundManager.playUIClick(); setCosmeticTab('kill'); setPreviewSkinColor(null); }}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${cosmeticTab === 'kill' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                💥 Kill Effects
                            </button>
                            <button
                                onClick={() => { SoundManager.playUIClick(); setCosmeticTab('skin'); }}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${cosmeticTab === 'skin' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                🎨 Character Skins
                            </button>
                        </div>

                        {cosmeticTab === 'skin' ? (
                            <SkinGrid
                                save={save}
                                unlockedChars={effectiveUnlockedCharacters}
                                skinCharIndex={skinCharIndex}
                                setSkinCharIndex={setSkinCharIndex}
                                previewSkinColor={previewSkinColor}
                                setPreviewSkinColor={setPreviewSkinColor}
                                omenxBalance={omenxBalance}
                                gmtPrices={gmtPrices}
                                omenxBlocked={omenxBlocked}
                                omenxBlockedMsg={omenxBlockedMsg}
                                purchasing={purchasing}
                                claimingSkinId={claimingSkinId}
                                onBuy={handleBuyCosmetic}
                                onClaimQuest={handleClaimQuestSkin}
                                onConfirmTokenPurchase={handleConfirmTokenPurchase}
                            />
                        ) : (
                            <CosmeticGrid
                                list={cosmeticTab === 'trail' ? TRAIL_COSMETICS : KILL_COSMETICS}
                                slot={cosmeticTab}
                                save={save}
                                unlockKey={cosmeticTab === 'trail' ? 'unlockedCosmetics' : 'unlockedKillEffects'}
                                freeId={cosmeticTab === 'trail' ? 'default' : 'none'}
                                equippedId={cosmeticTab === 'trail' ? equippedTrail : equippedKill}
                                omenxBalance={omenxBalance}
                                gmtPrices={gmtPrices}
                                omenxBlocked={omenxBlocked}
                                omenxBlockedMsg={omenxBlockedMsg}
                                purchasing={purchasing}
                                onBuy={handleBuyCosmetic}
                                onPreview={(cosmetic, slot) => handleBuyCosmetic(cosmetic, slot, 'preview')}
                                onConfirmTokenPurchase={handleConfirmTokenPurchase}
                            />
                        )}
                    </div>
                </div>

                {purchaseError && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-red-900 border-2 border-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl max-w-sm text-center">
                        ❌ {purchaseError}
                        <button onClick={() => setPurchaseError(null)} className="ml-3 text-red-300 hover:text-white">✕</button>
                    </div>
                )}

                {pending && (
                    <OmenXConfirmation
                        amount={pending.amount}
                        itemName={pending.itemName}
                        onConfirm={pending.onConfirm}
                        onCancel={pending.onCancel}
                        pageId="cosmetics-page"
                    />
                )}
            </div>
        </OmenXGate>
    );
}