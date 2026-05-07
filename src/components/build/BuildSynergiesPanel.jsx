import React from 'react';
import { Zap, GitBranch, CheckCircle2, Circle } from 'lucide-react';
import { getDiscoveredCombos } from '@/lib/buildStats';

// Two side-by-side lists: weapon synergies and weapon evolutions.
// Marks which combos the player has discovered (recorded globally on the save).
// Synergies/evolutions are formed in-run, so this panel is a "codex" of what's
// possible — not a live state of the current run.
export default function BuildSynergiesPanel({ save }) {
    const { synergies, evolutions } = getDiscoveredCombos(save);
    const totalSyn = synergies.length;
    const discoveredSyn = synergies.filter(s => s.discovered).length;
    const totalEvo = evolutions.length;
    const discoveredEvo = evolutions.filter(e => e.discovered).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Synergies */}
            <div className="bg-slate-900/60 rounded-lg border border-pink-700/40 p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-pink-300" />
                        <span className="text-sm font-bold text-pink-200 uppercase tracking-wider">Synergies</span>
                    </div>
                    <span className="text-[10px] text-pink-300/70 font-mono">{discoveredSyn}/{totalSyn}</span>
                </div>
                <div className="space-y-1">
                    {synergies.map(s => (
                        <div key={s.result} className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] ${s.discovered ? 'bg-pink-950/40 border border-pink-700/40' : 'bg-slate-950/40 border border-slate-800'}`}>
                            {s.discovered
                                ? <CheckCircle2 className="w-3 h-3 text-pink-300 shrink-0" />
                                : <Circle className="w-3 h-3 text-slate-600 shrink-0" />}
                            <div className="flex-1 min-w-0">
                                <div className="text-slate-400 truncate">
                                    {s.weapon1Name} <span className="text-slate-600">+</span> {s.weapon2Name}
                                </div>
                                <div className={`font-bold truncate ${s.discovered ? 'text-pink-200' : 'text-slate-500'}`}>
                                    → {s.resultName}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Evolutions */}
            <div className="bg-slate-900/60 rounded-lg border border-orange-700/40 p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-orange-300" />
                        <span className="text-sm font-bold text-orange-200 uppercase tracking-wider">Evolutions</span>
                    </div>
                    <span className="text-[10px] text-orange-300/70 font-mono">{discoveredEvo}/{totalEvo}</span>
                </div>
                <div className="space-y-1">
                    {evolutions.map(e => (
                        <div key={e.evolvedWeapon} className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] ${e.discovered ? 'bg-orange-950/40 border border-orange-700/40' : 'bg-slate-950/40 border border-slate-800'}`}>
                            {e.discovered
                                ? <CheckCircle2 className="w-3 h-3 text-orange-300 shrink-0" />
                                : <Circle className="w-3 h-3 text-slate-600 shrink-0" />}
                            <div className="flex-1 min-w-0">
                                <div className="text-slate-400 truncate">
                                    {e.baseWeaponName} <span className="text-slate-600">+</span> {e.passiveName}
                                </div>
                                <div className={`font-bold truncate ${e.discovered ? 'text-orange-200' : 'text-slate-500'}`}>
                                    → {e.evolvedWeaponName}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}