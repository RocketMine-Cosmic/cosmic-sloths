import React, { useState, useEffect } from 'react';
import { Gift, Flame, CheckCircle } from 'lucide-react';
import { SaveManager } from '../../game/SaveManager';
import { SoundManager } from '../../game/SoundManager';
import { useToast } from "@/components/ui/use-toast";
import moment from 'moment';

const DAILY_REWARDS = [
    { day: 1, reward: 400,   currency: 'gold',  icon: '🪙' },
    { day: 2, reward: 800,   currency: 'gold',  icon: '🪙' },
    { day: 3, reward: 1000,  currency: 'gold',  icon: '🪙' },
    { day: 4, reward: 1,     currency: 'reroll', icon: '🎲' },
    { day: 5, reward: 2000,  currency: 'gold',  icon: '🪙' },
    { day: 6, reward: 2,     currency: 'reroll', icon: '🎲' },
    { day: 7, reward: 4000,  currency: 'gold',  icon: '🪙', bonus: true },
];

export default function DailyLoginPanel({ save, setSave }) {
    const { toast } = useToast();
    const today = moment().format('YYYY-MM-DD');

    const login = save.dailyLogin || { lastDate: '', streak: 0, claimed: false };
    const alreadyClaimed = login.lastDate === today && login.claimed;

    // Calculate current streak (reset if missed a day)
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    const streakActive = login.lastDate === today || login.lastDate === yesterday;
    const streak = streakActive ? login.streak : 0;
    const dayIndex = (streak % 7); // 0-6, which day in the 7-day cycle we're ON

    const handleClaim = () => {
        const currentSave = SaveManager.load();
        const currentLogin = currentSave.dailyLogin || { lastDate: '', streak: 0, claimed: false };
        const isAlreadyClaimed = currentLogin.lastDate === today && currentLogin.claimed;
        if (isAlreadyClaimed) return;

        const newStreak = (currentLogin.lastDate === yesterday ? currentLogin.streak : 0) + 1;
        const rewardDay = DAILY_REWARDS[(newStreak - 1) % 7];

        currentSave.dailyLogin = { lastDate: today, streak: newStreak, claimed: true };

        if (rewardDay.currency === 'gold') {
            currentSave.gold = (currentSave.gold || 0) + rewardDay.reward;
        } else if (rewardDay.currency === 'token') {
            currentSave.cosmicTokens = (currentSave.cosmicTokens || 0) + rewardDay.reward;
        } else if (rewardDay.currency === 'reroll') {
            currentSave.rerollTokens = (currentSave.rerollTokens || 0) + rewardDay.reward;
        }

        SaveManager.save(currentSave);
        setSave(currentSave);
        SoundManager.playGoldPickup();

        toast({
            title: `Day ${newStreak} Reward Claimed!`,
            description: `+${rewardDay.reward} ${rewardDay.currency === 'gold' ? '🪙 Gold' : rewardDay.currency === 'token' ? '💠 Cosmic Tokens' : '🎲 Reroll Token'}`,
        });
    };

    return (
        <div className="bg-[#0b0416]/80 backdrop-blur-xl border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)] rounded-xl p-3 md:p-4 mb-2 md:mb-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    Daily Login
                    {streak > 0 && (
                        <span className="text-sm font-bold text-orange-400 bg-orange-900/40 border border-orange-700/50 px-2 py-0.5 rounded-full">
                            🔥 {streak} day streak
                        </span>
                    )}
                </h3>
                {alreadyClaimed && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Claimed Today
                    </span>
                )}
            </div>

            <div className="grid grid-cols-7 gap-1 md:gap-1.5 mb-2 md:mb-4">
                {DAILY_REWARDS.map((r, i) => {
                    const isPast = i < (alreadyClaimed ? (login.streak % 7) : dayIndex);
                    const isCurrent = i === (alreadyClaimed ? (login.streak - 1) % 7 : dayIndex);
                    const isFuture = !isPast && !isCurrent;

                    return (
                        <div
                            key={r.day}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all ${
                                isCurrent && alreadyClaimed
                                    ? 'bg-emerald-900/40 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                    : isCurrent
                                    ? 'bg-amber-900/40 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse'
                                    : isPast
                                    ? 'bg-slate-800/60 border-slate-600 opacity-70'
                                    : 'bg-slate-800/30 border-slate-700/50 opacity-40'
                            }`}
                        >
                            <div className="text-[9px] font-bold text-slate-400 mb-0.5">DAY {r.day}</div>
                            <div className="text-lg leading-none">{r.icon}</div>
                            <div className={`text-[9px] font-bold mt-0.5 ${r.bonus ? 'text-yellow-400' : 'text-slate-300'}`}>
                                {r.reward}{r.currency === 'reroll' ? '' : ''}
                            </div>
                            {(isPast || (isCurrent && alreadyClaimed)) && (
                                <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5" />
                            )}
                            {r.bonus && <div className="text-[8px] text-yellow-400 font-bold">BONUS</div>}
                        </div>
                    );
                })}
            </div>

            <button
                onClick={handleClaim}
                disabled={alreadyClaimed}
                className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all transform ${
                    alreadyClaimed
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-95'
                }`}
            >
                <Gift className="w-5 h-5" />
                {alreadyClaimed ? 'Come Back Tomorrow!' : `Claim Day ${(dayIndex) + 1} Reward`}
            </button>
        </div>
    );
}