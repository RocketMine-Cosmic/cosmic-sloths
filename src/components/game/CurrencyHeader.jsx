import React, { useState, useEffect } from 'react';
import { SaveManager } from '../../game/SaveManager';

export default function CurrencyHeader() {
    const [save, setSave] = useState(SaveManager.load());

    useEffect(() => {
        const handleSaveUpdated = (e) => setSave(e.detail);
        window.addEventListener('saveUpdated', handleSaveUpdated);
        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, []);

    return (
        <div className="flex flex-wrap justify-end gap-1.5 md:gap-3">
            <div className="text-xs md:text-sm lg:text-base font-black text-yellow-300 bg-yellow-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]" title="Star Fragments">
                🌟 {save.starFragments || 0}
            </div>
            <div className="text-xs md:text-sm lg:text-base font-black text-fuchsia-300 bg-fuchsia-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-fuchsia-700/50 shadow-[0_0_10px_rgba(217,70,239,0.2)]" title="Relic Fragments">
                🧩 {save.relicFragments || 0}
            </div>
            <div className="text-xs md:text-sm lg:text-base font-black text-emerald-300 bg-emerald-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]" title="Cosmic Tokens">
                💠 {save.cosmicTokens || 0}
            </div>
            <div className="text-xs md:text-sm lg:text-base font-black text-yellow-400 bg-amber-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]" title="Gold">
                🪙 {save.gold}
            </div>
        </div>
    );
}