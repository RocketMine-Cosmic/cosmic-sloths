import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function MainMenu() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-mono">
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
                className="z-10 text-center mb-16"
            >
                <h1 className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                    COSMIC SLOTH
                </h1>
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-widest">
                    SURVIVAL
                </h2>
            </motion.div>

            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="z-10 flex flex-col gap-6 w-full max-w-md px-6"
            >
                <button 
                    onClick={() => navigate('/hub')}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-2xl font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                    START GAME
                </button>
            </motion.div>
            
            <div className="absolute bottom-8 text-slate-500 text-sm z-10">
                v1.0.0 - Lazy but Devastating
            </div>
        </div>
    );
}