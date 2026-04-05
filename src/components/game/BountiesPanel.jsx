import React from 'react';
import { CheckCircle, Circle, Gift, Star, ShieldAlert, Coins, Puzzle, Hexagon } from 'lucide-react';
import { SaveManager } from '../../game/SaveManager';
import { SoundManager } from '../../game/SoundManager';
import { useToast } from "@/components/ui/use-toast";
import { base44 } from '@/api/base44Client';
import moment from 'moment';

export default function BountiesPanel({ save, setSave }) {
    const { toast } = useToast();
    
    if (!save.bounties || !save.bounties.active) return null;

    const handleClaim = (bountyIndex) => {
        const currentSave = SaveManager.load();
        const bounty = currentSave.bounties.active[bountyIndex];
        if (bounty.progress >= bounty.target && !bounty.claimed) {
            currentSave.bounties.active[bountyIndex].claimed = true;
            
            if (bounty.currency === 'gold') {
                currentSave.gold += bounty.reward;
            } else if (bounty.currency === 'token') {
                currentSave.cosmicTokens = (currentSave.cosmicTokens || 0) + bounty.reward;
            } else if (bounty.currency === 'fragment') {
                currentSave.relicFragments = (currentSave.relicFragments || 0) + bounty.reward;
            }
            
            SaveManager.save(currentSave);
            setSave(currentSave);
            SoundManager.playGoldPickup();
            
            toast({
                title: "Bounty Claimed!",
                description: `You received ${bounty.reward} ${bounty.currency === 'gold' ? 'Gold' : bounty.currency === 'fragment' ? 'Fragments' : 'Tokens'}`,
            });
        }
    };

    const handleClaimDailyMission = () => {
        const currentSave = SaveManager.load();
        const mission = currentSave.bounties.dailyMission;
        if (mission && mission.progress >= mission.target && !mission.claimed) {
            currentSave.bounties.dailyMission.claimed = true;
            currentSave.seasonalPoints = (currentSave.seasonalPoints || 0) + mission.reward;
            
            SaveManager.save(currentSave);
            setSave(currentSave);
            SoundManager.playGoldPickup();
            
            toast({
                title: "Daily Mission Complete!",
                description: `You earned ${mission.reward} Seasonal Points!`,
            });
        }
    };

    const SEASONAL_REWARD_TARGET = 100;
    const currentPoints = save.seasonalPoints || 0;
    const progressPercent = Math.min(100, (currentPoints / SEASONAL_REWARD_TARGET) * 100);

    return (
        <div className="flex flex-col md:flex-row gap-2 md:gap-4">
        <div className="flex-1 bg-[#0b0416]/80 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-xl p-3 md:p-4">
            <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                🎯 Daily Bounties
            </h3>
            <div className="space-y-2 md:space-y-3">
                {save.bounties.active.map((bounty, index) => {
                    const isComplete = bounty.progress >= bounty.target;
                    const isClaimed = bounty.claimed;
                    const progressPercent = Math.min(100, (bounty.progress / bounty.target) * 100);

                    return (
                        <div key={bounty.id + index} className={`p-3 rounded-lg border transition-colors ${
                            isClaimed ? 'bg-slate-800/50 border-slate-700 opacity-60' : 
                            isComplete ? 'bg-slate-800 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                            'bg-slate-800 border-slate-700'
                        }`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {isComplete ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
                                        <span className={`font-bold text-sm ${isComplete ? 'text-white' : 'text-slate-300'}`}>
                                            {bounty.desc}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                        <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                                            {Math.min(bounty.progress, bounty.target)} / {bounty.target}
                                        </span>
                                        <span className={`${bounty.currency === 'gold' ? 'text-yellow-500' : bounty.currency === 'fragment' ? 'text-fuchsia-400' : 'text-emerald-400'} font-bold flex items-center gap-1`}>
                                            {bounty.currency === 'gold' ? <Coins className="w-3 h-3 fill-yellow-500" /> : bounty.currency === 'fragment' ? <Puzzle className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" /> : <Hexagon className="w-3 h-3 fill-emerald-400 text-emerald-400" />} {bounty.reward}
                                        </span>
                                    </div>
                                </div>
                                {isComplete && !isClaimed && (
                                    <button
                                        onClick={() => handleClaim(index)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center gap-1"
                                    >
                                        <Gift className="w-3 h-3" /> CLAIM
                                    </button>
                                )}
                                {isClaimed && (
                                    <span className="text-emerald-500/50 text-xs font-bold border border-emerald-500/30 px-2 py-1 rounded">
                                        CLAIMED
                                    </span>
                                )}
                            </div>
                            
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-cyan-500'}`} 
                                    style={{ width: `${Math.min(100, (bounty.progress / bounty.target) * 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        
        <div className="w-full md:w-80 flex flex-col gap-2 md:gap-4">
            <div className="bg-[#0b0416]/80 backdrop-blur-xl border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.25)] rounded-xl p-3 md:p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent pointer-events-none" />
                <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2 relative z-10">
                    <ShieldAlert className="w-5 h-5" /> Daily Mission
                </h3>
                
                {save.bounties.dailyMission && (() => {
                    const mission = save.bounties.dailyMission;
                    const isComplete = mission.progress >= mission.target;
                    const isClaimed = mission.claimed;
                    const mProgressPercent = Math.min(100, (mission.progress / mission.target) * 100);
                    
                    return (
                        <div className={`p-4 rounded-lg border relative z-10 ${
                            isClaimed ? 'bg-slate-800/50 border-slate-700 opacity-60' : 
                            isComplete ? 'bg-purple-900/40 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 
                            'bg-slate-800 border-purple-500/30'
                        }`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-bold text-sm text-white mb-1">{mission.desc}</div>
                                    <div className="text-xs text-purple-300 font-mono">
                                        Progress: {Math.min(mission.progress, mission.target)} / {mission.target}
                                    </div>
                                    <div className="text-xs text-yellow-400 font-bold mt-1 flex items-center gap-1">
                                        <Star className="w-3 h-3" /> +{mission.reward} Seasonal Pts
                                    </div>
                                </div>
                                
                                {isComplete && !isClaimed && (
                                    <button
                                        onClick={handleClaimDailyMission}
                                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)] flex items-center gap-1"
                                    >
                                        <Gift className="w-3 h-3" /> CLAIM
                                    </button>
                                )}
                                {isClaimed && (
                                    <span className="text-purple-400/80 text-xs font-bold border border-purple-500/30 px-2 py-1 rounded">
                                        CLAIMED
                                    </span>
                                )}
                            </div>
                            
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-3">
                                <div 
                                    className={`h-full transition-all duration-500 ${isComplete ? 'bg-purple-400' : 'bg-purple-600'}`} 
                                    style={{ width: `${mProgressPercent}%` }}
                                />
                            </div>
                        </div>
                    );
                })()}
            </div>

            <div className="bg-[#0b0416]/80 backdrop-blur-xl border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.15)] rounded-xl p-3 md:p-4 flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400" /> Seasonal Skin Reward
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">
                        Earn Seasonal Points from Daily Missions to unlock exclusive character skins!
                    </p>

                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="relative group cursor-pointer transition-transform hover:scale-105 z-10">
                            <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full group-hover:bg-blue-500/40 transition-all" />
                            <img src="https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/e97f69b57_generated_image.png" alt="Cosmic Skin" className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-blue-500 object-cover relative" title="Neon Vanguard" />
                        </div>
                        <div className="relative group cursor-pointer transition-transform hover:scale-110 z-20 -mx-2">
                            <div className="absolute inset-0 bg-yellow-500/20 blur-md rounded-full group-hover:bg-yellow-500/40 transition-all" />
                            <img src="https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/f4c7a4b5c_generated_image.png" alt="Aegis Skin" className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-yellow-500 object-cover relative shadow-[0_0_15px_rgba(234,179,8,0.3)]" title="Golden Sovereign" />
                        </div>
                        <div className="relative group cursor-pointer transition-transform hover:scale-105 z-10">
                            <div className="absolute inset-0 bg-green-500/20 blur-md rounded-full group-hover:bg-green-500/40 transition-all" />
                            <img src="https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/e55d5a3da_generated_image.png" alt="Venom Skin" className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-green-500 object-cover relative" title="Toxic Phantom" />
                        </div>
                    </div>
                </div>
                
                <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-300">Progress</span>
                        <span className="text-yellow-400">{currentPoints} / {SEASONAL_REWARD_TARGET}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
                        <div 
                            className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full transition-all duration-500" 
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    {currentPoints >= SEASONAL_REWARD_TARGET && (
                        <div className="mt-3 text-center text-xs font-bold text-emerald-400 animate-pulse">
                            SKIN UNLOCKED! (Coming soon)
                        </div>
                    )}
                </div>
            </div>
        </div>
        </div>
    );
}