import React from 'react';

export default function GameLoadingScreen() {
    return (
        <div className="fixed inset-0 z-[100] bg-[#020408] flex items-center justify-center overflow-hidden">
            {/* Animated nebula glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse" style={{ animationDelay: '0.7s' }} />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6 px-6">
                <div className="text-5xl md:text-7xl animate-bounce">🦥</div>

                <h1
                    className="text-2xl md:text-4xl font-black tracking-widest uppercase text-center"
                    style={{
                        background: 'linear-gradient(90deg, #0CA7B8, #D946EF, #0CA7B8)',
                        backgroundSize: '200%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        animation: 'shimmer 3s linear infinite',
                    }}
                >
                    Initializing Sloth Mayhem
                </h1>

                <div className="flex items-center gap-2 text-cyan-300 text-xs md:text-sm font-mono tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Loading operative · syncing save · arming weapons</span>
                </div>

                <div className="w-48 md:w-64 h-1 bg-slate-900 border border-cyan-500/30 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500"
                        style={{
                            backgroundSize: '200% 100%',
                            animation: 'loadbar 1.5s ease-in-out infinite',
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
                @keyframes loadbar {
                    0% { background-position: 100% 0; }
                    100% { background-position: -100% 0; }
                }
            `}</style>
        </div>
    );
}