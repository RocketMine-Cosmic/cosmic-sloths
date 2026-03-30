import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MainMenu from './MainMenu';
import Hub from './Hub';
import Upgrades from './Upgrades';
import LeaderboardPage from './LeaderboardPage';
import Squads from './Squads';
import Bestiary from './Bestiary';
import Profile from './Profile';
import { SoundManager } from '../game/SoundManager';

export default function PlayCarousel() {
    const navigate = useNavigate();
    const location = useLocation();
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (emblaApi && location.state?.slide !== undefined) {
            emblaApi.scrollTo(location.state.slide, true);
        }
    }, [emblaApi, location.state]);

    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => {
            setSelectedIndex(emblaApi.selectedScrollSnap());
        };
        emblaApi.on('select', onSelect);
        onSelect();
    }, [emblaApi]);

    return (
        <div className="h-[100dvh] bg-slate-950 flex flex-col overflow-hidden select-none">
            <div className="p-2 md:p-4 border-b border-slate-800 bg-slate-950 flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4 z-10 relative shrink-0">
                <div className="flex items-center justify-between w-full md:w-80 bg-slate-900 rounded-xl border border-slate-700 p-1 shadow-inner">
                    <button 
                        onClick={() => { 
                            SoundManager.playUIClick(); 
                            emblaApi?.scrollPrev();
                        }}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center font-bold text-base select-none">
                        {selectedIndex === 0 && <span className="text-white">Main Menu</span>}
                        {selectedIndex === 1 && <span className="text-cyan-400">Sloth Lounge</span>}
                        {selectedIndex === 2 && <span className="text-pink-400">Upgrade Lounge</span>}
                        {selectedIndex === 3 && <span className="text-yellow-400">Hall of Fame</span>}
                        {selectedIndex === 4 && <span className="text-orange-400">Sloth Squads</span>}
                        {selectedIndex === 5 && <span className="text-rose-400">Cosmic Codex</span>}
                        {selectedIndex === 6 && <span className="text-purple-400">Pilot Profile</span>}
                    </div>
                    <button 
                        onClick={() => { 
                            SoundManager.playUIClick(); 
                            emblaApi?.scrollNext();
                        }}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden" ref={emblaRef}>
                <div className="flex h-full touch-pan-y">
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto select-none transform-gpu">
                        <MainMenu isCarousel={true} onNavigateToPlay={() => emblaApi?.scrollTo(1)} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto select-none transform-gpu">
                        <Hub isCarousel={true} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto select-none transform-gpu">
                        <Upgrades isCarousel={true} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto select-none transform-gpu">
                        <LeaderboardPage isCarousel={true} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto select-none transform-gpu">
                        <Squads isCarousel={true} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto select-none transform-gpu">
                        <Bestiary isCarousel={true} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto select-none transform-gpu">
                        <Profile isCarousel={true} />
                    </div>
                </div>
            </div>
        </div>
    );
}