import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SoundManager } from '../../game/SoundManager';
import { SFXManager } from '../../game/SFXManager';
import { X, Volume2, VolumeX } from 'lucide-react';

export default function SettingsModal({ onClose }) {
    const [bgmVol, setBgmVol] = useState(SoundManager.bgm.volume);
    const [sfxVol, setSfxVol] = useState(SFXManager.sfxVolume);
    const [isMuted, setIsMuted] = useState(SoundManager.isMuted());

    const handleBgmChange = (e) => {
        const val = parseFloat(e.target.value);
        setBgmVol(val);
        SoundManager.setBgmVolume(val);
    };

    const handleSfxChange = (e) => {
        const val = parseFloat(e.target.value);
        setSfxVol(val);
        SFXManager.setSfxVolume(val);
    };

    const handleSfxRelease = () => {
        SFXManager.playUIClick(); // Feedback when they stop dragging
    };

    const handleToggleMute = () => {
        const isNowMuted = !SoundManager.isMuted();
        SoundManager.toggleMute();
        SFXManager.toggleMute(!isNowMuted);
        setIsMuted(isNowMuted);
    };

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border-2 border-cyan-500 p-6 md:p-8 rounded-xl max-w-sm w-full text-white font-mono relative"
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>
                
                <h2 className="text-3xl font-bold text-cyan-400 mb-8 text-center">SETTINGS</h2>
                
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2 items-center">
                            <label className="font-bold text-slate-300">Master Audio</label>
                            <button onClick={handleToggleMute} className="text-cyan-400 hover:text-cyan-300 bg-slate-800 p-2 rounded-lg border border-slate-700">
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                        </div>
                        <div className="text-sm text-slate-500 mb-4">
                            {isMuted ? 'Audio is currently muted.' : 'Audio is enabled.'}
                        </div>
                    </div>

                    <div className={isMuted ? 'opacity-50 pointer-events-none' : ''}>
                        <div className="flex justify-between mb-2">
                            <label className="font-bold text-slate-300">Music Volume</label>
                            <span className="text-cyan-400">{Math.round(bgmVol * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.01" 
                            value={bgmVol} 
                            onChange={handleBgmChange}
                            disabled={isMuted}
                            className="w-full accent-cyan-500"
                        />
                    </div>

                    <div className={isMuted ? 'opacity-50 pointer-events-none' : ''}>
                        <div className="flex justify-between mb-2">
                            <label className="font-bold text-slate-300">SFX Volume</label>
                            <span className="text-cyan-400">{Math.round(sfxVol * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.01" 
                            value={sfxVol} 
                            onChange={handleSfxChange}
                            onMouseUp={handleSfxRelease}
                            onTouchEnd={handleSfxRelease}
                            disabled={isMuted}
                            className="w-full accent-cyan-500"
                        />
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-bold text-lg transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                    Done
                </button>
            </motion.div>
        </div>
    );
}