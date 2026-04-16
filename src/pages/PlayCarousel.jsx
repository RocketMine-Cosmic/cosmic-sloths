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
import SynergyCodex from './SynergyCodex';
import Mastery from './Mastery';
import LeviathanTrials from './LeviathanTrials';
import Profile from './Profile';
import GlobalRaid from './GlobalRaid';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';
import { base44 } from '@/api/base44Client';

export default function PlayCarousel() {
    const navigate = useNavigate();
    const location = useLocation();
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Handle OmenX OAuth callback when redirected back to /?omenx_callback=1
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('omenx_callback') !== '1') return;

        const code = params.get('code');
        const state = params.get('state');
        const savedState = sessionStorage.getItem('omenx_state');

        // Clean URL immediately
        window.history.replaceState({}, document.title, '/');

        if (!code) {
            if (window.opener) window.opener.postMessage({ type: 'OMENX_AUTH_ERROR', error: 'no_code' }, window.location.origin);
            return;
        }
        if (state !== savedState) {
            if (window.opener) window.opener.postMessage({ type: 'OMENX_AUTH_ERROR', error: 'state_mismatch' }, window.location.origin);
            return;
        }
        sessionStorage.removeItem('omenx_state');

        base44.functions.invoke('omenxTokenExchange', { code })
            .then(res => {
                const data = res.data;
                if (data.error) throw new Error(data.error);
                if (window.opener) {
                    window.opener.postMessage({ type: 'OMENX_AUTH_SUCCESS', payload: data }, window.location.origin);
                }
                setTimeout(() => window.close(), 500);
            })
            .catch(err => {
                if (window.opener) window.opener.postMessage({ type: 'OMENX_AUTH_ERROR', error: err.message }, window.location.origin);
            });
    }, []);

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
                        {selectedIndex === 0 && <span className="text-white">Main Menu</span>}
                        {selectedIndex === 1 && <span className="text-cyan-300">Sloth Lounge</span>}
                        {selectedIndex === 2 && <span className="text-emerald-300">Mission Board</span>}
                        {selectedIndex === 3 && <span className="text-fuchsia-300">Upgrade Lounge</span>}
                        {selectedIndex === 4 && <span className="text-amber-300">Hall of Fame</span>}
                        {selectedIndex === 5 && <span className="text-orange-300">Sloth Squads</span>}
                        {selectedIndex === 6 && <span className="text-rose-300">Cosmic Codex</span>}
                        {selectedIndex === 7 && <span className="text-pink-400">Synergy Codex</span>}
                        {selectedIndex === 8 && <span className="text-amber-500">Character Mastery</span>}
                        {selectedIndex === 9 && <span className="text-red-400">Leviathan Trials</span>}
                        {selectedIndex === 10 && <span className="text-red-500">Global Raid</span>}
                        {selectedIndex === 11 && <span className="text-violet-300">Pilot Profile</span>}
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
                        <SynergyCodex isCarousel={true} />
                    </div>
                    <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto select-none transform-gpu">
                        <Mastery isCarousel={true} />
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