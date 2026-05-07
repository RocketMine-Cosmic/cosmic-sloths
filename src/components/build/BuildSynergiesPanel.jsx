import React from 'react';
import { Zap, GitBranch, CheckCircle2, Circle } from 'lucide-react';
import { WEAPONS } from '../../game/Constants';
import { getDiscoveredCombos } from '@/lib/buildStats';

// Render the raw base stats of a synergy/evolution result so players can see
// what the combo's damage / cooldown / area actually IS, not just its name.
function ResultStats({ weaponId }) {
    const w = WEAPONS[weaponId];
    if (!w) return null;
    const cdSec = (w.baseCooldown / 60).toFixed(2);
    return (
        <div className="grid grid-cols-3 gap-1 mt-1 text-[9px]">
            <div className="bg-slate-950/60 rounded px-1.5 py-0.5 border border-slate-800/80">
                <div className="text-slate-500 uppercase tracking-wider">Dmg</div>
                <div className="text-emerald-300 font-mono font-bold">{w.baseDamage}</div>
            </div>
            <div className="bg-slate-950/60 rounded px-1.5 py-0.5 border border-slate-800/80">
                <div className="text-slate-500 uppercase tracking-wider">CD</div>
                <div className="text-emerald-300 font-mono font-bold">{cdSec}s</div>
            </div>
            <div className="bg-slate-950/60 rounded px-1.5 py-0.5 border border-slate-800/80">
                <div className="text-slate-500 uppercase tracking-wider">Area</div>
                <div className="text-emerald-300 font-mono font-bold">×{w.baseArea}</div>
            </div>
        </div>
    );
}

export default function BuildSynergiesPanel({ save }) {
    const { synergies, evolutions } = getDiscoveredCombos(save);
    const totalSyn = synergies.length;
    const discoveredSyn = synergies.filter(s => s.discovered).length;
    const totalEvo = evolutions.length;
    const discoveredEvo = evolutions.filter(e => e.discovered).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-900/60 rounded-lg border border-pink-700/40 p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-pink-300" />
                        <span className="text-sm font-bold text-pink-200 uppercase tracking-wider">Synergies</span>
                    </div>
                    <span className="text-[10px] text-pink-300/70 font-mono">{discoveredSyn}/{totalSyn}</span>
                </div>
                <div className="space-y-1.5">
                    {synergies.map(s => {
                        const result = WEAPONS[s.result];
                        return (
                            <div key={s.result} className={`px-2 py-1.5 rounded text-[11px] ${s.discovered ? 'bg-pink-950/40 border border-pink-700/40' : 'bg-slate-950/40 border border-slate-800'}`}>
                                <div className="flex items-center gap-2">
                                    {s.discovered
                                        ? <CheckCircle2 className="w-3 h-3 text-pink-300 shrink-0" />
                                        : <Circle className="w-3 h-3 text-slate-600 shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-slate-400 truncate">
                                            {s.weapon1Name} <span className="text-slate-600">+</span> {s.weapon2Name}
                                        </div>
                                        <div className={`font-bold truncate ${s.discovered ? 'text-pink-200' : 'text-slate-300'}`}>
                                            → {s.resultName}
                                        </div>
                                    </div>
                                </div>
                                {result?.desc && (
                                    <div className="text-[10px] text-slate-400 mt-1 leading-snug pl-5">{result.desc}</div>
                                )}
                                <div className="pl-5"><ResultStats weaponId={s.result} /></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-slate-900/60 rounded-lg border border-orange-700/40 p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-orange-300" />
                        <span className="text-sm font-bold text-orange-200 uppercase tracking-wider">Evolutions</span>
                    </div>
                    <span className="text-[10px] text-orange-300/70 font-mono">{discoveredEvo}/{totalEvo}</span>
                </div>
                <div className="space-y-1.5">
                    {evolutions.map(e => {
                        const result = WEAPONS[e.evolvedWeapon];
                        return (
                            <div key={e.evolvedWeapon} className={`px-2 py-1.5 rounded text-[11px] ${e.discovered ? 'bg-orange-950/40 border border-orange-700/40' : 'bg-slate-950/40 border border-slate-800'}`}>
                                <div className="flex items-center gap-2">
                                    {e.discovered
                                        ? <CheckCircle2 className="w-3 h-3 text-orange-300 shrink-0" />
                                        : <Circle className="w-3 h-3 text-slate-600 shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-slate-400 truncate">
                                            {e.baseWeaponName} <span className="text-slate-600">+</span> {e.passiveName}
                                        </div>
                                        <div className={`font-bold truncate ${e.discovered ? 'text-orange-200' : 'text-slate-300'}`}>
                                            → {e.evolvedWeaponName}
                                        </div>
                                    </div>
                                </div>
                                {result?.desc && (
                                    <div className="text-[10px] text-slate-400 mt-1 leading-snug pl-5">{result.desc}</div>
                                )}
                                <div className="pl-5"><ResultStats weaponId={e.evolvedWeapon} /></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}