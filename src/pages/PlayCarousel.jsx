import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Hub from './Hub';
import Upgrades from './Upgrades';
import LeaderboardPage from './LeaderboardPage';
import { SoundManager } from '../game/SoundManager';

export default function PlayCarousel() {
    const navigate = useNavigate();
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => {
            setSelectedIndex(emblaApi.selectedScrollSnap());
        };
        emblaApi.on('select', onSelect);
        onSelect();
    }, [emblaApi]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-col md:flex-row justify-between items-center gap-4 z-10 relative">
                <button 
                    onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 w-full md:w-auto justify-center"
                >
                    <ArrowLeft className="w-4 h-4" /> Main Menu
                </button>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <button 
                        onClick={() => { SoundManager.playUIClick(); emblaApi?.scrollTo(0); }}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border ${selectedIndex === 0 ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                    >
                        Sloth Lounge
                    </button>
                    <button 
                        onClick={() => { SoundManager.playUIClick(); emblaApi?.scrollTo(1); }}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border ${selectedIndex === 1 ? 'bg-pink-600 text-white border-pink-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                    >
                        Upgrade Lounge
                    </button>
                    <button 
                        onClick={() => { SoundManager.playUIClick(); emblaApi?.scrollTo(2); }}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border ${selectedIndex === 2 ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                    >
                        Hall of Fame
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden" ref={emblaRef}>
                <div className="flex h-full">
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto">
                        <Hub isCarousel={true} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto">
                        <Upgrades isCarousel={true} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto">
                        <LeaderboardPage isCarousel={true} />
                    </div>
                </div>
            </div>
        </div>
    );
}