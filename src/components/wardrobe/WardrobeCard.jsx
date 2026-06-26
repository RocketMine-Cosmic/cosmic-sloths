import React from 'react';
import { Lock, Eye } from 'lucide-react';

const RARITY_STYLES = {
    free:     { label: 'Free',     ring: 'border-slate-700',      text: 'text-slate-400' },
    standard: { label: 'Standard', ring: 'border-slate-600',      text: 'text-slate-300' },
    epic:     { label: 'Epic',     ring: 'border-cyan-500/70',    text: 'text-cyan-300' },
    mythic:   { label: 'Mythic',   ring: 'border-amber-500/80',   text: 'text-amber-200' },
    reward:   { label: 'Reward',   ring: 'border-yellow-600/70',  text: 'text-yellow-300' },
};

export default function WardrobeCard({ item, owned, equipped, onPreview, onEquip }) {
    const rarity = RARITY_STYLES[item.rarity] || RARITY_STYLES.standard;

    // Three primary action states:
    //   1. Owned + equipped  → "Equipped" pill
    //   2. Owned + not eq.   → "Equip" button (calls onEquip)
    //   3. Not owned         → disabled CTA — standard = "Coming soon",
    //                          chest = "Chest only", reward = "Quest milestone"
    let cta;
    if (owned && equipped) {
        cta = <div className="w-full py-1.5 rounded-md text-center text-[11px] font-black uppercase tracking-widest text-pink-300 bg-pink-900/40 border border-pink-500/50">Equipped</div>;
    } else if (owned) {
        cta = (
            <button
                onClick={onEquip}
                className="w-full py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
                Equip
            </button>
        );
    } else if (item.source === 'chest') {
        cta = (
            <div className="w-full py-1.5 rounded-md text-center text-[10px] font-bold uppercase tracking-widest text-amber-300/80 bg-amber-950/40 border border-amber-700/40 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Drops from chests
            </div>
        );
    } else if (item.source === 'reward') {
        cta = (
            <div className="w-full py-1.5 rounded-md text-center text-[10px] font-bold uppercase tracking-widest text-yellow-300/80 bg-yellow-950/40 border border-yellow-700/40">
                Quest milestone reward
            </div>
        );
    } else {
        // Standard cosmetic — purchase disabled pending GMT scope (see design doc).
        cta = (
            <div className="w-full py-1.5 rounded-md text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800/70 border border-slate-700">
                Coming soon
            </div>
        );
    }

    return (
        <div className={`bg-slate-900/70 border-2 rounded-xl p-2.5 flex flex-col gap-2 transition-all ${equipped ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : rarity.ring + ' hover:border-slate-500'}`}>
            <button
                onClick={onPreview}
                className="aspect-square bg-slate-950/80 rounded-lg flex items-center justify-center relative overflow-hidden group"
                title="Preview"
            >
                {item.category === 'skin' && item.color ? (
                    <div
                        className="w-16 h-16 rounded-full border-4"
                        style={{ background: item.color, borderColor: item.color + '60', boxShadow: `0 0 30px ${item.color}40` }}
                    />
                ) : (
                    <span className="text-5xl">{item.icon || '✨'}</span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className={`absolute top-1 left-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded bg-slate-950/80 border ${rarity.ring} ${rarity.text}`}>
                    {rarity.label}
                </span>
            </button>

            <div className="min-h-[2.25rem]">
                <div className="font-bold text-xs text-white leading-tight truncate">{item.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight line-clamp-2">{item.desc}</div>
            </div>

            {cta}
        </div>
    );
}