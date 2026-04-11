import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let csv = "SKU,Category,Item Name,Price (Tokens)\n";
        
        csv += `IG-BANISH,In-Game,Banish Upgrade,1\n`;
        csv += `IG-REROLL,In-Game,Reroll Upgrades,2\n`;
        csv += `IG-SQUADULT,In-Game,Squad Ultimate,4\n`;
        csv += `IG-EMREVIVE,In-Game,Emergency Revive,4\n`;
        csv += `IG-XPSESSION,In-Game,XP Session Buff,10\n`;

        const stats = ['Damage', 'Health', 'Speed', 'Magnet', 'Regen', 'Cooldown', 'Luck'];
        const tiers = [
            {name: 'Permanent', costs: [15, 30, 60, 120, 240]},
            {name: 'Weekly', costs: [8, 15, 30, 60, 120]},
            {name: 'Seasonal', costs: [20, 40, 80, 160, 320]}
        ];

        stats.forEach(stat => {
            tiers.forEach(tier => {
                for(let i=1; i<=5; i++) {
                    const itemName = `${tier.name} ${stat} Lv. ${i}`;
                    const sku = `STAT-${tier.name.substring(0,3).toUpperCase()}-${stat.substring(0,4).toUpperCase()}-L${i}`;
                    csv += `${sku},Stat Upgrades,${itemName},${tier.costs[i-1]}\n`;
                }
            });
        });

        const weapons = ['Blaster', 'Cosmic Nap Beam', 'Plasma Whip', 'Orbital Drones', 'Zero-G Napalm', 'Nova Pulse', 'Shield Bubble', 'Ricochet Blade', 'Toxic Emitter'];
        const wStats = ['Damage', 'Area', 'Cooldown'];
        weapons.forEach(w => {
            wStats.forEach(ws => {
                tiers.forEach(tier => {
                    for(let i=1; i<=5; i++) {
                        const itemName = `${tier.name} ${w} ${ws} Lv. ${i}`;
                        const sku = `WEAP-${tier.name.substring(0,3).toUpperCase()}-${w.replace(/[^a-zA-Z0-9]/g, '').substring(0,6).toUpperCase()}-${ws.substring(0,3).toUpperCase()}-L${i}`;
                        csv += `${sku},Weapon Upgrades,${itemName},${tier.costs[i-1]}\n`;
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
                    const itemName = `${tier.name} ${c.name} - ${talent}`;
                    const sku = `TALENT-${tier.name.substring(0,3).toUpperCase()}-${c.name.substring(0,4).toUpperCase()}-${talent.replace(/[^a-zA-Z0-9]/g, '').substring(0,6).toUpperCase()}`;
                    csv += `${sku},Character Talents,${itemName},${tier.costs[idx]}\n`;
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

        skins.forEach(s => {
            const sku = `SKIN-${s.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
            csv += `${sku},Character Skins,${s.name},${s.cost}\n`;
        });

        const trails = [
            {name: 'Fire Trail', cost: 25}, {name: 'Ice Trail', cost: 25}, {name: 'Toxic Trail', cost: 25},
            {name: 'Plasma Trail', cost: 80}, {name: 'Void Trail', cost: 125}, {name: 'Shadow Trail', cost: 150},
            {name: 'Golden Trail', cost: 250}, {name: 'Blood Trail', cost: 300}, {name: 'Pixel Trail', cost: 350},
            {name: 'Nebula Dust', cost: 380}, {name: 'Rainbow Trail', cost: 500}
        ];

        trails.forEach(t => {
            const sku = `TRAIL-${t.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
            csv += `${sku},Player Trails,${t.name},${t.cost}\n`;
        });

        const kills = [
            {name: 'Explosion', cost: 30}, {name: 'Freeze Burst', cost: 30}, {name: 'Vaporize', cost: 30},
            {name: 'Pixel Burst', cost: 80}, {name: 'Implode', cost: 150}, {name: 'Blood Splatter', cost: 200},
            {name: 'Black Hole', cost: 250}, {name: 'Gold Shatter', cost: 300}
        ];

        kills.forEach(k => {
            const sku = `KILLEFF-${k.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
            csv += `${sku},Kill Effects,${k.name},${k.cost}\n`;
        });

        const reqBody = await req.json().catch(() => ({}));
        const toEmail = reqBody.email || 'rob.butler1990@outlook.com';

        await base44.asServiceRole.integrations.Core.SendEmail({
            to: toEmail,
            subject: 'Cosmic Sloths - SKU Export CSV',
            from_name: 'Cosmic Sloths Admin',
            body: `Hello!\n\nAs requested, here is your complete list of 698 Cosmic Token SKUs in CSV format. You can copy and paste this directly into a .csv file, or into Excel/Google Sheets.\n\n---\n\n${csv}`
        });

        return Response.json({ success: true, emailSentTo: toEmail });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
});