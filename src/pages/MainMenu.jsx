import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Pencil, Check, X } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import SettingsModal from '../components/game/SettingsModal';

export default function MainMenu() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [showSettings, setShowSettings] = useState(false);

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

    const handleExit = () => {
        SoundManager.init();
        SoundManager.playUIClick();
        if (window.confirm("Are you sure you want to exit?")) {
            window.close();
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-mono">
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-700">
                {isEditingName ? (
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)}
                            className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 outline-none text-sm w-32"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                        />
                        <button onClick={handleSaveName} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                        <button onClick={() => { setIsEditingName(false); setNewName(user?.full_name || ''); }} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <span>Pilot: <strong className="text-cyan-400">{user?.full_name || 'Loading...'}</strong></span>
                        {user && (
                            <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-white transition-colors">
                                <Pencil size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="absolute inset-0 opacity-50">
                {[...Array(50)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute bg-white rounded-full"
                        style={{
                            width: Math.random() * 3 + 1 + 'px',
                            height: Math.random() * 3 + 1 + 'px',
                            top: Math.random() * 100 + '%',
                            left: Math.random() * 100 + '%',
                            animation: `twinkle ${Math.random() * 3 + 2}s infinite`
                        }}
                    />
                ))}
            </div>

            <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1 }}
                className="z-10 text-center mb-16 px-4"
            >
                <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tighter mb-2 md:mb-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                    COSMIC SLOTH
                </h1>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-widest">
                    SURVIVAL
                </h2>
            </motion.div>

            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="z-10 flex flex-col gap-4 w-full max-w-md px-6"
            >
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/hub'); }}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xl md:text-2xl font-bold py-3 md:py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                    PLAY
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/info'); }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xl md:text-2xl font-bold py-3 md:py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                >
                    INFO
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/achievements'); }}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-white text-xl md:text-2xl font-bold py-3 md:py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(202,138,4,0.4)]"
                >
                    ACHIEVEMENTS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); navigate('/credits'); }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xl md:text-2xl font-bold py-3 md:py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                >
                    CREDITS
                </button>
                <button 
                    onClick={() => { SoundManager.init(); SoundManager.playUIClick(); setShowSettings(true); }}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xl md:text-2xl font-bold py-3 md:py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(51,65,85,0.4)]"
                >
                    SETTINGS
                </button>
                <button 
                    onClick={handleExit}
                    className="w-full bg-red-600 hover:bg-red-500 text-white text-xl md:text-2xl font-bold py-3 md:py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                >
                    EXIT
                </button>
            </motion.div>
            
            <div className="absolute bottom-8 text-slate-500 text-sm z-10">
                v1.0.0 - Lazy but Devastating
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
}