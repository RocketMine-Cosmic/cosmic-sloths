import React, { useState, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';

// Static imports — bundled into the main entry chunk so they can't suffer
// from stale dynamic-chunk timestamps when Vite's dev server restarts.
import MainMenu from './MainMenu';
import Hub from './Hub';
import Dailys from './Dailys';
import Upgrades from './Upgrades';
import LeaderboardPage from './LeaderboardPage';
import Squads from './Squads';
import Bestiary from './Bestiary';
import SynergyCodex from './SynergyCodex';
import Mastery from './Mastery';
import LeviathanTrials from './LeviathanTrials';
import GlobalRaid from './GlobalRaid';
import NFTDashboard from './NFTDashboard';
import Profile from './Profile';
import Jukebox from './Jukebox';

const SLIDE_LABELS = [
    { name: 'Main Menu', color: 'text-white' },
    { name: 'Sloth Lounge', color: 'text-cyan-300' },
    { name: 'Mission Board', color: 'text-emerald-300' },
    { name: 'Upgrade Lounge', color: 'text-fuchsia-300' },
    { name: 'Hall of Fame', color: 'text-amber-300' },
    { name: 'Sloth Squads', color: 'text-orange-300' },
    { name: 'Cosmic Codex', color: 'text-rose-300' },
    { name: 'Synergy Codex', color: 'text-pink-400' },
    { name: 'Character Mastery', color: 'text-amber-500' },
    { name: 'Leviathan Trials', color: 'text-red-400' },
    { name: 'Global Raid', color: 'text-red-500' },
    { name: 'NFT Collection', color: 'text-purple-300' },
    { name: 'Pilot Profile', color: 'text-violet-300' },
    { name: 'Space Jukebox', color: 'text-fuchsia-300' },
];

// Renders a slide ONLY when it's active or adjacent. Off-screen slides stay
// as empty divs (carousel layout preserved) until the user navigates near them.
function LazySlide({ children, shouldMount }) {
    const [hasMounted, setHasMounted] = useState(shouldMount);

    useEffect(() => {
        // Once mounted, keep mounted (so state isn't lost when scrolling away).
        if (shouldMount && !hasMounted) setHasMounted(true);
    }, [shouldMount, hasMounted]);

    return (
        <div className="flex-[0_0_100%] min-w-0 min-h-0 h-full overflow-y-auto select-none transform-gpu" style={{ WebkitOverflowScrolling: 'touch' }}>
            {hasMounted ? children : null}
        </div>
    );
}

export default function PlayCarousel() {
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

    // A slide should mount if it's the current one or one adjacent (handles
    // wrap-around at start/end since the carousel is loop:true).
    const TOTAL = SLIDE_LABELS.length;
    const isNear = (idx) => {
        const diff = Math.abs(idx - selectedIndex);
        return diff <= 1 || diff >= TOTAL - 1;
    };

    return (
        <div className="h-[100dvh] bg-[#0b0416] flex flex-col overflow-hidden select-none relative font-sans">
            <SpaceBackground />
            <div className="p-3 md:p-6 flex flex-col md:flex-row justify-center items-center gap-2 z-10 relative shrink-0 pointer-events-none">
                <div className="flex items-center justify-between w-full md:w-[600px] bg-[#0b0416]/80 backdrop-blur-xl rounded-full border border-[#D946EF]/50 p-1 md:p-2 shadow-[0_0_30px_rgba(217,70,239,0.3),inset_0_0_15px_rgba(12,167,184,0.2)] relative overflow-hidden pointer-events-auto">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D946EF]/10 to-transparent animate-pulse pointer-events-none" />
                    <button 
                        onClick={() => { 
                            SoundManager.playUIClick(); 
                            emblaApi?.scrollPrev();
                        }}
                        className="p-2 md:p-3 hover:bg-[#D946EF]/20 rounded-full text-[#D946EF] hover:text-white transition-colors z-10"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <div className="flex-1 text-center font-black text-sm md:text-base tracking-widest uppercase select-none z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                        <span className={SLIDE_LABELS[selectedIndex].color}>{SLIDE_LABELS[selectedIndex].name}</span>
                    </div>
                    <button 
                        onClick={() => { 
                            SoundManager.playUIClick(); 
                            emblaApi?.scrollNext();
                        }}
                        className="p-2 md:p-3 hover:bg-[#D946EF]/20 rounded-full text-[#D946EF] hover:text-white transition-colors z-10"
                    >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden" ref={emblaRef}>
                <div className="flex h-full min-h-0 touch-pan-y">
                    <LazySlide shouldMount={isNear(0)}><MainMenu isCarousel={true} onNavigateToPlay={() => emblaApi?.scrollTo(1)} /></LazySlide>
                    <LazySlide shouldMount={isNear(1)}><Hub isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(2)}><Dailys isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(3)}><Upgrades isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(4)}><LeaderboardPage isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(5)}><Squads isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(6)}><Bestiary isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(7)}><SynergyCodex isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(8)}><Mastery isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(9)}><LeviathanTrials isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(10)}><GlobalRaid isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(11)}><NFTDashboard isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(12)}><Profile isCarousel={true} /></LazySlide>
                    <LazySlide shouldMount={isNear(13)}><Jukebox isCarousel={true} /></LazySlide>
                </div>
            </div>
        </div>
    );
}