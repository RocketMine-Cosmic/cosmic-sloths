import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only admins can run this
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const results = {
            squadsDuplicate: { deleted: 0, errors: [] },
            pilotNamesMerged: { updated: 0, errors: [] },
        };

        // 1. Remove duplicate squads by owner_wallet (keep newest, delete older)
        try {
            const allSquads = await base44.asServiceRole.entities.Squad.list('-created_date', 1000);
            const squadsByOwner = {};
            
            // Group squads by owner_wallet
            for (const squad of allSquads) {
                const owner = squad.owner_wallet || 'unknown';
                if (!squadsByOwner[owner]) squadsByOwner[owner] = [];
                squadsByOwner[owner].push(squad);
            }

            // For each owner with multiple squads, delete the older ones
            for (const [owner, squads] of Object.entries(squadsByOwner)) {
                if (squads.length > 1) {
                    // Keep the newest (first in list due to -created_date sort)
                    const toDelete = squads.slice(1);
                    for (const squad of toDelete) {
                        try {
                            // Delete associated members and messages first
                            const members = await base44.asServiceRole.entities.SquadMember.filter({ squad_id: squad.id });
                            for (const member of members) {
                                await base44.asServiceRole.entities.SquadMember.delete(member.id);
                            }
                            
                            const messages = await base44.asServiceRole.entities.SquadMessage.filter({ squad_id: squad.id });
                            for (const msg of messages) {
                                await base44.asServiceRole.entities.SquadMessage.delete(msg.id);
                            }
                            
                            await base44.asServiceRole.entities.Squad.delete(squad.id);
                            results.squadsDuplicate.deleted++;
                        } catch (e) {
                            results.squadsDuplicate.errors.push({ squadId: squad.id, error: e.message });
                        }
                    }
                }
            }
        } catch (e) {
            results.squadsDuplicate.errors.push({ error: e.message });
        }

        // 2. Consolidate pilot names per wallet (keep most recent name)
        try {
            const allRunScores = await base44.asServiceRole.entities.RunScore.list('-created_date', 5000);
            const namesByWallet = {};

            // Map wallet -> most recent player_name (first occurrence due to -created_date sort)
            for (const score of allRunScores) {
                const wallet = score.wallet_address || 'unknown';
                if (!namesByWallet[wallet]) {
                    namesByWallet[wallet] = score.player_name; // Most recent name
                }
            }

            // Update all RunScore records with old names to use the canonical name
            for (const score of allRunScores) {
                const wallet = score.wallet_address || 'unknown';
                const canonicalName = namesByWallet[wallet];
                
                if (score.player_name !== canonicalName) {
                    try {
                        await base44.asServiceRole.entities.RunScore.update(score.id, {
                            player_name: canonicalName
                        });
                        results.pilotNamesMerged.updated++;
                    } catch (e) {
                        results.pilotNamesMerged.errors.push({ scoreId: score.id, error: e.message });
                    }
                }
            }

            // Also update SquadMember records
            const allMembers = await base44.asServiceRole.entities.SquadMember.list('-created_date', 5000);
            for (const member of allMembers) {
                const wallet = member.wallet_address || 'unknown';
                const canonicalName = namesByWallet[wallet];
                
                if (canonicalName && member.player_name !== canonicalName) {
                    try {
                        await base44.asServiceRole.entities.SquadMember.update(member.id, {
                            player_name: canonicalName
                        });
                        results.pilotNamesMerged.updated++;
                    } catch (e) {
                        results.pilotNamesMerged.errors.push({ memberId: member.id, error: e.message });
                    }
                }
            }

            // Also update PlayerSave records with canonical pilotName
            const allSaves = await base44.asServiceRole.entities.PlayerSave.list('-created_date', 5000);
            for (const save of allSaves) {
                const wallet = save.wallet_address || 'unknown';
                const canonicalName = namesByWallet[wallet];
                
                if (canonicalName && save.save_data?.pilotName !== canonicalName) {
                    try {
                        const updatedData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;
                        updatedData.pilotName = canonicalName;
                        await base44.asServiceRole.entities.PlayerSave.update(save.id, {
                            save_data: updatedData
                        });
                        results.pilotNamesMerged.updated++;
                    } catch (e) {
                        results.pilotNamesMerged.errors.push({ saveId: save.id, error: e.message });
                    }
                }
            }
        } catch (e) {
            results.pilotNamesMerged.errors.push({ error: e.message });
        }

        console.log('[cleanupDuplicates] Completed:', JSON.stringify(results));
        return Response.json({ success: true, ...results });
    } catch (error) {
        console.error('[cleanupDuplicates]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});