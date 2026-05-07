import React, { useState, useMemo } from 'react';
import { Beaker, Check, Sparkles, Zap, AlertCircle } from 'lucide-react';
import { WEAPONS, UPGRADES, SYNERGIES, EVOLUTIONS, getWeaponStatsAndMastery } from '../../game/Constants';

// Interactive theorycrafter — pick the weapons + passives you'd run, see what
// synergies/evolutions they trigger, and see the predicted final per-weapon stats.
//
// Final formula (matches GameEngine):
//   finalDamage   = weapon.baseDamage   × weaponUpgrade.dmgMult  × character.damageMult
//   finalCooldown = weapon.baseCooldown × weaponUpgrade.cdMult   × character.cooldownMult / 60   (seconds)
//   finalArea     = weapon.baseArea     × weaponUpgrade.areaMult × character.areaMult
//
// We use the stats already computed for the selected character (totals from
// upgrades/talents/mastery/relics/forge) and combine them with each weapon's
// own upgrade investment to produce a concrete number per weapon.
//
// Note: this is a baseline preview. In-run RNG (level-up upgrades, pickups,
// active synergy effects) will further modify these numbers.

export default function BuildTheorycrafter({ save, charStats }) {
    const baseWeapons = useMemo(
        () => Object.values(WEAPONS).filter(w => !w.isSynergy && !w.isEvolution),
        []
    );
    const passives = useMemo(
        () => UPGRADES.filter(u => u.type === 'passive'),
        []
    );

    // Selection state. Cap at 6 weapons + 6 passives (matches in-game inventory cap).
    const [selectedWeapons, setSelectedWeapons] = useState(new Set());
    const [selectedPassives, setSelectedPassives] = useState(new Set());

    const toggleWeapon = (id) => {
        setSelectedWeapons(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else if (next.size < 6) next.add(id);
            return next;
        });
    };
    const togglePassive = (id) => {
        setSelectedPassives(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else if (next.size < 6) next.add(id);
            return next;
        });
    };

    // Build the resolved weapon set: when a synergy or evolution triggers it
    // *replaces* the contributing base weapons in the final loadout.
    const resolved = useMemo(() => {
        const triggeredSynergies = [];
        const triggeredEvolutions = [];
        let activeWeapons = new Set(selectedWeapons);

        // Synergies — both base weapons present → produce result, remove the two parents.
        for (const s of SYNERGIES) {
            if (activeWeapons.has(s.weapon1) && activeWeapons.has(s.weapon2)) {
                triggeredSynergies.push(s);
                activeWeapons.delete(s.weapon1);
                activeWeapons.delete(s.weapon2);
                activeWeapons.add(s.result);
            }
        }
        // Evolutions — base weapon present + required passive present → evolve.
        for (const e of EVOLUTIONS) {
            if (activeWeapons.has(e.baseWeapon) && selectedPassives.has(e.passive)) {
                triggeredEvolutions.push(e);
                activeWeapons.delete(e.baseWeapon);
                activeWeapons.add(e.evolvedWeapon);
            }
        }
        return {
            triggeredSynergies,
            triggeredEvolutions,
            finalWeapons: Array.from(activeWeapons),
        };
    }, [selectedWeapons, selectedPassives]);

    // Pull the character's total damage / cooldown / area multipliers from charStats
    // (those already include base + upgrades + talents + mastery + relics + forge).
    const charMults = useMemo(() => {
        const get = (key, fallback) => charStats.find(s => s.stat === key)?.total ?? fallback;
        return {
            damageMult:   get('damageMult',   1),
            cooldownMult: get('cooldownMult', 1),
            areaMult:     get('areaMult',     1),
        };
    }, [charStats]);

    // Compute final stats for each resolved weapon.
    const weaponPredictions = useMemo(() => {
        return resolved.finalWeapons.map(wId => {
            const w = WEAPONS[wId];
            if (!w) return null;
            const m = getWeaponStatsAndMastery(save, wId);
            const finalDamage   = w.baseDamage   * m.dmgMult  * charMults.damageMult;
            const finalCooldown = w.baseCooldown * m.cdMult   * charMults.cooldownMult / 60;
            const finalArea     = w.baseArea     * m.areaMult * charMults.areaMult;
            const dps = finalCooldown > 0 ? finalDamage / finalCooldown : finalDamage;
            return {
                id: wId,
                name: w.name,
                isSynergy:   !!w.isSynergy,
                isEvolution: !!w.isEvolution,
                isMastered:  m.isMastered,
                baseDamage:   w.baseDamage,
                baseCooldown: w.baseCooldown,
                baseArea:     w.baseArea,
                weaponDmgMult:  m.dmgMult,
                weaponCdMult:   m.cdMult,
                weaponAreaMult: m.areaMult,
                finalDamage,
                finalCooldown,
                finalArea,
                dps,
            };
        }).filter(Boolean);
    }, [resolved.finalWeapons, save, charMults]);

    return (
        <section className="bg-[#0b0416]/60 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-4 shadow-[0_0_30px_rgba(16,185,129,0.10)]">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Beaker className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base md:text-lg font-bold text-emerald-300 uppercase tracking-widest">Theorycrafter</h2>
                <span className="text-[10px] text-slate-500 italic ml-auto">
                    {selectedWeapons.size}/6 weapons · {selectedPassives.size}/6 passives
                </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3 italic leading-snug">
                Pick a hypothetical loadout. Synergies and evolutions will trigger automatically and the predicted
                damage/cooldown/area for each resulting weapon are shown below — including your character's
                multipliers. In-run pickups and level-up upgrades stack further on top.
            </p>

            {/* Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {/* Weapons */}
                <div>
                    <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
                        <Zap className="w-3 h-3" /> Weapons
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {baseWeapons.map(w => {
                            const checked = selectedWeapons.has(w.id);
                            const disabled = !checked && selectedWeapons.size >= 6;
                            return (
                                <button
                                    key={w.id}
                                    onClick={() => toggleWeapon(w.id)}
                                    disabled={disabled}
                                    className={`text-left px-2 py-1.5 rounded border text-[11px] flex items-center gap-1.5 transition-colors ${
                                        checked
                                            ? 'bg-cyan-950/50 border-cyan-500/60 text-cyan-200'
                                            : disabled
                                                ? 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed'
                                                : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-cyan-700'
                                    }`}
                                >
                                    <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${
                                        checked ? 'bg-cyan-500 border-cyan-400' : 'border-slate-600'
                                    }`}>
                                        {checked && <Check className="w-2.5 h-2.5 text-slate-950" />}
                                    </span>
                                    <span className="truncate font-bold">{w.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Passives */}
                <div>
                    <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Passives
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {passives.map(p => {
                            const checked = selectedPassives.has(p.id);
                            const disabled = !checked && selectedPassives.size >= 6;
                            // Highlight passives that complete an evolution for an actively-selected weapon
                            const evoMatch = EVOLUTIONS.find(e => e.passive === p.id && selectedWeapons.has(e.baseWeapon));
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => togglePassive(p.id)}
                                    disabled={disabled}
                                    className={`text-left px-2 py-1.5 rounded border text-[11px] flex items-center gap-1.5 transition-colors ${
                                        checked
                                            ? 'bg-fuchsia-950/50 border-fuchsia-500/60 text-fuchsia-200'
                                            : disabled
                                                ? 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed'
                                                : evoMatch
                                                    ? 'bg-amber-950/30 border-amber-700/50 text-amber-200 hover:border-amber-500'
                                                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-fuchsia-700'
                                    }`}
                                    title={p.desc}
                                >
                                    <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${
                                        checked ? 'bg-fuchsia-500 border-fuchsia-400' : 'border-slate-600'
                                    }`}>
                                        {checked && <Check className="w-2.5 h-2.5 text-slate-950" />}
                                    </span>
                                    <span className="truncate font-bold">{p.name}</span>
                                    {evoMatch && !checked && (
                                        <span className="ml-auto text-[9px] text-amber-400 shrink-0">⚡</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Triggered synergies / evolutions */}
            {(resolved.triggeredSynergies.length > 0 || resolved.triggeredEvolutions.length > 0) && (
                <div className="mb-3 space-y-1.5">
                    {resolved.triggeredSynergies.map(s => (
                        <div key={s.result} className="bg-pink-950/30 border border-pink-500/40 rounded px-2 py-1.5 text-[11px] flex items-center gap-2">
                            <Zap className="w-3 h-3 text-pink-400 shrink-0" />
                            <span className="text-slate-400">SYNERGY:</span>
                            <span className="text-slate-300">{WEAPONS[s.weapon1]?.name}</span>
                            <span className="text-slate-600">+</span>
                            <span className="text-slate-300">{WEAPONS[s.weapon2]?.name}</span>
                            <span className="text-slate-600">→</span>
                            <span className="text-pink-300 font-bold">{WEAPONS[s.result]?.name}</span>
                        </div>
                    ))}
                    {resolved.triggeredEvolutions.map(e => (
                        <div key={e.evolvedWeapon} className="bg-amber-950/30 border border-amber-500/40 rounded px-2 py-1.5 text-[11px] flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-slate-400">EVOLUTION:</span>
                            <span className="text-slate-300">{WEAPONS[e.baseWeapon]?.name}</span>
                            <span className="text-slate-600">+</span>
                            <span className="text-slate-300">{UPGRADES.find(u => u.id === e.passive)?.name}</span>
                            <span className="text-slate-600">→</span>
                            <span className="text-amber-300 font-bold">{WEAPONS[e.evolvedWeapon]?.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Final weapon predictions */}
            {weaponPredictions.length === 0 ? (
                <div className="text-center text-xs text-slate-500 italic py-6 border border-dashed border-slate-800 rounded">
                    Pick at least one weapon to see predicted stats.
                </div>
            ) : (
                <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Predicted final stats</div>
                    {weaponPredictions.map(p => (
                        <div key={p.id} className={`rounded-lg border p-2.5 ${
                            p.isEvolution ? 'border-amber-700/50 bg-amber-950/20' :
                            p.isSynergy   ? 'border-pink-700/50 bg-pink-950/20' :
                                            'border-slate-700 bg-slate-900/60'
                        }`}>
                            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`font-black text-sm truncate ${
                                        p.isEvolution ? 'text-amber-200' :
                                        p.isSynergy   ? 'text-pink-200' :
                                                        'text-cyan-200'
                                    }`}>{p.name}</span>
                                    {p.isMastered && (
                                        <span className="text-[9px] bg-yellow-900/60 text-yellow-300 border border-yellow-700/50 px-1.5 py-0.5 rounded font-bold">★ MASTERED</span>
                                    )}
                                </div>
                                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                    {p.dps.toFixed(1)} DPS
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                                <Stat label="Damage" base={p.baseDamage} mult={p.weaponDmgMult * charMults.damageMult} value={p.finalDamage.toFixed(1)} />
                                <Stat label="Cooldown" base={`${(p.baseCooldown/60).toFixed(2)}s`} mult={p.weaponCdMult * charMults.cooldownMult} value={`${p.finalCooldown.toFixed(2)}s`} lowerBetter />
                                <Stat label="Area"   base={`${p.baseArea.toFixed(1)}×`} mult={p.weaponAreaMult * charMults.areaMult} value={`${p.finalArea.toFixed(2)}×`} />
                            </div>
                        </div>
                    ))}
                    <div className="text-[10px] text-slate-500 italic mt-2 flex items-start gap-1.5">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>Final values use your character's total multipliers + each weapon's permanent/weekly/seasonal/forge investment. In-run level-up upgrades stack additively on top.</span>
                    </div>
                </div>
            )}
        </section>
    );
}

function Stat({ label, base, mult, value, lowerBetter }) {
    const isGain = lowerBetter ? mult < 1 : mult > 1;
    return (
        <div className="bg-black/30 rounded p-1.5 border border-slate-800">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
            <div className="font-mono font-black text-white text-sm">{value}</div>
            <div className="font-mono text-slate-500 text-[9px]">
                {base} <span className={isGain ? 'text-emerald-400' : mult === 1 ? 'text-slate-600' : 'text-red-400'}>×{mult.toFixed(2)}</span>
            </div>
        </div>
    );
}