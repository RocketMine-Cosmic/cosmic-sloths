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
            className={`${isCarousel ? 'h-full' : 'h-[100dvh]'} w-full flex flex-col items-center justify-end pb-20 md:pb-28 relative overflow-hidden font-sans bg-no-repeat bg-cover bg-center`}
            style={{ backgroundImage: `url('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/206f836d9_MainMenu.png')`, backgroundColor: theme.colors.bg }}
        >


            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0416] via-transparent to-transparent opacity-90 pointer-events-none"></div>

            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="z-10 grid grid-cols-2 gap-3 w-full max-w-xl md:max-w-2xl px-4 font-sans"
            >
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/info'); }}
                    className="w-full bg-[#0CA7B8]/20 hover:bg-[#0CA7B8]/40 backdrop-blur-md text-cyan-100 hover:text-white text-sm md:text-lg font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#0CA7B8]/60 hover:border-[#0CA7B8] rounded-tl-2xl shadow-[0_0_20px_rgba(12,167,184,0.3)] hover:shadow-[0_0_30px_rgba(12,167,184,0.6)]"
                >
                    INFO
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); setShowSettings(true); }}
                    className="w-full bg-[#D946EF]/20 hover:bg-[#D946EF]/40 backdrop-blur-md text-fuchsia-100 hover:text-white text-sm md:text-lg font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#D946EF]/60 hover:border-[#D946EF] rounded-tr-2xl shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.6)]"
                >
                    SETTINGS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/achievements'); }}
                    className="w-full bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/40 backdrop-blur-md text-violet-100 hover:text-white text-sm md:text-lg font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#8B5CF6]/60 hover:border-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]"
                >
                    ACHIEVEMENTS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/credits'); }}
                    className="w-full bg-[#EC4899]/20 hover:bg-[#EC4899]/40 backdrop-blur-md text-pink-100 hover:text-white text-sm md:text-lg font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#EC4899]/60 hover:border-[#EC4899] shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]"
                >
                    CREDITS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); localStorage.removeItem('cosmic_sloth_save'); base44.auth.logout(); }}
                    className="col-span-2 w-full bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 backdrop-blur-md text-amber-100 hover:text-white text-sm md:text-lg font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#F59E0B]/60 hover:border-[#F59E0B] rounded-b-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2"
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