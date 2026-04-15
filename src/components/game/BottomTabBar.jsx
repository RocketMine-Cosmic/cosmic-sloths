import React from 'react';
import { Home, Sword, TrendingUp, Trophy, Users, User, Zap, Calendar } from 'lucide-react';
import { SoundManager } from '../../game/SoundManager';

const TABS = [
    { index: 1, icon: Home,        label: 'Lounge'   },
    { index: 2, icon: Calendar,    label: 'Missions' },
    { index: 3, icon: TrendingUp,  label: 'Upgrades' },
    { index: 4, icon: Trophy,      label: 'Ranks'    },
    { index: 5, icon: Users,       label: 'Squads'   },
    { index: 11, icon: User,       label: 'Profile'  },
];

export default function BottomTabBar({ selectedIndex, onSelect }) {
    return (
        <div className="bottom-tab-bar md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0b0416]/95 backdrop-blur-xl border-t border-[#D946EF]/30 flex items-stretch select-none">
            {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = selectedIndex === tab.index;
                return (
                    <button
                        key={tab.index}
                        onClick={() => { SoundManager.playUIClick(); onSelect(tab.index); }}
                        className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors active:scale-95 ${
                            isActive
                                ? 'text-fuchsia-400'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                        style={{ userSelect: 'none' }}
                    >
                        <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_6px_rgba(217,70,239,0.8)]' : ''}`} />
                        <span className="text-[9px] font-bold tracking-wide uppercase">{tab.label}</span>
                        {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-fuchsia-400 rounded-full" />}
                    </button>
                );
            })}
        </div>
    );
}