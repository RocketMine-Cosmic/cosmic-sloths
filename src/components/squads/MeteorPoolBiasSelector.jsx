import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { POOL_BIAS_PRESETS } from '@/lib/poolBiasPresets';

export default function MeteorPoolBiasSelector() {
    const [meteorBias, setMeteorBias] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const user = await base44.auth.me();
                if (!user) return;
                const walletLower = (user.wallet_address || '').toLowerCase();
                const saves = await base44.entities.PlayerSave.filter({ wallet_address: walletLower });
                if (saves.length > 0) {
                    setMeteorBias(saves[0].save_data?.meteorPoolBias || null);
                }
            } catch (e) {
                console.error('[MeteorPoolBiasSelector] load failed:', e.message);
            }
            setLoading(false);
        })();
    }, []);

    const handleChange = async (newBias) => {
        setMeteorBias(newBias);
        try {
            const user = await base44.auth.me();
            if (!user) return;
            const walletLower = (user.wallet_address || '').toLowerCase();
            const saves = await base44.entities.PlayerSave.filter({ wallet_address: walletLower });
            if (saves.length > 0) {
                const save = saves[0];
                const saveData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;
                saveData.meteorPoolBias = newBias;
                await base44.entities.PlayerSave.update(save.id, { save_data: saveData });
            }
        } catch (e) {
            console.error('[MeteorPoolBiasSelector] save failed:', e.message);
        }
    };

    const getPresetLabel = (bias) => {
        const preset = Object.values(POOL_BIAS_PRESETS).find(p => 
            JSON.stringify(p.bias) === JSON.stringify(bias)
        );
        return preset?.label || 'Custom';
    };

    if (loading) return null;

    return (
        <div className="mb-4 p-3 md:p-4 bg-slate-900/40 border border-purple-500/30 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h3 className="font-bold text-sm md:text-base text-white">Meteor Loadout</h3>
                    <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">Auto-applies when you start a meteor run</p>
                </div>
                <select
                    value={meteorBias ? JSON.stringify(meteorBias) : ''}
                    onChange={(e) => handleChange(e.target.value ? JSON.parse(e.target.value) : null)}
                    className="px-3 py-1.5 md:px-3 md:py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50"
                >
                    <option value="">None (use main loadout)</option>
                    {Object.entries(POOL_BIAS_PRESETS).map(([key, preset]) => (
                        <option key={key} value={JSON.stringify(preset.bias)}>
                            {preset.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}