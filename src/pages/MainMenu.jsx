import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Pencil, Check, X, LogOut } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import { ThemeManager } from '../game/ThemeManager';
import SettingsModal from '../components/game/SettingsModal';
export default function MainMenu({ isCarousel, onNavigateToPlay }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [theme, setTheme] = useState(ThemeManager.getTheme());

    useEffect(() => {
        const onThemeChange = () => setTheme(ThemeManager.getTheme());
        window.addEventListener('themechange', onThemeChange);
        return () => window.removeEventListener('themechange', onThemeChange);
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const me = await base44.auth.me();
                setUser(me);
            } catch (e) {
                console.error(e);
            }
        };
        fetchUser();
    }, []);



    return (
        <div 
            className={`${isCarousel ? 'h-full' : 'h-[100dvh]'} w-full flex flex-col items-center justify-end pb-20 md:pb-28 relative overflow-hidden font-mono bg-no-repeat bg-cover md:bg-contain`}
            style={{ backgroundImage: `url('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/8a82d41fd_Gemini_Generated_Image_n8cz52n8cz52n8cz.png')`, backgroundPosition: 'center top', backgroundColor: theme.colors.bg }}
        >


            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80 pointer-events-none"></div>

            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="z-10 grid grid-cols-2 gap-3 w-full max-w-xl md:max-w-2xl px-4 font-sans"
            >
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/info'); }}
                    className="w-full bg-[#050B14]/80 hover:bg-[#0A1628]/90 backdrop-blur-md text-[#0CA7B8] hover:text-white text-sm md:text-lg font-bold tracking-widest uppercase py-4 md:py-5 transition-all border border-[#0CA7B8]/40 hover:border-[#0CA7B8] rounded-tl-2xl shadow-[0_0_15px_rgba(12,167,184,0.15)] hover:shadow-[0_0_25px_rgba(12,167,184,0.3)]"
                >
                    INFO
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); setShowSettings(true); }}
                    className="w-full bg-[#050B14]/80 hover:bg-[#0A1628]/90 backdrop-blur-md text-[#0CA7B8] hover:text-white text-sm md:text-lg font-bold tracking-widest uppercase py-4 md:py-5 transition-all border border-[#0CA7B8]/40 hover:border-[#0CA7B8] rounded-tr-2xl shadow-[0_0_15px_rgba(12,167,184,0.15)] hover:shadow-[0_0_25px_rgba(12,167,184,0.3)]"
                >
                    SETTINGS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/achievements'); }}
                    className="w-full bg-[#0CA7B8]/20 hover:bg-[#0CA7B8]/30 backdrop-blur-md text-white text-sm md:text-lg font-bold tracking-widest uppercase py-4 md:py-5 transition-all border border-[#0CA7B8] shadow-[0_0_15px_rgba(12,167,184,0.2)] hover:shadow-[0_0_25px_rgba(12,167,184,0.4)]"
                >
                    ACHIEVEMENTS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/credits'); }}
                    className="w-full bg-[#0CA7B8]/20 hover:bg-[#0CA7B8]/30 backdrop-blur-md text-white text-sm md:text-lg font-bold tracking-widest uppercase py-4 md:py-5 transition-all border border-[#0CA7B8] shadow-[0_0_15px_rgba(12,167,184,0.2)] hover:shadow-[0_0_25px_rgba(12,167,184,0.4)]"
                >
                    CREDITS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); localStorage.removeItem('cosmic_sloth_save'); base44.auth.logout(); }}
                    className="col-span-2 w-full bg-red-950/60 hover:bg-red-900/80 backdrop-blur-md text-red-400 hover:text-red-300 text-sm md:text-lg font-bold tracking-widest uppercase py-4 md:py-5 transition-all border border-red-500/40 hover:border-red-500 rounded-b-2xl shadow-[0_0_15px_rgba(239,68,68,0.15)] flex items-center justify-center gap-2"
                >
                    <LogOut size={20} /> LOGOUT
                </button>
            </motion.div>
            
            <div className="absolute bottom-4 text-slate-400 text-xs md:text-sm z-10">
                v1.0.0 - Lazy but Devastating
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
}