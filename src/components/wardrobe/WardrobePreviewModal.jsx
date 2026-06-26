import React from 'react';
import { X, Lock } from 'lucide-react';
import CosmeticPreview from '@/components/game/CosmeticPreview';

// Live preview for any Wardrobe item.
//
// Trails / kill FX: render the existing CosmeticPreview canvas with the
// item temporarily applied — same path the Armoury used to use.
// Skins: render a styled character circle in the chosen color.
// Chest-only categories (pilot_icon, lb_frame, title_flair, meteor_fx):
// no asset yet → render a "preview coming once chest cosmetics ship" card.
export default function WardrobePreviewModal({ item, save, charId, onClose }) {
    if (!item) return null;

    const renderPreview = () => {
        if (item.category === 'trail') {
            return (
                <CosmeticPreview
                    trailId={item.id}
                    killEffectId={save?.cosmetics?.killEffect || 'none'}
                    charId={charId}
                    playerColor="#00cfff"
                />
            );
        }
        if (item.category === 'kill_fx') {
            return (
                <CosmeticPreview
                    trailId={save?.cosmetics?.trail || 'default'}
                    killEffectId={item.id}
                    charId={charId}
                    playerColor="#00cfff"
                />
            );
        }
        if (item.category === 'skin') {
            return (
                <div className="aspect-video bg-slate-950 rounded-lg flex items-center justify-center">
                    <div
                        className="w-32 h-32 rounded-full border-8"
                        style={{ background: item.color, borderColor: item.color + '80', boxShadow: `0 0 60px ${item.color}` }}
                    />
                </div>
            );
        }
        // Chest-only categories — placeholder until assets ship.
        return (
            <div className="aspect-video bg-slate-950 rounded-lg flex flex-col items-center justify-center gap-3 text-center px-4">
                <div className="text-6xl opacity-70">{item.icon}</div>
                <div className="text-amber-300/80 text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Live preview lands when the asset is generated.
                </div>
                <div className="text-slate-500 text-xs max-w-sm">
                    This is a chest cosmetic — concept art is in the design doc, the asset
                    is being authored in the Cosmetic Studio.
                </div>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 bg-black/85 backdrop-blur flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500">{item.category.replace('_', ' ')}</div>
                        <div className="text-white font-bold text-lg">{item.name}</div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto">
                    {renderPreview()}
                    <p className="text-slate-300 text-sm mt-3">{item.desc}</p>
                </div>
            </div>
        </div>
    );
}