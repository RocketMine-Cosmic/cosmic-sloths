import React from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { CHARACTER_TALENTS } from '../../game/Constants';

// Flat talent display per character. Shows ALL talent-tree slots so the player
// can see what they've taken vs what's still available, with the path each
// talent belongs to.
export default function BuildTalentList({ save, charId }) {
    const tree = CHARACTER_TALENTS[charId] || [];
    if (tree.length === 0) {
        return <div className="text-xs text-slate-500 italic">No talents defined for this character.</div>;
    }
    const owned = new Set([
        ...((save.permanentTalents?.[charId]) || []),
        ...((save.unlockedTalents?.[charId]) || []),
    ]);

    return (
        <div className="space-y-1.5">
            {tree.map(t => {
                const has = owned.has(t.id);
                const requires = t.requires;
                const hasPrereq = !requires || owned.has(requires);
                return (
                    <div
                        key={t.id}
                        className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${
                            has
                                ? 'bg-fuchsia-950/30 border-fuchsia-700/50'
                                : hasPrereq
                                    ? 'bg-slate-900/60 border-slate-800'
                                    : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        }`}
                    >
                        <div className="shrink-0 mt-0.5">
                            {has
                                ? <Sparkles className="w-4 h-4 text-fuchsia-300" />
                                : <Lock className="w-3.5 h-3.5 text-slate-600" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-bold ${has ? 'text-fuchsia-200' : 'text-slate-400'}`}>{t.name}</span>
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider">Tier {t.tier}</span>
                                {has && <span className="text-[9px] bg-fuchsia-700/40 text-fuchsia-200 px-1.5 py-0.5 rounded font-bold uppercase">Owned</span>}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{t.desc}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}