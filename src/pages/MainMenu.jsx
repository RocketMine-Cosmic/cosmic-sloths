import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Pencil, Check, X, LogOut, LogIn } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import SettingsModal from '../components/game/SettingsModal';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import sdk, { getOmenAuthData, onOmenAuth } from '../lib/omenSdk';

export default function MainMenu({ isCarousel, onNavigateToPlay }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [omenAuth, setOmenAuth] = useState(() => getOmenAuthData());
    const [omenSuccess, setOmenSuccess] = useState(null);

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

    useEffect(() => {
        return onOmenAuth((authData) => {
            setOmenAuth(authData);
            setOmenSuccess(authData);
            setTimeout(() => setOmenSuccess(null), 5000);
        });
    }, []);

    const handleOmenLogin = async () => {
        SoundManager.playUIClick();
        await sdk.authenticate();
    };

    const handleOmenLogout = () => {
        SoundManager.playUIClick();
        setOmenAuth(null);
    };



    return (
        <div 
            className={`${isCarousel ? 'h-full' : 'h-[100dvh]'} w-full flex flex-col items-center justify-end pb-12 md:pb-20 relative overflow-hidden font-sans bg-[#0b0416]`}
            style={{ backgroundImage: `url('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/20a4a9160_image-48.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center center' }}
        >

            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0416] via-[#0b0416]/20 to-transparent opacity-90 pointer-events-none z-0"></div>

            <div className="absolute top-4 right-4 z-20">
                <CurrencyHeader />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.8 }}
                className="absolute inset-0 flex flex-col items-center justify-start pt-[14vh] md:pt-[12vh] z-10 pointer-events-none"
            >
                <img 
                    src="https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/431c29f41_CosmicF.png" 
                    alt="Cosmic Sloths" 
                    className="w-[90%] md:w-[75%] max-w-[900px] h-auto object-contain drop-shadow-[0_0_30px_rgba(217,70,239,0.6)]"
                />
            </motion.div>

            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="z-10 grid grid-cols-2 gap-3 w-[90%] max-w-md md:max-w-lg px-4 font-sans relative"
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
                {user?.role === 'admin' && (
                    <button 
                        onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/admin'); }}
                        className="col-span-2 w-full bg-red-900/40 hover:bg-red-900/60 backdrop-blur-md text-red-100 hover:text-white text-sm md:text-lg font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-red-500/60 hover:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2"
                    >
                        ADMIN DASHBOARD
                    </button>
                )}
                {omenAuth ? (
                    <button
                        onClick={handleOmenLogout}
                        className="col-span-2 w-full bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 backdrop-blur-md text-amber-100 hover:text-white text-sm md:text-lg font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#F59E0B]/60 hover:border-[#F59E0B] rounded-b-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2"
                    >
                        <LogOut size={20} /> OMENX LOGOUT
                    </button>
                ) : (
                    <button
                        onClick={handleOmenLogin}
                        className="col-span-2 w-full bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 backdrop-blur-md text-amber-100 hover:text-white text-sm md:text-lg font-black tracking-widest uppercase py-4 md:py-5 transition-all border border-[#F59E0B]/60 hover:border-[#F59E0B] rounded-b-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2"
                    >
                        <LogIn size={20} /> LOGIN WITH OMENX
                    </button>
                )}
                {omenSuccess && (
                    <div className="col-span-2 bg-green-900/60 border border-green-500/60 rounded-xl p-3 text-green-300 text-xs font-mono break-all">
                        ✅ OmenX Login Success!<br/>
                        <span className="text-green-400/70">{JSON.stringify(omenSuccess, null, 2)}</span>
                    </div>
                )}
            </motion.div>
            
            <div className="absolute bottom-4 text-slate-500/70 text-[10px] md:text-xs z-10 tracking-widest uppercase">
                SlowBurn Studios
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
}