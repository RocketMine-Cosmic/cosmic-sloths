import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CHARACTERS, ARENAS, TRAIL_COSMETICS, KILL_COSMETICS, SKIN_COSMETICS, RELICS } from '../../game/Constants';
import { Plus, Minus, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

const ALL_CHARACTER_IDS = CHARACTERS.map(c => c.id);
const ALL_ARENA_IDS = ARENAS.map(a => a.id);
const ALL_TRAIL_IDS = TRAIL_COSMETICS.map(t => t.id);
const ALL_KILL_IDS = KILL_COSMETICS.map(k => k.id);

function Section({ title, color = 'text-cyan-400', children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-700/60 rounded-lg overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/60 hover:bg-slate-800/60 transition-colors">
                <span className={`font-bold text-sm uppercase tracking-wider ${color}`}>{title}</span>
                {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>
            {open && <div className="p-4 bg-slate-950/40">{children}</div>}
        </div>
    );
}

function NumericField({ label, value, onChange, min = 0, max }) {
    return (
        <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800/50 last:border-0">
            <span className="text-xs text-slate-300">{label}</span>
            <div className="flex items-center gap-1.5">
                <button onClick={() => onChange(Math.max(min, (value || 0) - 1))} className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors">
                    <Minus size={10} />
                </button>
                <input type="number" value={value || 0} min={min} max={max}
                    onChange={e => onChange(Number(e.target.value))}
                    className="w-20 bg-slate-800 border border-slate-600 text-white rounded px-2 py-0.5 text-xs text-center focus:outline-none focus:border-cyan-500 font-mono" />
                <button onClick={() => onChange((value || 0) + 1)} className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors">
                    <Plus size={10} />
                </button>
            </div>
        </div>
    );
}

function ToggleChip({ label, active, onClick }) {
    return (
        <button onClick={onClick}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors flex items-center gap-1 ${
                active ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>
            {active ? <Check size={10} /> : null}
            {label}
        </button>
    );
}

export default function PlayerSaveEditor({ player, onSaved, onClose }) {
    const save = player.save_data || {};
    const [draft, setDraft] = useState({ ...save });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();

    const set = (key, value) => setDraft(d => ({ ...d, [key]: value }));

    const toggleArrayItem = (key, item) => {
        const arr = Array.isArray(draft[key]) ? draft[key] : [];
        set(key, arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
    };

    const grantAllCharacters = () => set('unlockedCharacters', ALL_CHARACTER_IDS);
    const grantAllArenas = () => {
        const byChar = {};
        ALL_CHARACTER_IDS.forEach(cid => { byChar[cid] = ALL_ARENA_IDS; });
        setDraft(d => ({ ...d, unlockedArenasByCharacter: byChar }));
    };

    const toggleCharArena = (charId, arenaId) => {
        const map = draft.unlockedArenasByCharacter || {};
        const charArenas = map[charId] || [];
        const updated = charArenas.includes(arenaId)
            ? charArenas.filter(a => a !== arenaId)
            : [...charArenas, arenaId];
        setDraft(d => ({ ...d, unlockedArenasByCharacter: { ...map, [charId]: updated } }));
    };

    const setRelicLevel = (relicId, level) => {
        const relics = { ...(draft.relicLevels || {}) };
        if (level <= 0) delete relics[relicId];
        else relics[relicId] = Math.min(5, level);
        set('relicLevels', relics);
    };

    const handleSave = async () => {
        setSaving(true);
        setMsg('');
        try {
            await base44.functions.invoke('adminPatchSave', {
                saveId: player.id,
                patch: draft,
                accessToken: authData?.accessToken,
            });
            setMsg('✓ Saved successfully');
            onSaved({ ...player, save_data: draft });
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setMsg(`✗ ${e.message}`);
        }
        setSaving(false);
    };

    const unlockedChars = draft.unlockedCharacters || [];
    const unlockedArenas = draft.unlockedArenasByCharacter || {};

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-bold text-cyan-300 text-sm">{draft.pilotName || draft.player_name || 'Unnamed Player'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{player.wallet_address}</div>
                </div>
                <div className="flex items-center gap-2">
                    {msg && <span className={`text-xs font-mono ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</span>}
                    <button onClick={handleSave} disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition-colors">
                        <Check size={12} /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1 transition-colors">
                        <X size={12} /> Close
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                {/* Currency & Stats */}
                <Section title="💰 Currency & Resources" defaultOpen={true}>
                    <NumericField label="Gold" value={draft.gold} onChange={v => set('gold', v)} />
                    <NumericField label="Relic Fragments" value={draft.relicFragments} onChange={v => set('relicFragments', v)} />
                    <NumericField label="Star Fragments" value={draft.starFragments} onChange={v => set('starFragments', v)} />
                    <NumericField label="Total Kills" value={draft.totalKills} onChange={v => set('totalKills', v)} />
                    <NumericField label="Total Runs" value={draft.totalRuns} onChange={v => set('totalRuns', v)} />
                    <NumericField label="Seasonal Points" value={draft.seasonalPoints} onChange={v => set('seasonalPoints', v)} />
                </Section>

                {/* Characters */}
                <Section title="🧑‍🚀 Characters" color="text-purple-400">
                    <div className="flex gap-2 mb-3">
                        <button onClick={grantAllCharacters} className="text-xs bg-purple-800 hover:bg-purple-700 text-white px-3 py-1 rounded font-bold transition-colors">Grant All</button>
                        <button onClick={() => set('unlockedCharacters', ['neobyte'])} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded font-bold transition-colors">Reset to Default</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {CHARACTERS.map(c => (
                            <ToggleChip key={c.id} label={c.name} active={unlockedChars.includes(c.id)}
                                onClick={() => toggleArrayItem('unlockedCharacters', c.id)} />
                        ))}
                    </div>
                </Section>

                {/* Arenas per character */}
                <Section title="🗺️ Arenas" color="text-orange-400">
                    <button onClick={grantAllArenas} className="text-xs bg-orange-800 hover:bg-orange-700 text-white px-3 py-1 rounded font-bold mb-3 transition-colors">Grant All Arenas to All Characters</button>
                    <div className="space-y-3">
                        {CHARACTERS.filter(c => unlockedChars.includes(c.id)).map(c => (
                            <div key={c.id}>
                                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">{c.name}</div>
                                <div className="flex flex-wrap gap-1">
                                    {ARENAS.map(a => (
                                        <ToggleChip key={a.id} label={a.name}
                                            active={(unlockedArenas[c.id] || []).includes(a.id)}
                                            onClick={() => toggleCharArena(c.id, a.id)} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Cosmetics */}
                <Section title="🎨 Trail Cosmetics" color="text-pink-400">
                    <div className="flex gap-2 mb-2">
                        <button onClick={() => set('unlockedCosmetics', ALL_TRAIL_IDS)} className="text-xs bg-pink-800 hover:bg-pink-700 text-white px-3 py-1 rounded font-bold transition-colors">Grant All</button>
                        <button onClick={() => set('unlockedCosmetics', ['default'])} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded font-bold transition-colors">Reset</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {TRAIL_COSMETICS.map(t => (
                            <ToggleChip key={t.id} label={`${t.icon} ${t.name}`}
                                active={(draft.unlockedCosmetics || []).includes(t.id)}
                                onClick={() => toggleArrayItem('unlockedCosmetics', t.id)} />
                        ))}
                    </div>
                </Section>

                <Section title="💥 Kill Effects" color="text-red-400">
                    <div className="flex gap-2 mb-2">
                        <button onClick={() => set('unlockedKillCosmetics', ALL_KILL_IDS)} className="text-xs bg-red-800 hover:bg-red-700 text-white px-3 py-1 rounded font-bold transition-colors">Grant All</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {KILL_COSMETICS.map(k => (
                            <ToggleChip key={k.id} label={`${k.icon} ${k.name}`}
                                active={(draft.unlockedKillCosmetics || []).includes(k.id)}
                                onClick={() => toggleArrayItem('unlockedKillCosmetics', k.id)} />
                        ))}
                    </div>
                </Section>

                <Section title="🎭 Character Skins" color="text-yellow-400">
                    <div className="flex gap-2 mb-2">
                        <button onClick={() => set('unlockedSkins', SKIN_COSMETICS.map(s => s.id))} className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-1 rounded font-bold transition-colors">Grant All</button>
                    </div>
                    <div className="space-y-2">
                        {CHARACTERS.map(c => {
                            const skins = SKIN_COSMETICS.filter(s => s.charId === c.id);
                            if (!skins.length) return null;
                            return (
                                <div key={c.id}>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">{c.name}</div>
                                    <div className="flex flex-wrap gap-1">
                                        {skins.map(s => (
                                            <ToggleChip key={s.id} label={`${s.icon} ${s.name}`}
                                                active={(draft.unlockedSkins || []).includes(s.id)}
                                                onClick={() => toggleArrayItem('unlockedSkins', s.id)} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Section>

                {/* Relics */}
                <Section title="🔮 Relics" color="text-fuchsia-400">
                    <div className="space-y-2">
                        {RELICS.map(r => {
                            const level = (draft.relicLevels || {})[r.id] || 0;
                            return (
                                <div key={r.id} className="flex items-center justify-between">
                                    <span className="text-xs text-slate-300">{r.icon} {r.name}</span>
                                    <div className="flex items-center gap-1">
                                        {[0,1,2,3,4,5].map(lv => (
                                            <button key={lv} onClick={() => setRelicLevel(r.id, lv)}
                                                className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${level >= lv && lv > 0 ? 'bg-fuchsia-600 text-white' : lv === 0 ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                                                {lv === 0 ? '✕' : lv}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Section>

                {/* Stat Upgrades — all 3 tiers */}
                {[
                    { key: 'permanentUpgrades', title: '⬆️ Permanent Stat Upgrades', color: 'text-green-400', note: 'Persists forever.' },
                    { key: 'weeklyUpgrades',    title: '📅 Weekly Stat Upgrades',    color: 'text-cyan-400',  note: `Week: ${draft.weeklyUpgrades?.weekId || 'unknown'}` },
                    { key: 'seasonalUpgrades',  title: '🗓️ Seasonal Stat Upgrades',  color: 'text-purple-400', note: `Season: ${draft.seasonalUpgrades?.seasonId || 'unknown'}` },
                ].map(({ key, title, color, note }) => (
                    <Section key={key} title={title} color={color}>
                        <div className="text-[10px] text-slate-500 mb-3">{note}</div>
                        {['damage','health','speed','magnet','regen','cooldown','luck'].map(stat => (
                            <NumericField key={stat} label={stat} max={10}
                                value={(draft[key] || {})[stat] || 0}
                                onChange={v => setDraft(d => ({ ...d, [key]: { ...(d[key] || {}), [stat]: v } }))} />
                        ))}
                    </Section>
                ))}

                {/* Weapon Upgrades — all 3 tiers */}
                {[
                    { key: 'permanentWeaponUpgrades', title: '🔫 Permanent Weapon Upgrades', color: 'text-green-400' },
                    { key: 'weeklyWeaponUpgrades',    title: '🔫 Weekly Weapon Upgrades',    color: 'text-cyan-400' },
                    { key: 'seasonalWeaponUpgrades',  title: '🔫 Seasonal Weapon Upgrades',  color: 'text-purple-400' },
                ].map(({ key, title, color }) => (
                    <Section key={key} title={title} color={color}>
                        <div className="text-[10px] text-slate-500 mb-3">damage / area / cooldown per weapon (max 5 each).</div>
                        {['neoBlaster','napBeam','vineWhip','slothSwarm','napalm','novaPulse','shieldBubble','bouncingBlade','toxicCloud'].map(wid => (
                            <div key={wid} className="py-1.5 border-b border-slate-800/50 last:border-0">
                                <div className="text-[10px] text-slate-400 uppercase mb-1 font-bold">{wid}</div>
                                <div className="flex gap-4">
                                    {['damage','area','cooldown'].map(stat => (
                                        <NumericField key={stat} label={stat} max={5}
                                            value={((draft[key] || {})[wid] || {})[stat] || 0}
                                            onChange={v => setDraft(d => ({
                                                ...d,
                                                [key]: { ...(d[key] || {}), [wid]: { ...((d[key] || {})[wid] || {}), [stat]: v } }
                                            }))} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </Section>
                ))}

                {/* Talent Upgrades — all 3 tiers */}
                {[
                    { key: 'permanentTalents', title: '🌟 Permanent Talents', color: 'text-green-400' },
                    { key: 'weeklyTalents',    title: '🌟 Weekly Talents',    color: 'text-cyan-400' },
                    { key: 'seasonalTalents',  title: '🌟 Seasonal Talents',  color: 'text-purple-400' },
                ].map(({ key, title, color }) => (
                    <Section key={key} title={title} color={color}>
                        <div className="text-[10px] text-slate-500 mb-3">Number of talent purchases per character (max 3).</div>
                        {CHARACTERS.map(c => (
                            <NumericField key={c.id} label={c.name} max={3}
                                value={(draft[key] || {})[c.id] || 0}
                                onChange={v => setDraft(d => ({ ...d, [key]: { ...(d[key] || {}), [c.id]: v } }))} />
                        ))}
                    </Section>
                ))}
            </div>
        </div>
    );
}