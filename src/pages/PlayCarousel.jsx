import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
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
                <div className="flex items-center justify-between w-full md:w-72 bg-slate-900 rounded-xl border border-slate-700 p-1 shadow-inner">
                    <button 
                        onClick={() => { 
                            SoundManager.playUIClick(); 
                            const newIdx = selectedIndex <= 0 ? 2 : selectedIndex - 1;
                            emblaApi?.scrollTo(newIdx); 
                        }}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center font-bold text-base select-none">
                        {selectedIndex === 0 && <span className="text-cyan-400">Sloth Lounge</span>}
                        {selectedIndex === 1 && <span className="text-pink-400">Upgrade Lounge</span>}
                        {selectedIndex === 2 && <span className="text-yellow-400">Hall of Fame</span>}
                    </div>
                    <button 
                        onClick={() => { 
                            SoundManager.playUIClick(); 
                            const newIdx = selectedIndex >= 2 ? 0 : selectedIndex + 1;
                            emblaApi?.scrollTo(newIdx); 
                        }}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
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