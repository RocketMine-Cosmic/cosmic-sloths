import React from 'react';

export const PILOT_ICONS = ['🦥', '🐉', '🤖', '👾', '🦊', '🐺', '🦁', '🐸', '👻', '💀', '🤠', '🥷', '🧙', '🦄', '🐼', '🐧', '🦅', '🐙', '🦂', '⚡'];
export const SQUAD_ICONS = ['🛡️', '⚔️', '🔥', '💀', '🌌', '🐉', '🤖', '👾', '☠️', '🦅', '🌙', '⭐', '🌀', '💥', '🎯', '🪐', '🧬', '🏴‍☠️', '⚡', '🦁'];

export default function EmojiPicker({ options, selected, onSelect, onClose }) {
    return (
        <div className="absolute z-50 bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-2xl mt-2" style={{ minWidth: 260 }}>
            <div className="grid grid-cols-5 gap-2">
                {options.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => { onSelect(emoji); onClose(); }}
                        className={`text-2xl p-2 rounded-lg transition-colors hover:bg-slate-700 ${selected === emoji ? 'bg-cyan-900 ring-2 ring-cyan-500' : ''}`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            <button onClick={onClose} className="mt-2 w-full text-xs text-slate-400 hover:text-white text-center py-1">Cancel</button>
        </div>
    );
}