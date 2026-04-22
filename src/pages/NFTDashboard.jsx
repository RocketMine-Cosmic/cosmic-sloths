import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS } from '../game/Constants';
import { ArrowLeft, Zap, Coins } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';
import OmenXGate from '../components/game/OmenXGate';
import CurrencyHeader from '../components/game/CurrencyHeader';

export default function NFTDashboard({ isCarousel }) {
    const navigate = useNavigate();
    const [nfts, setNfts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNFTs = async () => {
            try {
                const omenxAuth = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
                if (!omenxAuth?.walletAddress || !omenxAuth?.accessToken) {
                    setLoading(false);
                    return;
                }

                const { data: playerRes } = await base44.functions.invoke('getPlayerData', {
                    walletAddress: omenxAuth.walletAddress,
                    accessToken: omenxAuth.accessToken
                });

                if (playerRes?.nfts?.length > 0) {
                    setNfts(playerRes.nfts);
                } else if (playerRes?.error) {
                    console.error('[NFTDashboard] API error:', playerRes.error);
                }
            } catch (e) {
                console.error('[NFTDashboard] Failed to fetch NFTs:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchNFTs();
    }, []);

    const getCharacterData = (charName) => {
        const char = CHARACTERS.find(c => c.id === charName.toLowerCase());
        return char || null;
    };

    const getPerksList = () => {
        return [
            { id: 'gold_mult', icon: '🪙', name: 'Gold Multiplier', desc: '+10% Gold Income', active: nfts.length > 0 },
            { id: 'upgrade_cost', icon: '💰', name: 'Reduced Upgrade Costs', desc: '-10% Upgrade Costs', active: nfts.length > 0 },
            { id: 'relic_bonus', icon: '✨', name: 'Relic Fragment Bonus', desc: '+15% Relic Fragments', active: nfts.length > 0 }
        ];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <OmenXGate isCarousel={isCarousel}>
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} relative text-slate-200 p-2 pb-20 md:p-6 font-sans`}>
            {!isCarousel && <SpaceBackground />}
            <div className="max-w-5xl mx-auto relative z-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 md:mb-6 border-b border-slate-800 pb-2 md:pb-4">
                    <div>
                        {!isCarousel && (
                            <button 
                                onClick={() => { SoundManager.playUIClick(); navigate('/profile'); }}
                                className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                            >
                                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Back
                            </button>
                        )}
                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest" style={{ background: 'linear-gradient(90deg, #A78BFA, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.5))' }}>
                            NFT COLLECTION
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs tracking-widest uppercase">View your NFTs and exclusive perks.</p>
                    </div>
                    <CurrencyHeader />
                </header>

                {nfts.length === 0 ? (
                    <div className="bg-[#0b0416]/60 backdrop-blur-xl rounded-xl md:rounded-2xl p-8 md:p-12 border border-slate-700 text-center">
                        <div className="text-4xl mb-3">💎</div>
                        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">No NFTs Found</h2>
                        <p className="text-slate-400">You don't currently hold any eligible NFTs.</p>
                    </div>
                ) : (
                    <>
                        {/* NFT Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
                            {nfts.filter(nft => getCharacterData(nft.metadata?.name || '')).map((nft, idx) => {
                                const charData = getCharacterData(nft.metadata?.name || '');
                                const charName = (nft.metadata?.name || '').toLowerCase();
                                
                                return (
                                    <div key={idx} className="bg-[#0b0416]/60 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                                        <div className="flex items-start gap-4">
                                            {charData?.image ? (
                                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 md:border-4 border-purple-500 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                                                    <img src={charData.image} alt={charData.name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-800 border-2 md:border-4 border-slate-700 shrink-0" />
                                            )}
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h3 className="text-lg md:text-xl font-bold text-purple-300 truncate">
                                                        {nft.metadata?.name || 'Unknown NFT'}
                                                    </h3>
                                                    {charData && (
                                                        <span className="bg-purple-900/50 text-purple-300 text-[10px] font-bold px-2 py-1 rounded-md border border-purple-500/50 whitespace-nowrap">
                                                            CHARACTER
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-slate-400 text-xs md:text-sm leading-snug mb-2">
                                                    {nft.metadata?.description || 'NFT'}
                                                </p>
                                                <div className="text-[10px] text-slate-500 font-mono truncate">
                                                    {nft.tokenId}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Active Perks */}
                        <div className="bg-[#0b0416]/60 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 border border-amber-500/30 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
                            <h2 className="text-lg md:text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                                ⚡ Active NFT Perks
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                {getPerksList().map(perk => (
                                    <div 
                                        key={perk.id}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            perk.active
                                                ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                                                : 'bg-slate-800/30 border-slate-700/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-2xl">{perk.icon}</span>
                                            <div>
                                                <h3 className={`font-bold text-sm md:text-base ${perk.active ? 'text-amber-300' : 'text-slate-500'}`}>
                                                    {perk.name}
                                                </h3>
                                            </div>
                                        </div>
                                        <p className={`text-xs md:text-sm ${perk.active ? 'text-amber-200' : 'text-slate-600'}`}>
                                            {perk.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Perks Info */}
                        <div className="mt-6 bg-slate-900/40 border border-slate-700 rounded-lg p-4 text-xs md:text-sm text-slate-400">
                            <p className="leading-relaxed">
                                <strong className="text-slate-200">NFT Holder Benefits:</strong> All holders of OmenX NFTs receive permanent in-game bonuses that apply to every run, helping you progress faster and save on upgrades.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
        </OmenXGate>
    );
}