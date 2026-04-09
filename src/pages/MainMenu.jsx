import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Pencil, Check, X, LogOut } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import SettingsModal from '../components/game/SettingsModal';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';

export default function MainMenu({ isCarousel, onNavigateToPlay }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

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
            className={`${isCarousel ? 'h-full' : 'h-[100dvh]'} w-full flex flex-col items-center justify-end pb-12 md:pb-20 relative overflow-hidden font-sans bg-[#0b0416]`}
            style={{ backgroundImage: `url('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/20a4a9160_image-48.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center center' }}
        >

            <div className="absolute inset-0 bg-gradient-to-t from-[#040108] via-[#0b0416]/60 to-transparent opacity-95 pointer-events-none z-0"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-transparent to-transparent pointer-events-none z-0"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none z-0"></div>

            <div className="absolute top-4 right-4 z-20">
                <CurrencyHeader />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.8 }}
                className="absolute inset-0 flex flex-col items-center justify-start pt-[14vh] md:pt-[12vh] z-10 pointer-events-none"
            >
                <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 opacity-30 blur-2xl rounded-[100px] group-hover:opacity-50 transition-opacity duration-1000"></div>
                    <img 
                        src="https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/431c29f41_CosmicF.png" 
                        alt="Cosmic Sloths" 
                        className="w-[90%] md:w-[75%] max-w-[900px] h-auto object-contain drop-shadow-[0_0_30px_rgba(217,70,239,0.8)] relative z-10"
                    />
                </div>
            </motion.div>

            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="z-10 grid grid-cols-2 gap-3 md:gap-4 w-[90%] max-w-md md:max-w-lg px-4 font-sans relative"
            >
                <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-3xl blur-xl z-0"></div>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/info'); }}
                    className="relative z-10 w-full bg-[#0CA7B8]/10 hover:bg-[#0CA7B8]/30 backdrop-blur-xl text-cyan-300 hover:text-white text-sm md:text-base font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#0CA7B8]/40 hover:border-[#0CA7B8] rounded-tl-2xl shadow-[0_0_15px_rgba(12,167,184,0.2)] hover:shadow-[0_0_25px_rgba(12,167,184,0.5)] group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    INFO
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); setShowSettings(true); }}
                    className="relative z-10 w-full bg-[#D946EF]/10 hover:bg-[#D946EF]/30 backdrop-blur-xl text-fuchsia-300 hover:text-white text-sm md:text-base font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#D946EF]/40 hover:border-[#D946EF] rounded-tr-2xl shadow-[0_0_15px_rgba(217,70,239,0.2)] hover:shadow-[0_0_25px_rgba(217,70,239,0.5)] group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    SETTINGS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/achievements'); }}
                    className="relative z-10 w-full bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/30 backdrop-blur-xl text-violet-300 hover:text-white text-sm md:text-base font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#8B5CF6]/40 hover:border-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    ACHIEVEMENTS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/credits'); }}
                    className="relative z-10 w-full bg-[#EC4899]/10 hover:bg-[#EC4899]/30 backdrop-blur-xl text-pink-300 hover:text-white text-sm md:text-base font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#EC4899]/40 hover:border-[#EC4899] shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    CREDITS
                </button>
                {user?.role === 'admin' && (
                    <button 
                        onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/admin'); }}
                        className="relative z-10 col-span-2 w-full bg-red-900/30 hover:bg-red-900/50 backdrop-blur-xl text-red-300 hover:text-white text-sm md:text-base font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-red-500/40 hover:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        ADMIN DASHBOARD
                    </button>
                )}
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); localStorage.removeItem('cosmic_sloth_save'); base44.auth.logout(); }}
                    className="relative z-10 col-span-2 w-full bg-[#F59E0B]/10 hover:bg-[#F59E0B]/30 backdrop-blur-xl text-amber-300 hover:text-white text-sm md:text-base font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#F59E0B]/40 hover:border-[#F59E0B] rounded-b-2xl shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <LogOut size={16} /> LOGOUT
                </button>
            </motion.div>
            
            <div className="absolute bottom-4 text-slate-500/70 text-[10px] md:text-xs z-10 tracking-widest uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                SlowBurn Studios
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
}