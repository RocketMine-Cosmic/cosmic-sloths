import React from 'react';
import { CheckCircle, Circle, Gift } from 'lucide-react';
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
            }
            
            SaveManager.save(newSave);
            setSave(newSave);
            SoundManager.playGoldPickup();
            
            toast({
                title: "Bounty Claimed!",
                description: `You received ${bounty.reward} ${bounty.currency === 'gold' ? '🪙' : '💠'}`,
            });
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
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
                                        <span className="text-yellow-500 font-bold">
                                            {bounty.currency === 'gold' ? '🪙' : '💠'} {bounty.reward}
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
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}