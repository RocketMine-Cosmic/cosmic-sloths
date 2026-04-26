import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Server-authoritative bounty/daily-mission claim.
// Reads cloud PlayerSave to verify progress >= target and not yet claimed,
// then atomically marks claimed and grants the reward.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const wallet = me.wallet_address;
        if (!wallet) return Response.json({ error: 'No wallet linked to user' }, { status: 400 });

        const { type, bountyIndex } = await req.json();
        if (!type || (type !== 'bounty' && type !== 'dailyMission')) {
            return Response.json({ error: 'type must be "bounty" or "dailyMission"' }, { status: 400 });
        }
        if (type === 'bounty' && (bountyIndex === undefined || bountyIndex < 0 || bountyIndex > 2)) {
            return Response.json({ error: 'bountyIndex required (0-2) for type=bounty' }, { status: 400 });
        }

        const walletLower = wallet.toLowerCase();
        const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower });
        if (records.length === 0) return Response.json({ error: 'PlayerSave not found' }, { status: 404 });

        const record = records[0];
        const saveData = typeof record.save_data === 'string' ? JSON.parse(record.save_data) : record.save_data;

        if (!saveData.bounties) return Response.json({ error: 'No bounties data' }, { status: 400 });

        let bounty;
        if (type === 'bounty') {
            const list = saveData.bounties.active;
            if (!Array.isArray(list) || !list[bountyIndex]) return Response.json({ error: 'Bounty not found' }, { status: 404 });
            bounty = list[bountyIndex];
        } else {
            bounty = saveData.bounties.dailyMission;
            if (!bounty) return Response.json({ error: 'Daily mission not found' }, { status: 404 });
        }

        // Validate
        if (bounty.claimed) return Response.json({ error: 'Already claimed', alreadyClaimed: true }, { status: 409 });
        if ((bounty.progress || 0) < (bounty.target || 0)) return Response.json({ error: 'Bounty not complete' }, { status: 400 });

        // Mark claimed and grant reward atomically in saveData
        bounty.claimed = true;

        if (type === 'dailyMission') {
            // Daily mission rewards seasonal points
            saveData.seasonalPoints = (saveData.seasonalPoints || 0) + (bounty.reward || 0);
        } else {
            // Daily bounties reward gold/fragments/tokens
            const amount = bounty.reward || 0;
            if (bounty.currency === 'gold') {
                saveData.gold = (saveData.gold || 0) + amount;
            } else if (bounty.currency === 'fragment') {
                saveData.relicFragments = (saveData.relicFragments || 0) + amount;
            } else if (bounty.currency === 'token') {
                saveData.cosmicTokens = (saveData.cosmicTokens || 0) + amount;
            }
        }

        saveData.updated_at = Date.now();

        await base44.asServiceRole.entities.PlayerSave.update(record.id, {
            save_data: saveData,
            updated_at: Date.now()
        });

        return Response.json({
            success: true,
            reward: { amount: bounty.reward, currency: bounty.currency || 'seasonalPoints' },
            saveData: {
                gold: saveData.gold,
                relicFragments: saveData.relicFragments,
                cosmicTokens: saveData.cosmicTokens,
                seasonalPoints: saveData.seasonalPoints,
                bounties: saveData.bounties
            }
        });
    } catch (error) {
        console.error('[claimBounty]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});