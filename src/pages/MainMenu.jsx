import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Pencil, Check, X } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import { ThemeManager } from '../game/ThemeManager';
import SettingsModal from '../components/game/SettingsModal';

export default function MainMenu({ isCarousel, onNavigateToPlay }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
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
                setNewName(me?.full_name || '');
            } catch (e) {
                console.error(e);
            }
        };
        fetchUser();
    }, []);

    const handleSaveName = async () => {
        if (!newName.trim()) return;
        try {
            await base44.auth.updateMe({ full_name: newName.trim() });
            setUser(prev => ({ ...prev, full_name: newName.trim() }));
            setIsEditingName(false);
        } catch (e) {
            console.error(e);
        }
    };



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
                className="z-10 grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4 w-full max-w-2xl px-4"
            >
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/info'); }}
                    style={{ boxShadow: `0 0 15px ${theme.colors.primary}66`, borderColor: `${theme.colors.primary}4d`, backgroundColor: `${theme.colors.primary}cc` }}
                    className="w-full backdrop-blur-sm text-white text-base md:text-xl font-bold py-2 md:py-3 rounded-lg md:rounded-xl transition-all transform hover:scale-105 active:scale-95 border"
                >
                    INFO
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/achievements'); }}
                    style={{ boxShadow: `0 0 15px ${theme.colors.primary}66`, borderColor: `${theme.colors.primary}4d`, backgroundColor: `${theme.colors.primary}cc` }}
                    className="w-full backdrop-blur-sm text-white text-base md:text-xl font-bold py-2 md:py-3 rounded-lg md:rounded-xl transition-all transform hover:scale-105 active:scale-95 border"
                >
                    ACHIEVEMENTS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/credits'); }}
                    style={{ boxShadow: `0 0 15px ${theme.colors.primary}66`, borderColor: `${theme.colors.primary}4d`, backgroundColor: `${theme.colors.primary}cc` }}
                    className="w-full backdrop-blur-sm text-white text-base md:text-xl font-bold py-2 md:py-3 rounded-lg md:rounded-xl transition-all transform hover:scale-105 active:scale-95 border"
                >
                    CREDITS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); setShowSettings(true); }}
                    className="w-full bg-slate-700/90 backdrop-blur-sm hover:bg-slate-600 text-white text-base md:text-xl font-bold py-2 md:py-3 rounded-lg md:rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(51,65,85,0.4)] border border-slate-500/30"
                >
                    SETTINGS
                </button>
            </motion.div>
            
            <div className="absolute bottom-4 text-slate-400 text-xs md:text-sm z-10">
                v1.0.0 - Lazy but Devastating
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
}