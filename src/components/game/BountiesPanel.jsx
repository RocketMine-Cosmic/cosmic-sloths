import React from 'react';
import { CheckCircle, Circle, Gift, Star, ShieldAlert } from 'lucide-react';
import { SaveManager } from '../../game/SaveManager';
import { SoundManager } from '../../game/SoundManager';
import { useToast } from "@/components/ui/use-toast";
import { base44 } from '@/api/base44Client';
import moment from 'moment';

export default function BountiesPanel({ save, setSave }) {
    const { toast } = useToast();
    
    if (!save.bounties || !save.bounties.active) return null;

    const handleClaim = (bountyIndex) => {
        const bounty = save.bounties.active[bountyIndex];
        if (bounty.progress >= bounty.target && !bounty.claimed) {
            const newSave = { ...save };
            newSave.bounties.active[bountyIndex].claimed = true;
            
            if (bounty.currency === 'gold') {
                newSave.gold += bounty.reward;
            } else if (bounty.currency === 'token') {
                newSave.cosmicTokens = (newSave.cosmicTokens || 0) + bounty.reward;
            } else if (bounty.currency === 'reroll') {
                newSave.rerollTokens = (newSave.rerollTokens || 0) + bounty.reward;
            }
            
            SaveManager.save(newSave);
            setSave(newSave);
            SoundManager.playGoldPickup();
            
            toast({
                title: "Bounty Claimed!",
                description: `You received ${bounty.reward} ${bounty.currency === 'gold' ? '🪙' : bounty.currency === 'reroll' ? '🎲' : '💠'}`,
            });
        }
    };

    const handleClaimDailyMission = () => {
        const mission = save.bounties.dailyMission;
        if (mission && mission.progress >= mission.target && !mission.claimed) {
            const newSave = { ...save };
            newSave.bounties.dailyMission.claimed = true;
            newSave.seasonalPoints = (newSave.seasonalPoints || 0) + mission.reward;
            
            SaveManager.save(newSave);
            setSave(newSave);
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
        <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                🎯 Daily Bounties
            </h3>
            <div className="space-y-3">
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
                                        <span className={`${bounty.currency === 'gold' ? 'text-yellow-500' : bounty.currency === 'reroll' ? 'text-purple-400' : 'text-emerald-400'} font-bold`}>
                                            {bounty.currency === 'gold' ? '🪙' : bounty.currency === 'reroll' ? '🎲' : '💠'} {bounty.reward}
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
        
        <div className="w-full md:w-80 flex flex-col gap-4">
            <div className="bg-slate-900 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] rounded-xl p-4 relative overflow-hidden">
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

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400" /> Seasonal Skin Reward
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">
                        Earn Seasonal Points from Daily Missions to unlock exclusive character skins!
                    </p>
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