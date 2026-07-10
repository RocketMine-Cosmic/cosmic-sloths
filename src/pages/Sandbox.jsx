import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, FlaskConical, AlertTriangle } from 'lucide-react';
import SpaceBackground from '../components/game/SpaceBackground';
import { CHARACTERS, ARENAS, DIFFICULTIES, WEAPONS } from '../game/Constants';
import { SoundManager } from '../game/SoundManager';
import { SaveManager } from '../game/SaveManager';
import { isS8OrLater } from '@/lib/seasonGate';

// S8 Sandbox / Test Play — dedicated setup page per docs/s8/PLAN_SANDBOX_TEST_PLAY.md.
// Players configure a practice run here (any character, any arena, any difficulty,
// any starting level) and launch into /game with sandbox=true. The engine reads
// the flag; every server run-mutating function early-returns on it; a yellow
// banner sits over the canvas the whole time; the dev panel is available in-run.
//
// Sandbox intentionally bypasses unlock gates — you can test locked characters,
// locked sectors, and endless without owning them. The server-side is_sandbox
// rejection means this can never leak rewards, so exposing everything is safe.

// Arenas selectable in sandbox — includes 'endless' as a virtual entry so
// players can practice endless builds without needing to unlock it. Excludes
// special-purpose arenas (raid, meteor) that require dedicated setup elsewhere.
const SANDBOX_ARENA_BLOCKLIST = new Set(['quantum_meteor', 'world_boss_arena']);
const SECTOR_OPTIONS = ARENAS.filter(a => !SANDBOX_ARENA_BLOCKLIST.has(a.id));
const ENDLESS_OPTION = { id: '__endless__', name: 'Endless (Cosmic Void)', image: SECTOR_OPTIONS[0]?.image };
const ALL_ARENA_OPTIONS = [...SECTOR_OPTIONS, ENDLESS_OPTION];

// Weapons players can start with. Filtered to non-synergy, non-evolution weapons
// (those need to be earned mid-run via the level-up upgrade pool).
const STARTING_WEAPONS = Object.values(WEAPONS).filter(w => !w.isSynergy && !w.isEvolution);

// Preset starting levels — quick jumps to common test points. The engine will
// pre-fire N-1 level-ups on init (each opening the LevelUpModal so the player
// picks their own build path — same UX as squad meteor's starter stack).
const STARTING_LEVELS = [1, 5, 10, 15, 20, 30];

export default function Sandbox() {
    const navigate = useNavigate();

    // Redirect out of sandbox before S8 launches — the whole feature is gated.
    useEffect(() => {
        if (!isS8OrLater()) navigate('/');
    }, [navigate]);

    // Restore last-used sandbox picks so returning here feels like a workbench.
    const initial = (() => {
        try { return JSON.parse(localStorage.getItem('sandbox_setup') || '{}'); } catch { return {}; }
    })();

    const [charId, setCharId] = useState(initial.charId || 'neobyte');
    const [arenaId, setArenaId] = useState(initial.arenaId || 'station');
    const [difficultyId, setDifficultyId] = useState(initial.difficultyId || 'normal');
    const [weaponId, setWeaponId] = useState(initial.weaponId || 'neoBlaster');
    const [startLevel, setStartLevel] = useState(initial.startLevel || 1);

    const character = CHARACTERS.find(c => c.id === charId) || CHARACTERS[0];
    const arenaOpt = ALL_ARENA_OPTIONS.find(a => a.id === arenaId) || ALL_ARENA_OPTIONS[0];
    const difficulty = DIFFICULTIES.find(d => d.id === difficultyId) || DIFFICULTIES[1];

    const cycleChar = (dir) => {
        SoundManager.playUIClick();
        const idx = CHARACTERS.findIndex(c => c.id === charId);
        const next = (idx + dir + CHARACTERS.length) % CHARACTERS.length;
        setCharId(CHARACTERS[next].id);
    };
    const cycleArena = (dir) => {
        SoundManager.playUIClick();
        const idx = ALL_ARENA_OPTIONS.findIndex(a => a.id === arenaId);
        const next = (idx + dir + ALL_ARENA_OPTIONS.length) % ALL_ARENA_OPTIONS.length;
        setArenaId(ALL_ARENA_OPTIONS[next].id);
    };
    const cycleDifficulty = (dir) => {
        SoundManager.playUIClick();
        const idx = DIFFICULTIES.findIndex(d => d.id === difficultyId);
        const next = (idx + dir + DIFFICULTIES.length) % DIFFICULTIES.length;
        setDifficultyId(DIFFICULTIES[next].id);
    };

    const launch = () => {
        SoundManager.playUIClick();
        // Persist the picks so the next visit lands on the same setup.
        try { localStorage.setItem('sandbox_setup', JSON.stringify({ charId, arenaId, difficultyId, weaponId, startLevel })); } catch {}

        // Ensure a local save exists so the engine can construct — sandbox players
        // may be brand new. Merge minimal defaults, don't clobber real progress.
        const save = SaveManager.load() || {};
        save.unlockedCharacters = save.unlockedCharacters || ['neobyte'];
        SaveManager.save(save);

        const isEndless = arenaId === ENDLESS_OPTION.id;
        navigate('/game', {
            state: {
                characterId: charId,
                arenaId: isEndless ? 'endless' : arenaId,
                difficultyId,
                startingWeaponId: weaponId,
                isEndless,
                sandbox: true,
                sandboxStartLevel: startLevel,
                forceUnlocked: true,
            },
        });
    };

    return (
        <div className="min-h-screen text-slate-200 p-3 md:p-6 font-sans relative">
            <SpaceBackground />
            <div className="max-w-4xl mx-auto relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <h1 className="text-lg md:text-3xl font-black tracking-widest uppercase flex items-center gap-2 md:gap-3 text-yellow-400" style={{ textShadow: '0 0 12px rgba(234,179,8,0.6)' }}>
                        <FlaskConical className="w-5 h-5 md:w-8 md:h-8" />
                        Sandbox
                    </h1>
                    <div className="w-16" />
                </div>

                {/* Warning banner — makes the "no rewards" contract impossible to miss. */}
                <div className="bg-yellow-950/40 border-2 border-yellow-600/60 rounded-xl p-3 md:p-4 mb-4 md:mb-6 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm text-yellow-100">
                        <div className="font-black tracking-wider uppercase mb-1">Practice mode — no rewards</div>
                        <div className="text-yellow-200/80 font-normal normal-case">
                            Sandbox runs award no score, no leaderboard entry, no gold, no XP, no kill credit, no achievement progress, and no bounty progress. All characters, sectors, and difficulties are unlocked. You can spawn enemies, grant weapons, and force level-ups from the in-run dev panel.
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {/* Character picker */}
                    <SetupCard label="Operative" color="cyan">
                        <Cycler onPrev={() => cycleChar(-1)} onNext={() => cycleChar(1)}>
                            <div className="flex-1 text-center min-w-0">
                                <div className="text-lg md:text-2xl font-black truncate" style={{ color: character.color, textShadow: `0 0 10px ${character.color}80` }}>{character.name}</div>
                                <div className="text-[10px] md:text-xs text-slate-400 mt-1 line-clamp-2">{character.desc}</div>
                            </div>
                        </Cycler>
                    </SetupCard>

                    {/* Arena picker */}
                    <SetupCard label="Sector" color="fuchsia">
                        <Cycler onPrev={() => cycleArena(-1)} onNext={() => cycleArena(1)}>
                            <div className="flex-1 text-center min-w-0">
                                <div className="text-lg md:text-2xl font-black text-white truncate">{arenaOpt.name}</div>
                                <div className="text-[10px] md:text-xs text-slate-400 mt-1">
                                    {arenaId === ENDLESS_OPTION.id ? 'Infinite duration' : `${Math.floor((ARENAS.find(a => a.id === arenaId)?.duration || 180) / 60)} min run`}
                                </div>
                            </div>
                        </Cycler>
                    </SetupCard>

                    {/* Difficulty picker */}
                    <SetupCard label="Difficulty" color="rose">
                        <Cycler onPrev={() => cycleDifficulty(-1)} onNext={() => cycleDifficulty(1)}>
                            <div className="flex-1 text-center min-w-0">
                                <div className="text-lg md:text-2xl font-black text-white truncate">{difficulty.name}</div>
                                <div className="text-[10px] md:text-xs text-slate-400 mt-1 line-clamp-2">{difficulty.desc}</div>
                            </div>
                        </Cycler>
                    </SetupCard>

                    {/* Starting weapon */}
                    <SetupCard label="Starting Weapon" color="emerald">
                        <select
                            value={weaponId}
                            onChange={(e) => { SoundManager.playUIClick(); setWeaponId(e.target.value); }}
                            className="w-full bg-slate-900/80 border border-emerald-500/40 text-white text-sm md:text-base font-bold rounded-lg px-3 py-2 md:py-3 outline-none focus:border-emerald-400"
                        >
                            {STARTING_WEAPONS.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </SetupCard>
                </div>

                {/* Starting level pips */}
                <div className="mt-3 md:mt-4">
                    <SetupCard label="Starting Level" color="amber">
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                            {STARTING_LEVELS.map(lv => (
                                <button
                                    key={lv}
                                    onClick={() => { SoundManager.playUIClick(); setStartLevel(lv); }}
                                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-black text-sm md:text-base transition-all border ${
                                        startLevel === lv
                                            ? 'bg-amber-500/30 text-amber-200 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                            : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-amber-500/50'
                                    }`}
                                >
                                    Lv {lv}
                                </button>
                            ))}
                        </div>
                        <div className="text-[10px] md:text-xs text-slate-500 mt-2">
                            {startLevel > 1
                                ? `You'll get ${startLevel - 1} instant level-ups at run start — pick your build before mobs spawn.`
                                : 'Start fresh at level 1.'}
                        </div>
                    </SetupCard>
                </div>

                {/* Launch button */}
                <button
                    onClick={launch}
                    className="mt-4 md:mt-6 w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black tracking-widest uppercase py-4 md:py-5 rounded-xl text-base md:text-xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.7)] hover:scale-[1.01] active:scale-95 transition-all"
                >
                    <FlaskConical className="w-5 h-5 md:w-6 md:h-6" />
                    Launch Sandbox
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
            </div>
        </div>
    );
}

// Small styled card wrapper — keeps the four pickers visually consistent.
function SetupCard({ label, color, children }) {
    const borderColors = {
        cyan: 'border-cyan-500/40',
        fuchsia: 'border-fuchsia-500/40',
        rose: 'border-rose-500/40',
        emerald: 'border-emerald-500/40',
        amber: 'border-amber-500/40',
    };
    const labelColors = {
        cyan: 'text-cyan-300',
        fuchsia: 'text-fuchsia-300',
        rose: 'text-rose-300',
        emerald: 'text-emerald-300',
        amber: 'text-amber-300',
    };
    return (
        <div className={`bg-slate-950/70 backdrop-blur border ${borderColors[color]} rounded-xl p-3 md:p-4`}>
            <div className={`text-[10px] md:text-xs font-black tracking-[0.25em] uppercase mb-2 md:mb-3 ${labelColors[color]}`}>{label}</div>
            {children}
        </div>
    );
}

// Reusable prev/next cycler around a centered child.
function Cycler({ onPrev, onNext, children }) {
    return (
        <div className="flex items-center gap-2">
            <button onClick={onPrev} className="p-1.5 md:p-2 bg-slate-800/80 border border-slate-600 rounded-full hover:border-cyan-400 hover:bg-cyan-500/20 text-slate-200 transition-all">
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            {children}
            <button onClick={onNext} className="p-1.5 md:p-2 bg-slate-800/80 border border-slate-600 rounded-full hover:border-cyan-400 hover:bg-cyan-500/20 text-slate-200 transition-all">
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
        </div>
    );
}