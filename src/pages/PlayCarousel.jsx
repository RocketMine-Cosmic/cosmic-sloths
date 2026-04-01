import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MainMenu from './MainMenu';
import Hub from './Hub';
import Dailys from './Dailys';
import Upgrades from './Upgrades';
import LeaderboardPage from './LeaderboardPage';
import Squads from './Squads';
import Bestiary from './Bestiary';
import LeviathanTrials from './LeviathanTrials';
import Profile from './Profile';
import GlobalRaid from './GlobalRaid';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';

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
        <div className="h-[100dvh] bg-[#020408] flex flex-col overflow-hidden select-none relative">
            <SpaceBackground />
            <div className="p-3 md:p-6 flex flex-col md:flex-row justify-center items-center gap-2 z-10 relative shrink-0 pointer-events-none">
                <div className="flex items-center justify-between w-full md:w-[600px] bg-[#050B14]/80 backdrop-blur-md rounded-full border border-[#0CA7B8]/40 p-1 md:p-2 shadow-[0_0_30px_rgba(12,167,184,0.15),inset_0_0_10px_rgba(12,167,184,0.1)] relative overflow-hidden pointer-events-auto">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0CA7B8]/5 to-transparent animate-pulse pointer-events-none" />
                    <button 
                        onClick={() => { 
                            SoundManager.playUIClick(); 
                            emblaApi?.scrollPrev();
                        }}
                        className="p-2 md:p-3 hover:bg-[#0CA7B8]/20 rounded-full text-[#0CA7B8] hover:text-white transition-colors z-10"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <div className="flex-1 text-center font-bold text-sm md:text-base tracking-widest uppercase select-none z-10">
                        {selectedIndex === 0 && <span className="text-white">Main Menu</span>}
                        {selectedIndex === 1 && <span className="text-cyan-400">Sloth Lounge</span>}
                        {selectedIndex === 2 && <span className="text-green-400">Mission Board</span>}
                        {selectedIndex === 3 && <span className="text-pink-400">Upgrade Lounge</span>}
                        {selectedIndex === 4 && <span className="text-yellow-400">Hall of Fame</span>}
                        {selectedIndex === 5 && <span className="text-orange-400">Sloth Squads</span>}
                        {selectedIndex === 6 && <span className="text-rose-400">Cosmic Codex</span>}
                        {selectedIndex === 7 && <span className="text-red-500">Leviathan Trials</span>}
                        {selectedIndex === 8 && <span className="text-red-600">Global Raid</span>}
                        {selectedIndex === 9 && <span className="text-purple-400">Pilot Profile</span>}
                    </div>
                    <button 
                        onClick={() => { 
                            SoundManager.playUIClick(); 
                            emblaApi?.scrollNext();
                        }}
                        className="p-2 md:p-3 hover:bg-[#0CA7B8]/20 rounded-full text-[#0CA7B8] hover:text-white transition-colors z-10"
                    >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
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
                        <Dailys isCarousel={true} />
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
                        <LeviathanTrials isCarousel={true} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto select-none transform-gpu">
                        <GlobalRaid isCarousel={true} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto select-none transform-gpu">
                        <Profile isCarousel={true} />
                    </div>
                </div>
            </div>
        </div>
    );
}