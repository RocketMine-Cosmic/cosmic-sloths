import React, { useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';

export default function DownloadSkus() {
    const [downloaded, setDownloaded] = useState(false);

    const handleDownload = () => {
        let csv = "Category,Item Name,Price (Tokens)\n";
        
        csv += "In-Game,Banish Upgrade,1\n";
        csv += "In-Game,Reroll Upgrades,2\n";
        csv += "In-Game,Squad Ultimate,4\n";
        csv += "In-Game,Emergency Revive,4\n";
        csv += "In-Game,XP Session Buff,10\n";

        const stats = ['Damage', 'Health', 'Speed', 'Magnet', 'Regen', 'Cooldown', 'Luck'];
        const tiers = [
            {name: 'Permanent', costs: [15, 30, 60, 120, 240]},
            {name: 'Weekly', costs: [8, 15, 30, 60, 120]},
            {name: 'Seasonal', costs: [20, 40, 80, 160, 320]}
        ];

        stats.forEach(stat => {
            tiers.forEach(tier => {
                for(let i=1; i<=5; i++) {
                    csv += `Stat Upgrades,${tier.name} ${stat} Lv. ${i},${tier.costs[i-1]}\n`;
                }
            });
        });

        const weapons = ['Blaster', 'Cosmic Nap Beam', 'Plasma Whip', 'Orbital Drones', 'Zero-G Napalm', 'Nova Pulse', 'Shield Bubble', 'Ricochet Blade', 'Toxic Emitter'];
        const wStats = ['Damage', 'Area', 'Cooldown'];
        weapons.forEach(w => {
            wStats.forEach(ws => {
                tiers.forEach(tier => {
                    for(let i=1; i<=5; i++) {
                        csv += `Weapon Upgrades,${tier.name} ${w} ${ws} Lv. ${i},${tier.costs[i-1]}\n`;
                    }
                });
            });
        });

        const chars = [
            {name: 'NeoByte', t: ['Fleet Command', 'Rapid Ordnance', 'Reinforced Hull', 'Orbital Bombardment', 'Aegis Shield']},
            {name: 'Pandypaws', t: ['Titanium Alloy', 'Gravity Crush', 'Nanite Repair', 'Seismic Shock', 'Dreadnought Chassis']},
            {name: 'NovaByte', t: ['Reactive Armor', 'Antimatter Charges', 'Lightweight Frame', 'Supernova Detonation', 'Evasion Thrusters']},
            {name: 'Glitch', t: ['Neural Overclock', 'Total Annihilation', 'Quantum Probability', 'Fatal Error', 'Lucky Strike']},
            {name: 'HoloDrift', t: ['Salvage Drones', 'Magnetic Field Emitter', 'Light-Bending Mirage', 'Greed Protocol', 'Holographic Decoy']},
            {name: 'CodeBreaker', t: ['Subroutine Bypass', 'Crypto Mining', 'Overclocked CPU', 'Omniscience Protocol', 'Infinite Loop']},
            {name: 'DataPhantom', t: ['Phase Shift', 'Particle Accelerator', 'Energy Shielding', 'Data Corruption', 'Ghost Protocol']},
            {name: 'NeonVortex', t: ['Targeting Optics', 'Railgun Calibration', 'Micro-Blackhole', 'Singularity Shot', 'Event Horizon']},
            {name: 'SynthBeats', t: ['Sonic Pacifier', 'Intergalactic Trade', 'Temporal Rewind', 'Billionaire Club', 'Bass Drop']},
            {name: 'SkyByte', t: ['Slipstream Thrusters', 'Meteor Shower', 'Barrel Roll', 'Carpet Bombing', 'Evasive Maneuvers']}
        ];

        const talentTiers = [
            {name: 'Permanent', costs: [15, 60, 60, 240, 240]},
            {name: 'Weekly', costs: [8, 30, 30, 120, 120]},
            {name: 'Seasonal', costs: [20, 80, 80, 320, 320]}
        ];

        chars.forEach(c => {
            c.t.forEach((talent, idx) => {
                talentTiers.forEach(tier => {
                    csv += `Character Talents,${tier.name} ${c.name} - ${talent},${tier.costs[idx]}\n`;
                });
            });
        });

        const skins = [
            {name: 'NeoByte: Crimson', cost: 50}, {name: 'NeoByte: Gold Edition', cost: 200},
            {name: 'Pandypaws: Obsidian', cost: 50}, {name: 'Pandypaws: Cryo', cost: 200},
            {name: 'NovaByte: Void', cost: 50}, {name: 'NovaByte: Neon', cost: 200},
            {name: 'Glitch: Fatal Error', cost: 50}, {name: 'Glitch: Whitespace', cost: 200},
            {name: 'HoloDrift: Amber', cost: 50},
            {name: 'CodeBreaker: Rootkit', cost: 50},
            {name: 'DataPhantom: Ghost', cost: 50},
            {name: 'NeonVortex: Plasma', cost: 50},
            {name: 'SynthBeats: Violet Drop', cost: 50},
            {name: 'SkyByte: Solar Ace', cost: 50}
        ];

        skins.forEach(s => csv += `Character Skins,${s.name},${s.cost}\n`);

        const trails = [
            {name: 'Fire Trail', cost: 25}, {name: 'Ice Trail', cost: 25}, {name: 'Toxic Trail', cost: 25},
            {name: 'Plasma Trail', cost: 80}, {name: 'Void Trail', cost: 125}, {name: 'Shadow Trail', cost: 150},
            {name: 'Golden Trail', cost: 250}, {name: 'Blood Trail', cost: 300}, {name: 'Pixel Trail', cost: 350},
            {name: 'Nebula Dust', cost: 380}, {name: 'Rainbow Trail', cost: 500}
        ];

        trails.forEach(t => csv += `Player Trails,${t.name},${t.cost}\n`);

        const kills = [
            {name: 'Explosion', cost: 30}, {name: 'Freeze Burst', cost: 30}, {name: 'Vaporize', cost: 30},
            {name: 'Pixel Burst', cost: 80}, {name: 'Implode', cost: 150}, {name: 'Blood Splatter', cost: 200},
            {name: 'Black Hole', cost: 250}, {name: 'Gold Shatter', cost: 300}
        ];

        kills.forEach(k => csv += `Kill Effects,${k.name},${k.cost}\n`);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'cosmic_tokens_skus.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setDownloaded(true);
        }
    };

    return (
        <div className="min-h-screen bg-[#0b0416] flex flex-col items-center justify-center p-8 text-center font-sans">
            <h1 className="text-3xl md:text-5xl font-black text-emerald-400 mb-6 font-mono tracking-widest">SKU EXPORTER</h1>
            <p className="text-slate-400 text-sm md:text-lg mb-10 max-w-xl">
                Download a complete, itemized CSV file containing all 698 purchasable items and their exact Cosmic Token prices. Perfect for importing into your external database or storefront.
            </p>
            
            <button 
                onClick={handleDownload}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-xl flex items-center gap-3 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] mb-8"
            >
                <Download className="w-6 h-6" />
                Download CSV File
            </button>

            {downloaded && (
                <p className="text-emerald-400 font-bold mb-8 animate-pulse font-mono tracking-widest">✓ Download Complete!</p>
            )}

            <a href="/" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mt-8">
                <ArrowLeft className="w-4 h-4" /> Return to Game
            </a>
        </div>
    );
}