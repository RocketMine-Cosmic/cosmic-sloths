import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Sparkles, ChevronDown } from 'lucide-react';
import { isS6OrLater } from '@/lib/seasonGate';
import { WEAPON_SLOT_CAP, EVOLUTION_MIN_BASE_LEVEL } from '@/game/UpgradeSystem';
import { EVOLUTIONS } from '@/game/Constants';
import { useAntiMashCooldown } from '@/hooks/useAntiMashCooldown';
import PoolBiasBadge from './PoolBiasBadge';

// Returns true if picking this upgrade would put the player one step away from
// triggering an evolution — either:
//   • weapon choice + player already has the matching passive, OR
//   • passive choice + player already owns the matching base weapon
// Excluded if the evolved form is already owned. On S6+ also requires the base
// weapon to be at level >= EVOLUTION_MIN_BASE_LEVEL — otherwise the badge would
// promise an evolution that won't actually fire. Pure UI — no business logic
// changes; the actual evolution check still happens in UpgradeSystem.applyUpgrade.
function isEvolutionReady(upgrade, player) {
    if (!player || !upgrade) return false;
    const ownedWeapons = player.weapons || [];
    const ownedWeaponIds = new Set(ownedWeapons.map(w => w.id));
    const ownedPassiveIds = new Set((player.passives || []).map(p => p.id));
    const requireMinLevel = isS6OrLater();

    if (upgrade.type === 'weapon') {
        const evo = EVOLUTIONS.find(e => e.baseWeapon === upgrade.weaponId);
        if (!evo) return false;
        if (ownedWeaponIds.has(evo.evolvedWeapon)) return false;
        if (!ownedPassiveIds.has(evo.passive)) return false;
        if (requireMinLevel) {
            const owned = ownedWeapons.find(w => w.id === evo.baseWeapon);
            // Picking this LEVELS the owned weapon by upgrade.value (1–3).
            // Project the post-pick level so the badge shows when this very pick
            // would push the weapon to/past the threshold.
            const projected = (owned ? owned.level : 0) + (upgrade.value || 1);
            if (projected < EVOLUTION_MIN_BASE_LEVEL) return false;
        }
        return true;
    }
    if (upgrade.type === 'passive') {
        const evo = EVOLUTIONS.find(e => e.passive === upgrade.id);
        if (!evo) return false;
        if (ownedWeaponIds.has(evo.evolvedWeapon)) return false;
        if (!ownedWeaponIds.has(evo.baseWeapon)) return false;
        if (requireMinLevel) {
            const base = ownedWeapons.find(w => w.id === evo.baseWeapon);
            if (!base || base.level < EVOLUTION_MIN_BASE_LEVEL) return false;
        }
        return true;
    }
    return false;
}

// Returns evolution progress info if this upgrade is part of an evolution pair
// but the level gate hasn't been met yet. Used to show a "Lv X/8 toward evolution"
// hint on cards so players understand WHY their evolution isn't firing.
// Returns null if no progress hint applies (evolution already ready, already done,
// or no evolution exists for this upgrade).
function getEvolutionProgress(upgrade, player) {
    if (!player || !upgrade) return null;
    if (!isS6OrLater()) return null; // S5 has no level gate

    const ownedWeapons = player.weapons || [];
    const ownedWeaponIds = new Set(ownedWeapons.map(w => w.id));
    const ownedPassiveIds = new Set((player.passives || []).map(p => p.id));

    if (upgrade.type === 'weapon') {
        const evo = EVOLUTIONS.find(e => e.baseWeapon === upgrade.weaponId);
        if (!evo) return null;
        if (ownedWeaponIds.has(evo.evolvedWeapon)) return null;
        if (!ownedPassiveIds.has(evo.passive)) return null;
        const owned = ownedWeapons.find(w => w.id === evo.baseWeapon);
        const projected = (owned ? owned.level : 0) + (upgrade.value || 1);
        if (projected >= EVOLUTION_MIN_BASE_LEVEL) return null; // ready handled by isEvolutionReady
        return { projected, threshold: EVOLUTION_MIN_BASE_LEVEL };
    }
    if (upgrade.type === 'passive') {
        const evo = EVOLUTIONS.find(e => e.passive === upgrade.id);
        if (!evo) return null;
        if (ownedWeaponIds.has(evo.evolvedWeapon)) return null;
        if (!ownedWeaponIds.has(evo.baseWeapon)) return null;
        const base = ownedWeapons.find(w => w.id === evo.baseWeapon);
        if (!base || base.level >= EVOLUTION_MIN_BASE_LEVEL) return null;
        return { projected: base.level, threshold: EVOLUTION_MIN_BASE_LEVEL };
    }
    return null;
}

function OmenXIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/01838179d_omenx_logo.png" className={className} alt="OMENX" />;
}

// Returns the current level of the weapon/passive this upgrade targets, and
// the projected level after picking it. Returns null for non-leveling upgrades
// (e.g. evolutions, character buffs without a passive id).
function getLevelInfo(upgrade, player) {
    if (!upgrade || !player) return null;
    if (upgrade.type === 'weapon') {
        const owned = (player.weapons || []).find(w => w.id === upgrade.weaponId);
        const currentLvl = owned ? owned.level : 0;
        const projected = currentLvl + (upgrade.value || 1);
        return { current: currentLvl, projected, isNew: currentLvl === 0 };
    }
    if (upgrade.type === 'passive') {
        const owned = (player.passives || []).find(p => p.id === upgrade.id);
        const currentLvl = owned ? owned.level : 0;
        // Passives level up by 1 per pick (handled in UpgradeSystem).
        const projected = currentLvl + 1;
        return { current: currentLvl, projected, isNew: currentLvl === 0 };
    }
    return null;
}

// Maps an upgrade.stat key to a friendly label, the live value on player,
// and how to format it. Returns null for upgrades without a clean numeric stat
// (e.g. weapon picks — those are previewed differently).
function getStatPreview(upgrade, player) {
    if (!upgrade || upgrade.type !== 'passive' || !player) return null;
    const stat = upgrade.stat;
    const map = {
        damageMult:    { label: 'Damage',      format: (v) => `${Math.round(v * 100)}%`, mode: 'mult' },
        speedMult:     { label: 'Move Speed',  format: (v) => `${Math.round(v * 100)}%`, mode: 'mult' },
        cooldownMult:  { label: 'Cooldown',    format: (v) => `${Math.round(v * 100)}%`, mode: 'mult', lowerBetter: true },
        areaMult:      { label: 'Area',        format: (v) => `${Math.round(v * 100)}%`, mode: 'mult' },
        projSpeedMult: { label: 'Proj. Speed', format: (v) => `${Math.round(v * 100)}%`, mode: 'mult' },
        goldMult:      { label: 'Gold',        format: (v) => `${Math.round(v * 100)}%`, mode: 'mult' },
        xpMult:        { label: 'XP',          format: (v) => `${Math.round(v * 100)}%`, mode: 'mult' },
        magnetRange:   { label: 'Magnet',      format: (v) => `${Math.round(v)}`,         mode: 'flat' },
        regen:         { label: 'Regen/s',     format: (v) => v.toFixed(1),               mode: 'flat' },
        armor:         { label: 'Armor',       format: (v) => `${Math.round(v)}`,         mode: 'flat' },
        luck:          { label: 'Luck',        format: (v) => `${Math.round(v)}`,         mode: 'flat' },
        maxHp:         { label: 'Max HP',      format: (v) => `${Math.round(v)}`,         mode: 'flat' },
    };
    const entry = map[stat];
    if (!entry) return null;
    const before = Number(player[stat] || 0);
    const after = before + Number(upgrade.value || 0);
    return {
        label: entry.label,
        before: entry.format(before),
        after: entry.format(after),
        isGain: entry.lowerBetter ? upgrade.value < 0 : upgrade.value > 0,
    };
}

export default function LevelUpModal({ level, choices, onSelect, cosmicTokens, onReroll, onBanish, banishCost = 2, banishCount = 0, nextBanishCost = null, engineRef, omenxPurchasesDisabled = false }) {
     // Each tier has 3 uses (uses 0–2 = T1, 3–5 = T2, 6+ = T3 unlimited)
     const banishTier = banishCount < 3 ? 1 : banishCount < 6 ? 2 : 3;
     const banishUsesInTier = banishTier === 3 ? null : (3 - (banishCount % 3));
     const showNextPrice = nextBanishCost !== null && nextBanishCost !== banishCost;
     const [hasRerolled, setHasRerolled] = useState(false);
     const [selectedIndex, setSelectedIndex] = useState(null);
     const [showInventory, setShowInventory] = useState(false);
    // Anti-mash: 2s cooldown on Reroll & Banish so a flurry of clicks during
    // a slow OmenX settlement doesn't queue up multiple billable purchases.
    const rerollCd = useAntiMashCooldown(2000);
    const banishCd = useAntiMashCooldown(2000);

    React.useEffect(() => {
        setHasRerolled(false);
        setSelectedIndex(null);
    }, [level, choices]);

    const rarityColors = {
        'Common': 'text-slate-400 border-slate-500',
        'Rare': 'text-blue-400 border-blue-500 shadow-[0_0_10px_rgba(96,165,250,0.5)]',
        'Epic': 'text-purple-400 border-purple-500 shadow-[0_0_15px_rgba(192,132,252,0.6)]',
        'Legendary': 'text-orange-400 border-orange-500 shadow-[0_0_20px_rgba(251,146,60,0.8)]',
        'Evolution': 'text-red-400 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.9)]'
    };

    const rarityBg = {
        'Common': 'bg-slate-800',
        'Rare': 'bg-blue-950',
        'Epic': 'bg-purple-950',
        'Legendary': 'bg-orange-950',
        'Evolution': 'bg-red-950'
    };

    return (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border-2 border-cyan-500 p-3 md:p-8 rounded-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto flex flex-col items-center relative"
            >
                {/* OMENX balance — inline above title on mobile (avoids overlapping the centered title), absolute corner on desktop */}
                <div className="self-end md:absolute md:top-4 md:right-4 mb-2 md:mb-0 bg-emerald-950/50 border border-emerald-500/50 px-2 py-1 md:px-3 md:py-1 rounded-lg text-emerald-400 font-bold font-mono text-xs md:text-sm shadow-[0_0_10px_rgba(16,185,129,0.3)] flex items-center gap-1.5">
                    <OmenXIcon className="w-4 h-4 md:w-5 md:h-5" /> {typeof cosmicTokens === 'number' ? cosmicTokens.toFixed(2) : (cosmicTokens || 0)}
                </div>
                <div className="flex items-center justify-center gap-3 mb-1 md:mb-2 flex-wrap">
                    <h2 className="text-base md:text-3xl font-bold text-center text-cyan-400 font-mono">
                        LEVEL UP! <span className="text-white">→ Lv. {level}</span>
                    </h2>
                    {/* Weapon slot counter — moved here so it's visible without scrolling on mobile */}
                    {isS6OrLater() && (() => {
                        const weapons = engineRef?.current?.player?.weapons;
                        if (!Array.isArray(weapons)) return null;
                        const count = weapons.length;
                        const atCap = count >= WEAPON_SLOT_CAP;
                        return (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border font-mono font-bold text-xs shrink-0 ${
                                atCap
                                    ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                                    : 'bg-cyan-950/60 border-cyan-700 text-cyan-300'
                            }`}>
                                <Swords className="w-3 h-3 shrink-0" />
                                <span>{count}/{WEAPON_SLOT_CAP}</span>
                                {atCap && <span className="text-[9px] opacity-80">FULL</span>}
                            </div>
                        );
                    })()}
                </div>
                <p className="text-slate-400 mb-2 md:mb-3 text-center text-xs md:text-base">
                    Choose an upgrade to enhance your build.
                </p>

                {/* Raid / Meteor pre-fight level-up queue counter — players had no
                    idea how many picks remained before the fight actually starts
                    (Texxy bug 2026-05-19). For meteor we read pendingStarterLevelUps
                    directly. For raid (world_boss_arena) the engine pre-stuffs XP for
                    20 levels at start, so we estimate remaining picks by simulating
                    how many more times xp will overflow xpRequired with the current
                    growth curve. Purely informational — no business logic touched. */}
                {(() => {
                    const engine = engineRef?.current;
                    if (!engine) return null;
                    const arenaId = engine.arena?.id;

                    // Squad Meteor — exact counter on the engine
                    if (arenaId === 'quantum_meteor' && (engine.pendingStarterLevelUps || 0) > 0) {
                        const remaining = engine.pendingStarterLevelUps;
                        return (
                            <div className="mb-3 md:mb-4 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border-2 border-fuchsia-500/60 bg-fuchsia-950/40 text-fuchsia-200 font-mono font-bold text-xs md:text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4 shrink-0" />
                                <span>
                                    {remaining} more upgrade{remaining === 1 ? '' : 's'} before the fight begins
                                </span>
                            </div>
                        );
                    }

                    // Global Raid — estimate remaining queued level-ups from banked XP
                    if (arenaId === 'world_boss_arena') {
                        let xp = engine.xp || 0;
                        let req = engine.xpRequired || 1;
                        let remaining = 0;
                        // Walk the same growth formula used at run start (lines 370-378
                        // of GameEngine.js): currentReq = floor(currentReq * 1.1 + 20)
                        // Cap iterations defensively in case anything ever changes.
                        for (let i = 0; i < 30 && xp >= req; i++) {
                            xp -= req;
                            req = Math.floor(req * 1.1 + 20);
                            remaining++;
                        }
                        if (remaining > 0) {
                            return (
                                <div className="mb-3 md:mb-4 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border-2 border-fuchsia-500/60 bg-fuchsia-950/40 text-fuchsia-200 font-mono font-bold text-xs md:text-sm flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 shrink-0" />
                                    <span>
                                        {remaining} more upgrade{remaining === 1 ? '' : 's'} before the boss fight
                                    </span>
                                </div>
                            );
                        }
                    }
                    return null;
                })()}

                <PoolBiasBadge save={engineRef?.current?.save} />

                {/* Current inventory dropdown — shows weapon/passive levels at a glance
                    so players don't have to close the modal to check what level a weapon is
                    before picking an upgrade (Texxy bug 2026-05-19). */}
                <button
                    onClick={() => setShowInventory(!showInventory)}
                    className="mb-3 md:mb-4 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-600 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-slate-200 font-mono font-bold text-xs md:text-sm flex items-center justify-between gap-2 transition-colors w-full max-w-md mx-auto"
                >
                    <span>Current Build</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showInventory ? 'rotate-180' : ''}`} />
                </button>

                {showInventory && (() => {
                    const player = engineRef?.current?.player;
                    if (!player) return null;
                    const weapons = player.weapons || [];
                    const passives = player.passives || [];
                    return (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 md:mb-6 bg-slate-950/80 border border-slate-700 rounded-lg p-3 md:p-4 max-w-md mx-auto w-full text-xs md:text-sm space-y-2 overflow-y-auto max-h-48"
                        >
                            {weapons.length > 0 && (
                                <div>
                                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] md:text-xs mb-1.5">⚔️ Weapons</div>
                                    <div className="space-y-1">
                                        {weapons.map((w, i) => (
                                            <div key={i} className="text-slate-300 flex justify-between items-center bg-slate-900/40 px-2 py-1 rounded border border-slate-700/50">
                                                <span className="font-mono">{w.name}</span>
                                                <span className="text-slate-400 font-bold">Lv. {w.level}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {passives.length > 0 && (
                                <div>
                                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] md:text-xs mb-1.5">✨ Passives</div>
                                    <div className="space-y-1">
                                        {passives.map((p, i) => (
                                            <div key={i} className="text-slate-300 flex justify-between items-center bg-slate-900/40 px-2 py-1 rounded border border-slate-700/50">
                                                <span className="font-mono">{p.name}</span>
                                                <span className="text-slate-400 font-bold">Lv. {p.level}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {weapons.length === 0 && passives.length === 0 && (
                                <div className="text-slate-500 italic text-center py-2">No weapons or passives yet</div>
                            )}
                        </motion.div>
                    );
                })()}


                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 w-full mb-4 md:mb-8">
                    {choices.map((choice, i) => {
                        const isSelected = selectedIndex === i;
                        const preview = getStatPreview(choice, engineRef?.current?.player);
                        const evoReady = isEvolutionReady(choice, engineRef?.current?.player);
                        const evoProgress = !evoReady ? getEvolutionProgress(choice, engineRef?.current?.player) : null;
                        return (
                            <motion.button
                                key={i}
                                onClick={() => setSelectedIndex(i)}
                                className={`relative p-3 md:p-6 rounded-xl text-left transition-colors duration-200 flex flex-col min-h-[90px] md:min-h-[160px] border-2 cursor-pointer ${rarityBg[choice.rarity]} ${rarityColors[choice.rarity].split(' ').slice(1).join(' ')} ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : 'hover:brightness-110'} ${evoReady ? 'shadow-[0_0_20px_rgba(251,146,60,0.7)]' : ''}`}
                            >
                                {evoReady && (
                                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-amber-400 text-black text-[9px] md:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-[0_0_10px_rgba(251,146,60,0.9)] animate-pulse z-10">
                                        <Sparkles className="w-3 h-3" />
                                        Evolves
                                    </div>
                                )}
                                {(() => {
                                    const lvlInfo = getLevelInfo(choice, engineRef?.current?.player);
                                    if (!lvlInfo) return null;
                                    // Position below the "Evolves" badge if it's showing
                                    const topOffset = evoReady ? 'top-4 md:top-5' : '-top-2';
                                    if (lvlInfo.isNew) {
                                        return (
                                            <div className={`absolute ${topOffset} -right-2 bg-emerald-600 text-white text-[9px] md:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-[0_0_8px_rgba(16,185,129,0.7)] z-10`}>
                                                NEW
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className={`absolute ${topOffset} -right-2 bg-slate-800 border border-slate-500 text-slate-100 text-[9px] md:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-md z-10 flex items-center gap-1`}>
                                            <span className="text-slate-400">Lv.</span>
                                            <span className="text-slate-300">{lvlInfo.current}</span>
                                            <span className="text-slate-500">→</span>
                                            <span className="text-cyan-300">{lvlInfo.projected}</span>
                                        </div>
                                    );
                                })()}
                                <div className={`text-[10px] md:text-xs font-bold mb-1 md:mb-2 uppercase tracking-wider ${rarityColors[choice.rarity].split(' ')[0]}`}>
                                    {choice.rarity} {choice.type}
                                </div>
                                <div className="text-base md:text-xl font-bold text-white mb-1 md:mb-2 leading-tight">
                                    {choice.name}
                                </div>
                                <div className="text-xs md:text-sm text-slate-300 flex-1">
                                    {choice.desc}
                                </div>
                                {evoProgress && (
                                    <div className="mt-1.5 bg-orange-950/40 border border-orange-700/50 rounded px-2 py-1 text-[10px] md:text-xs flex items-center gap-1.5 text-orange-300">
                                        <Sparkles className="w-3 h-3 shrink-0" />
                                        <span className="font-mono font-bold">
                                            Lv {evoProgress.projected}/{evoProgress.threshold} → Evolves
                                        </span>
                                    </div>
                                )}
                                {preview && (
                                    <div className="mt-2 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-[10px] md:text-xs flex items-center justify-between">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">{preview.label}</span>
                                        <div className="flex items-baseline gap-1.5 font-mono">
                                            <span className="text-slate-500">{preview.before}</span>
                                            <span className="text-slate-600">→</span>
                                            <span className={`font-bold ${preview.isGain ? 'text-emerald-400' : 'text-red-400'}`}>{preview.after}</span>
                                        </div>
                                    </div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-6 mt-2 md:mt-4">
                    {selectedIndex !== null && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => onSelect(choices[selectedIndex])}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 md:py-3 px-6 md:px-8 rounded-lg text-base md:text-lg transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                        >
                            Accept Upgrade
                        </motion.button>
                    )}

                    {!hasRerolled && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => {
                                if ((cosmicTokens || 0) < 2 || omenxPurchasesDisabled || rerollCd.locked) return;
                                rerollCd.trigger(() => {
                                    setHasRerolled(true);
                                    onReroll();
                                });
                            }}
                            disabled={omenxPurchasesDisabled || rerollCd.locked}
                            title={omenxPurchasesDisabled ? 'OMENX purchases are temporarily disabled' : rerollCd.locked ? 'Just a sec…' : undefined}
                            className={`text-white font-bold py-2 md:py-3 px-6 md:px-8 rounded-lg transition-colors border text-base md:text-lg flex items-center justify-center gap-2 ${(cosmicTokens || 0) < 2 || omenxPurchasesDisabled || rerollCd.locked ? 'bg-purple-600/50 border-purple-400/50 opacity-50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]'}`}
                        >
                            <OmenXIcon className="w-5 h-5 md:w-6 md:h-6 mr-1" />
                            {rerollCd.locked ? `Reroll (${(rerollCd.remainingMs / 1000).toFixed(1)}s)` : 'Reroll (2 OMENX)'}
                        </motion.button>
                    )}
                    
                    {selectedIndex !== null && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => {
                                if ((cosmicTokens || 0) < banishCost || omenxPurchasesDisabled || banishCd.locked) return;
                                banishCd.trigger(() => onBanish(choices[selectedIndex]));
                            }}
                            disabled={omenxPurchasesDisabled || banishCd.locked}
                            title={omenxPurchasesDisabled ? 'OMENX purchases are temporarily disabled' : banishCd.locked ? 'Just a sec…' : undefined}
                            className={`text-white font-bold py-2 md:py-3 px-6 md:px-8 rounded-lg transition-colors border text-base md:text-lg flex flex-col items-center justify-center gap-0.5 ${(cosmicTokens || 0) < banishCost || omenxPurchasesDisabled || banishCd.locked ? 'bg-red-600/50 border-red-400/50 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`}
                        >
                            <span>
                                {banishCd.locked
                                    ? `Banish (${(banishCd.remainingMs / 1000).toFixed(1)}s)`
                                    : `Banish T${banishTier} (${banishCost} OMENX)`}
                            </span>
                            {!banishCd.locked && banishUsesInTier !== null && (
                                <span className="text-[10px] md:text-xs font-normal opacity-80">
                                    {banishUsesInTier} use{banishUsesInTier === 1 ? '' : 's'} left{showNextPrice ? ` · Next: ${nextBanishCost} OMENX` : ''}
                                </span>
                            )}
                        </motion.button>
                    )}
                </div>
                {omenxPurchasesDisabled && (
                    <div className="mt-3 text-[11px] md:text-xs text-red-300 bg-red-950/40 border border-red-700/50 rounded px-3 py-1.5">
                        OMENX purchases temporarily disabled — Reroll & Banish unavailable.
                    </div>
                )}
            </motion.div>
        </div>
    );
}