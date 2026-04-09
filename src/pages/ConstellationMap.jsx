import React, { useState, useEffect, useRef } from 'react';
import { SaveManager } from '../game/SaveManager';
import { SoundManager } from '../game/SoundManager';
import CurrencyHeader from '../components/game/CurrencyHeader';
import { CONSTELLATION_NODES } from '../game/Constants';
import { Star, Coins, Lock, CheckCircle2, ChevronLeft, Hexagon, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ConstellationMap({ isCarousel = false }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());
    const [selectedNode, setSelectedNode] = useState(null);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const handleSaveUpdated = (e) => setSave(e.detail);
        window.addEventListener('saveUpdated', handleSaveUpdated);
        
        // Center the view on mount
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                left: 750 - scrollContainerRef.current.clientWidth / 2,
                top: 750 - scrollContainerRef.current.clientHeight / 2,
                behavior: 'instant'
            });
        }

        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, []);

    const unlockedNodes = save.constellationNodes || [];

    const isUnlocked = (id) => unlockedNodes.includes(id);
    const isAvailable = (node) => {
        if (isUnlocked(node.id)) return false;
        if (node.req.length === 0) return true;
        // Can be unlocked from ANY connected path
        return node.req.some(reqId => isUnlocked(reqId));
    };

    const handleUnlock = () => {
        if (!selectedNode || isUnlocked(selectedNode.id) || !isAvailable(selectedNode)) return;

        if (save.gold < selectedNode.costGold || (save.starFragments || 0) < selectedNode.costFrags) {
            SoundManager.playError?.();
            return;
        }

        SoundManager.playLevelUp?.();
        const newSave = {
            ...save,
            gold: save.gold - selectedNode.costGold,
            starFragments: (save.starFragments || 0) - selectedNode.costFrags,
            constellationNodes: [...unlockedNodes, selectedNode.id]
        };

        SaveManager.save(newSave);
        setSave(newSave);
    };

    return (
        <div className={`w-full h-full bg-[#050510] flex flex-col relative overflow-hidden ${!isCarousel ? 'fixed inset-0 z-50' : ''}`}>
            {!isCarousel && (
                <div className="absolute top-4 left-4 z-50">
                    <button onClick={() => navigate('/hub')} className="p-3 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md rounded-full text-white border border-slate-600 shadow-xl">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                </div>
            )}
            
            <div className="absolute top-4 right-4 z-50">
                <CurrencyHeader />
            </div>

            {/* Scrollable Map Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto cursor-grab active:cursor-grabbing relative hide-scrollbar">
                <div className="relative w-[1500px] h-[1500px]" style={{ backgroundImage: 'radial-gradient(circle at center, #1a1a2e 0%, #050510 100%)' }}>
                    
                    {/* SVG Lines */}
                    <svg className="absolute inset-0 pointer-events-none w-full h-full">
                        {CONSTELLATION_NODES.map(node => (
                            node.req.map(reqId => {
                                const reqNode = CONSTELLATION_NODES.find(n => n.id === reqId);
                                if (!reqNode) return null;

                                const sourceUnlocked = isUnlocked(reqId);
                                const targetUnlocked = isUnlocked(node.id);
                                const targetAvailable = isAvailable(node);

                                let strokeColor = '#334155'; // Locked
                                if (sourceUnlocked && targetUnlocked) strokeColor = '#d946ef'; // Fully connected
                                else if (sourceUnlocked && targetAvailable) strokeColor = '#475569'; // Available path

                                return (
                                    <line
                                        key={`${reqId}-${node.id}`}
                                        x1={reqNode.x}
                                        y1={reqNode.y}
                                        x2={node.x}
                                        y2={node.y}
                                        stroke={strokeColor}
                                        strokeWidth={sourceUnlocked && targetUnlocked ? 4 : 2}
                                        strokeDasharray={targetUnlocked ? "none" : "8,8"}
                                        className="transition-all duration-500"
                                    />
                                );
                            })
                        ))}
                    </svg>

                    {/* Nodes */}
                    {CONSTELLATION_NODES.map(node => {
                        const unlocked = isUnlocked(node.id);
                        const available = isAvailable(node);
                        const isSelected = selectedNode?.id === node.id;
                        
                        let bgClass = "bg-slate-800 border-slate-600 shadow-none";
                        let iconColor = "text-slate-500";
                        
                        if (unlocked) {
                            bgClass = node.isKeystone ? "bg-fuchsia-950 border-fuchsia-400 shadow-[0_0_25px_rgba(217,70,239,0.5)]" : "bg-indigo-900 border-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.4)]";
                            iconColor = node.isKeystone ? "text-fuchsia-300" : "text-indigo-300";
                        } else if (available) {
                            bgClass = "bg-slate-700 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)] cursor-pointer hover:bg-slate-600";
                            iconColor = "text-yellow-400";
                        } else {
                            bgClass = "bg-slate-900 border-slate-800 opacity-60";
                        }

                        if (isSelected) {
                            bgClass += " ring-4 ring-white ring-offset-2 ring-offset-[#050510]";
                        }

                        return (
                            <button
                                key={node.id}
                                onClick={() => { SoundManager.playUIClick?.(); setSelectedNode(node); }}
                                className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all duration-300 ${bgClass} ${node.isKeystone ? 'w-16 h-16' : 'w-12 h-12'}`}
                                style={{ left: node.x, top: node.y }}
                            >
                                {unlocked ? (
                                    <CheckCircle2 className={`w-1/2 h-1/2 ${iconColor}`} />
                                ) : available ? (
                                    node.isKeystone ? <Hexagon className={`w-1/2 h-1/2 ${iconColor}`} /> : <Star className={`w-1/2 h-1/2 ${iconColor}`} />
                                ) : (
                                    <Lock className="w-1/2 h-1/2 text-slate-600" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Node Panel */}
            <div className={`absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 p-4 md:p-6 transition-transform duration-300 ${selectedNode ? 'translate-y-0' : 'translate-y-full'}`}>
                {selectedNode && (
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className={`text-2xl font-black ${selectedNode.isKeystone ? 'text-fuchsia-400' : 'text-indigo-300'}`}>
                                    {selectedNode.name}
                                </h2>
                                {selectedNode.isKeystone && (
                                    <span className="bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/50 text-xs px-2 py-0.5 rounded font-bold tracking-widest uppercase">Keystone</span>
                                )}
                                {isUnlocked(selectedNode.id) && (
                                    <span className="bg-green-500/20 text-green-400 border border-green-500/50 text-xs px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Unlocked</span>
                                )}
                            </div>
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed">{selectedNode.desc}</p>
                            {!isUnlocked(selectedNode.id) && !isAvailable(selectedNode) && selectedNode.id !== 'c_start' && (
                                <p className="text-red-400 text-sm mt-2 font-bold flex items-center gap-1">
                                    <Lock className="w-4 h-4" /> Requires adjacent node to be unlocked
                                </p>
                            )}
                        </div>

                        {!isUnlocked(selectedNode.id) && isAvailable(selectedNode) && (
                            <div className="flex flex-col items-center gap-3 w-full md:w-auto">
                                <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    {selectedNode.costGold > 0 && (
                                        <div className={`flex items-center gap-2 font-black text-lg ${save.gold >= selectedNode.costGold ? 'text-yellow-400' : 'text-red-400'}`}>
                                            <Coins className="w-5 h-5 fill-yellow-500" /> {selectedNode.costGold.toLocaleString()}
                                        </div>
                                    )}
                                    {selectedNode.costFrags > 0 && (
                                        <div className={`flex items-center gap-2 font-black text-lg ${(save.starFragments || 0) >= selectedNode.costFrags ? 'text-yellow-300' : 'text-red-400'}`}>
                                            <Star className="w-5 h-5 fill-yellow-400" /> {selectedNode.costFrags}
                                        </div>
                                    )}
                                    {selectedNode.costGold === 0 && selectedNode.costFrags === 0 && (
                                        <div className="text-emerald-400 font-black">FREE</div>
                                    )}
                                </div>
                                <button
                                    onClick={handleUnlock}
                                    disabled={save.gold < selectedNode.costGold || (save.starFragments || 0) < selectedNode.costFrags}
                                    className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-colors shadow-lg"
                                >
                                    Unlock Node
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {selectedNode && (
                <button onClick={() => setSelectedNode(null)} className="absolute top-4 right-4 md:hidden p-2 bg-slate-800 rounded-full text-white">
                    <XCircle className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}