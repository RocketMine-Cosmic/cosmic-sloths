import React, { useState, useEffect } from 'react';
import { SaveManager } from '../../game/SaveManager';
import { Star, Puzzle, Hexagon, Coins } from 'lucide-react';

export default function CurrencyHeader() {
    const [save, setSave] = useState(SaveManager.load());

    useEffect(() => {
        const handleSaveUpdated = (e) => setSave(e.detail);
        window.addEventListener('saveUpdated', handleSaveUpdated);
        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, []);

    return (
        <div className="flex flex-wrap justify-end gap-2 md:gap-3">
            <div className="group relative flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-yellow-300 bg-yellow-950/60 backdrop-blur-md px-2.5 py-1.5 md:px-4 md:py-2 rounded border-b-2 border-yellow-500 hover:bg-yellow-900/60 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]" title="Star Fragments">
                <div className="absolute inset-0 bg-yellow-500/10 blur-md rounded-full group-hover:bg-yellow-500/20 transition-all pointer-events-none"></div>
                <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-yellow-400 text-yellow-400 relative z-10" /> 
                <span className="relative z-10">{save.starFragments || 0}</span>
            </div>
            <div className="group relative flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-fuchsia-300 bg-fuchsia-950/60 backdrop-blur-md px-2.5 py-1.5 md:px-4 md:py-2 rounded border-b-2 border-fuchsia-500 hover:bg-fuchsia-900/60 transition-colors shadow-[0_0_15px_rgba(217,70,239,0.2)]" title="Relic Fragments">
                <div className="absolute inset-0 bg-fuchsia-500/10 blur-md rounded-full group-hover:bg-fuchsia-500/20 transition-all pointer-events-none"></div>
                <Puzzle className="w-3.5 h-3.5 md:w-4 md:h-4 fill-fuchsia-400 text-fuchsia-400 relative z-10" /> 
                <span className="relative z-10">{save.relicFragments || 0}</span>
            </div>
            <div className="group relative flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-emerald-300 bg-emerald-950/60 backdrop-blur-md px-2.5 py-1.5 md:px-4 md:py-2 rounded border-b-2 border-emerald-500 hover:bg-emerald-900/60 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]" title="Cosmic Tokens">
                <div className="absolute inset-0 bg-emerald-500/10 blur-md rounded-full group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>
                <Hexagon className="w-3.5 h-3.5 md:w-4 md:h-4 fill-emerald-400 text-emerald-400 relative z-10" /> 
                <span className="relative z-10">{save.cosmicTokens || 0}</span>
            </div>
            <div className="group relative flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-amber-300 bg-amber-950/60 backdrop-blur-md px-2.5 py-1.5 md:px-4 md:py-2 rounded border-b-2 border-amber-500 hover:bg-amber-900/60 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)]" title="Gold">
                <div className="absolute inset-0 bg-amber-500/10 blur-md rounded-full group-hover:bg-amber-500/20 transition-all pointer-events-none"></div>
                <Coins className="w-3.5 h-3.5 md:w-4 md:h-4 fill-amber-500 text-amber-500 relative z-10" /> 
                <span className="relative z-10">{save.gold}</span>
            </div>
        </div>
    );
}