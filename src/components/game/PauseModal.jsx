import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SettingsModal from './SettingsModal';

export default function PauseModal({ onResume, onQuit }) {
    const [showSettings, setShowSettings] = useState(false);

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border-2 border-cyan-500 p-6 md:p-8 rounded-xl max-w-sm w-full text-center"
            >
                <h2 className="text-3xl md:text-4xl font-bold text-cyan-400 mb-8 font-mono">PAUSED</h2>
                
                <div className="flex flex-col gap-4">
                    <button
                        onClick={onResume}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-4 rounded-lg font-bold text-lg md:text-xl transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    >
                        Resume
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-lg font-bold text-lg md:text-xl transition-colors shadow-[0_0_15px_rgba(51,65,85,0.4)]"
                    >
                        Settings
                    </button>
                    <button
                        onClick={onQuit}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-lg font-bold text-lg md:text-xl transition-colors border border-slate-600"
                    >
                        Quit to Lounge
                    </button>
                </div>
            </motion.div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
}