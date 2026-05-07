import React from 'react';
import { Zap, Sparkles, Timer, Sword, CheckCircle2, Lock } from 'lucide-react';
import { CHARACTERS, WEAPONS, EVOLUTIONS, UPGRADES, getWeaponStatsAndMastery } from '../../game/Constants';

const FORGE_AUG_LABELS = {
    damage_1: '+15% dmg',  damage_2: '+35% dmg',  damage_3: '+60% dmg',
    area_1:   '+15% area', area_2:   '+35% area', area_3:   '+60% area',
    cd_1:     '-10% cd',   cd_2:     '-20% cd',   cd_3:     '-35% cd',
};

// Compute the RAW in-run starting stats of a weapon at level 1 with current
// progression, before any in-run upgrades. Mirrors GameEngine WeaponSystem
// math: baseDamage * weaponMastery.dmgMult * player.damageMult,
// baseCooldown * weaponMastery.cdMult * player.cooldownMult / 60 (frames→sec),
// baseArea * weaponMastery.areaMult * player.areaMult.
function computeRawStats(weapon, weaponStats, charBaseStats) {
    const damage = weapon.baseDamage * weaponStats.dmgMult * charBaseStats.damageMult;
    const cooldownSec = (weapon.baseCooldown * weaponStats.cdMult * charBaseStats.cooldownMult) / 60;
    const areaMult = weapon.baseArea * weaponStats.areaMult * charBaseStats.areaMult;
    const dps = cooldownSec > 0 ? (damage / cooldownSec) : damage;
    return { damage, cooldownSec, areaMult, dps };
}

export default function BuildWeaponCard({ save, weaponId, charId }) {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return null;

    const baseChar = CHARACTERS.find(c => c.id === charId) || CHARACTERS[0];
    const charBaseStats = {
        damageMult:   baseChar.damageMult   ?? 1,
        cooldownMult: baseChar.cooldownMult ?? 1,
        areaMult:     baseChar.areaMult     ?? 1,
    };

    const perm = save.permanentWeaponUpgrades?.[weaponId] || {};
    const week = save.weeklyWeaponUpgrades?.[weaponId] || {};
    const season = save.seasonalWeaponUpgrades?.[weaponId] || {};
    const augments = save.forgeWeaponAugments?.[weaponId] || [];

    const stats = getWeaponStatsAndMastery(save, weaponId);
    const raw = computeRawStats(weapon, stats, charBaseStats);

    const hasAnyInvestment = (perm.damage || perm.area || perm.cooldown || week.damage || week.area || week.cooldown || season.damage || season.area || season.cooldown || augments.length);

    const evo = EVOLUTIONS.find(e => e.baseWeapon === weaponId);
    const evoPassive = evo ? UPGRADES.find(u => u.id === evo.passive) : null;
    const evolved = evo && (save.discoveredEvolutions || []).includes(evo.evolvedWeapon);

    const labels = weapon.labels || { damage: 'Damage', area: 'Area', cooldown: 'Cooldown' };

    return (
        <div className={`bg-slate-900/60 rounded-lg border ${stats.isMastered ? 'border-yellow-500/60' : hasAnyInvestment ? 'border-cyan-700/40' : 'border-slate-800'} p-3`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Sword className={`w-4 h-4 shrink-0 ${stats.isMastered ? 'text-yellow-400' : 'text-cyan-400'}`} />
                    <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">{weapon.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{weapon.desc}</div>
                    </div>
                </div>
                {stats.isMastered && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-300 border border-yellow-600/50 px-1.5 py-0.5 rounded shrink-0">
                        MASTERED
                    </span>
                )}
            </div>

            {/* Raw computed stats — what the weapon ACTUALLY hits for at run-start. */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
                <div className="bg-slate-950/60 rounded px-2 py-1 border border-slate-800" title="Damage per hit at level 1">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> {labels.damage}</div>
                    <div className="text-sm text-emerald-300 font-mono font-black leading-tight">{raw.damage.toFixed(1)}</div>
                    <div className="text-[9px] text-slate-500 font-mono">×{stats.dmgMult.toFixed(2)} mult</div>
                </div>
                <div className="bg-slate-950/60 rounded px-2 py-1 border border-slate-800" title="Time between attacks">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1"><Timer className="w-2.5 h-2.5" /> {labels.cooldown}</div>
                    <div className="text-sm text-emerald-300 font-mono font-black leading-tight">{raw.cooldownSec.toFixed(2)}s</div>
                    <div className="text-[9px] text-slate-500 font-mono">×{stats.cdMult.toFixed(2)} mult</div>
                </div>
                <div className="bg-slate-950/60 rounded px-2 py-1 border border-slate-800" title="Effective area-of-effect multiplier">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> {labels.area}</div>
                    <div className="text-sm text-emerald-300 font-mono font-black leading-tight">×{raw.areaMult.toFixed(2)}</div>
                    <div className="text-[9px] text-slate-500 font-mono">×{stats.areaMult.toFixed(2)} mult</div>
                </div>
            </div>

            <div className="text-[10px] text-slate-400 mb-2 bg-slate-950/40 rounded px-2 py-1 border border-slate-800/60 flex items-center justify-between">
                <span className="uppercase tracking-wider text-slate-500 font-bold">Single-target DPS</span>
                <span className="text-cyan-300 font-mono font-bold">~{raw.dps.toFixed(1)}/sec</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[10px] mb-2">
                {[
                    { name: 'Permanent', src: perm },
                    { name: 'Weekly',    src: week },
                    { name: 'Seasonal',  src: season },
                ].map(({ name, src }) => (
                    <div key={name} className="bg-slate-950/40 rounded px-2 py-1 border border-slate-800">
                        <div className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">{name}</div>
                        <div className="text-slate-300 font-mono">D{src.damage || 0}/A{src.area || 0}/C{src.cooldown || 0}</div>
                    </div>
                ))}
            </div>

            {augments.length > 0 && (
                <div className="mb-2">
                    <div className="text-[9px] text-yellow-400/80 uppercase tracking-wider font-bold mb-1">Forge Augments</div>
                    <div className="flex flex-wrap gap-1">
                        {augments.map(a => (
                            <span key={a} className="text-[10px] bg-yellow-950/40 text-yellow-300 border border-yellow-700/40 px-1.5 py-0.5 rounded font-mono">
                                ★ {FORGE_AUG_LABELS[a] || a}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {evo && (
                <div className="mt-2 pt-2 border-t border-slate-800 text-[10px]">
                    {evolved ? (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="font-bold">Evolves into <span className="text-emerald-300">{WEAPONS[evo.evolvedWeapon]?.name}</span></span>
                        </div>
                    ) : (
                        <div className="flex items-start gap-1.5 text-slate-500">
                            <Lock className="w-3 h-3 mt-0.5" />
                            <span>
                                Evolution: pair with <span className="text-slate-300 font-bold">{evoPassive?.name || evo.passive}</span> in-run
                                → <span className="text-slate-300 font-bold">{WEAPONS[evo.evolvedWeapon]?.name}</span>
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}