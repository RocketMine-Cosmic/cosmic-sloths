import React, { useState } from 'react';
import { Save, Trash2, Check, X } from 'lucide-react';
import { CHARACTERS, ARENAS, DIFFICULTIES, RELICS } from '../../game/Constants';
import { SaveManager } from '../../game/SaveManager';
import { SoundManager } from '../../game/SoundManager';

const SLOT_COUNT = 3;
const SLOT_THEMES = [
    { border: 'border-cyan-500/50', accent: 'text-cyan-300', bg: 'bg-cyan-950/30', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]' },
    { border: 'border-fuchsia-500/50', accent: 'text-fuchsia-300', bg: 'bg-fuchsia-950/30', glow: 'shadow-[0_0_15px_rgba(217,70,239,0.2)]' },
    { border: 'border-amber-500/50', accent: 'text-amber-300', bg: 'bg-amber-950/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]' },
];

// A loadout snapshot captures everything a player picks before launch:
// character, arena, difficulty, equipped relics, equipped skin (per char), and trail.
// Stored on save.loadoutPresets as an array of length 3 (null = empty slot).
export default function LoadoutPresets({
    save,
    setSave,
    selectedChar,
    selectedArena,
    selectedDifficulty,
    setSelectedChar,
    setSelectedArena,
    setSelectedDifficulty,
    effectiveUnlockedCharacters,
}) {
    const presets = save.loadoutPresets || [null, null, null];
    const [confirmDelete, setConfirmDelete] = useState(null);

    const persist = (newPresets) => {
        const newSave = { ...save, loadoutPresets: newPresets };
        SaveManager.save(newSave);
        setSave(newSave);
    };

    const handleSave = (slotIndex) => {
        SoundManager.playUIClick();
        const charSkinId = save.cosmetics?.skins?.[selectedChar] || `${selectedChar}_default`;
        const trailId = save.cosmetics?.trail || 'default';
        const equippedRelics = [...(save.equippedRelics || [])];

        const preset = {
            charId: selectedChar,
            arenaId: selectedArena,
            difficultyId: selectedDifficulty,
            skinId: charSkinId,
            trailId,
            equippedRelics,
            savedAt: Date.now(),
        };

        const newPresets = [...presets];
        // Ensure length 3
        while (newPresets.length < SLOT_COUNT) newPresets.push(null);
        newPresets[slotIndex] = preset;
        persist(newPresets);
    };

    const handleApply = (slotIndex) => {
        const preset = presets[slotIndex];
        if (!preset) return;
        SoundManager.playUIClick();

        // Validate character is still unlocked — if not, skip char swap but still apply rest.
        if (effectiveUnlockedCharacters.includes(preset.charId)) {
            setSelectedChar(preset.charId);
        }
        // Validate arena is unlocked for the target character
        const unlockedForChar = save.unlockedArenasByCharacter?.[preset.charId] || ['station'];
        if (unlockedForChar.includes(preset.arenaId)) {
            setSelectedArena(preset.arenaId);
        }
        if (DIFFICULTIES.find(d => d.id === preset.difficultyId)) {
            setSelectedDifficulty(preset.difficultyId);
        }

        // Apply cosmetics + relics directly to save
        const ownedRelics = save.unlockedRelics || [];
        const validRelics = (preset.equippedRelics || []).filter(rId => ownedRelics.includes(rId)).slice(0, 2);
        const ownedSkins = save.unlockedSkins || [];
        const skinValid = preset.skinId && (preset.skinId.endsWith('_default') || ownedSkins.includes(preset.skinId));
        const ownedTrails = save.unlockedCosmetics || ['default'];
        const trailValid = preset.trailId && ownedTrails.includes(preset.trailId);

        const newSave = {
            ...save,
            equippedRelics: validRelics,
            cosmetics: {
                ...(save.cosmetics || {}),
                ...(skinValid ? { skins: { ...(save.cosmetics?.skins || {}), [preset.charId]: preset.skinId } } : {}),
                ...(trailValid ? { trail: preset.trailId } : {}),
            },
        };
        SaveManager.save(newSave);
        setSave(newSave);
    };

    const handleDelete = (slotIndex) => {
        SoundManager.playUIClick();
        const newPresets = [...presets];
        while (newPresets.length < SLOT_COUNT) newPresets.push(null);
        newPresets[slotIndex] = null;
        persist(newPresets);
        setConfirmDelete(null);
    };

    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-1.5 md:p-3">
            <div className="flex items-center justify-between mb-1 md:mb-2">
                <div className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-300 flex items-center gap-1.5">
                    <Save className="w-3 h-3 md:w-3.5 md:h-3.5 text-cyan-400" /> Loadout Presets
                </div>
                <div className="text-[9px] md:text-[10px] text-slate-500 italic hidden sm:block">
                    Saves char · sector · difficulty · skin · trail · relics
                </div>
            </div>
            <div className="grid grid-cols-3 gap-1 md:gap-2">
                {Array.from({ length: SLOT_COUNT }).map((_, i) => {
                    const preset = presets[i];
                    const theme = SLOT_THEMES[i];
                    const isEmpty = !preset;
                    const char = preset ? CHARACTERS.find(c => c.id === preset.charId) : null;
                    const arena = preset ? ARENAS.find(a => a.id === preset.arenaId) : null;
                    const difficulty = preset ? DIFFICULTIES.find(d => d.id === preset.difficultyId) : null;
                    const relicCount = preset?.equippedRelics?.length || 0;
                    const isConfirming = confirmDelete === i;

                    return (
                        <div key={i} className={`rounded-lg border p-1 md:p-2 flex flex-col gap-1 md:gap-1.5 ${isEmpty ? 'bg-slate-950/40 border-slate-800' : `${theme.bg} ${theme.border} ${theme.glow}`}`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-[9px] md:text-[11px] font-black tracking-widest uppercase ${isEmpty ? 'text-slate-500' : theme.accent}`}>
                                    Slot {i + 1}
                                </span>
                                {!isEmpty && (
                                    <button
                                        onClick={() => isConfirming ? handleDelete(i) : setConfirmDelete(i)}
                                        title={isConfirming ? 'Confirm delete' : 'Delete preset'}
                                        className={`p-0.5 md:p-1 rounded transition-colors ${isConfirming ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-red-400 hover:bg-red-950/40'}`}
                                    >
                                        {isConfirming ? <Check className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <Trash2 className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                                    </button>
                                )}
                            </div>

                            {isEmpty ? (
                                <div className="text-[9px] md:text-[10px] text-slate-600 italic min-h-[28px] md:min-h-[56px] flex items-center justify-center text-center">
                                    Empty
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 md:gap-1.5 min-h-[28px] md:min-h-[56px]">
                                    <div className="w-6 h-6 md:w-9 md:h-9 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: char?.color || '#888' }}>
                                        {char?.image ? <img src={char.image} alt={char.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className={`text-[9px] md:text-xs font-bold truncate ${theme.accent}`}>{char?.name || preset.charId}</div>
                                        <div className="text-[8px] md:text-[10px] text-slate-400 truncate hidden md:block">{arena?.name || preset.arenaId}</div>
                                        <div className="text-[8px] md:text-[10px] text-slate-500 flex items-center gap-1 truncate">
                                            <span className="capitalize truncate">{difficulty?.name || preset.difficultyId}</span>
                                            {relicCount > 0 && <span className="text-fuchsia-400 shrink-0">·💎{relicCount}</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-0.5 md:gap-1">
                                {!isEmpty && (
                                    <button
                                        onClick={() => handleApply(i)}
                                        className={`flex-1 py-0.5 md:py-1 rounded font-black text-[9px] md:text-[10px] tracking-widest uppercase transition-all hover:scale-[1.03] active:scale-95 ${theme.bg} border ${theme.border} ${theme.accent} hover:brightness-125`}
                                    >
                                        Apply
                                    </button>
                                )}
                                <button
                                    onClick={() => handleSave(i)}
                                    title={isEmpty ? 'Save current loadout' : 'Overwrite with current loadout'}
                                    className={`flex-1 py-0.5 md:py-1 rounded font-black text-[9px] md:text-[10px] tracking-widest uppercase transition-all hover:scale-[1.03] active:scale-95 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white`}
                                >
                                    {isEmpty ? 'Save' : 'Overwrite'}
                                </button>
                            </div>

                            {isConfirming && (
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="text-[9px] text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1"
                                >
                                    <X className="w-2.5 h-2.5" /> Cancel
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}