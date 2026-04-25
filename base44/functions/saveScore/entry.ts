import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const verifyCache = new Map();
const VERIFY_CACHE_TTL = 60 * 60 * 1000;

async function verifyToken(sdk, accessToken) {
    const now = Date.now();
    const cached = verifyCache.get(accessToken);
    if (cached && cached.expiresAt > now) return { success: true, walletAddress: cached.walletAddress };
    const result = await sdk.verifyOAuthUser(accessToken);
    if (result.success) {
        verifyCache.set(accessToken, { walletAddress: result.user.walletAddress, expiresAt: now + VERIFY_CACHE_TTL });
        if (verifyCache.size > 500) {
            for (const [k, v] of verifyCache) { if (v.expiresAt <= now) verifyCache.delete(k); }
        }
    }
    return result.success ? { success: true, walletAddress: result.user.walletAddress } : { success: false };
}

function getCurrentPeriodIds() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;
    const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
    const season_id = `${year}-S${seasonNum}`;
    return { week_id, season_id };
}

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const { scoreData, walletAddress: clientWallet, squadStats, accessToken } = body;
        const db = createClientFromRequest(req).asServiceRole;

        if (!scoreData || !clientWallet || !accessToken) {
            return Response.json({ error: 'scoreData, walletAddress, and accessToken required' }, { status: 400 });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await verifyToken(sdk, accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });

        const { week_id, season_id } = getCurrentPeriodIds();
        scoreData.week_id = week_id;
        scoreData.season_id = season_id;
        scoreData.wallet_address = verifyResult.walletAddress;

        // Save RunScore
        try {
            await db.entities.RunScore.create(scoreData);
        } catch (err) {
            console.error('[saveScore] RunScore save failed:', err.message);
            return Response.json({ error: 'Failed to save score' }, { status: 500 });
        }

        // Update squad kills if applicable
        let squadIdToUpdate = squadStats?.squadId || null;
        if (!squadIdToUpdate) {
            try {
                const memberRecords = await db.entities.SquadMember.filter({ wallet_address: verifyResult.walletAddress });
                if (memberRecords && memberRecords.length > 0) {
                    squadIdToUpdate = memberRecords[0].squad_id;
                }
            } catch (err) {
                console.log('[saveScore] Could not fetch squad membership:', err.message);
            }
        }

        if (squadIdToUpdate) {
            const today = new Date().toISOString().split('T')[0];
            const killsToAdd = squadStats?.kills || scoreData.kills || 0;
            try {
                const squad = await db.entities.Squad.get(squadIdToUpdate);
                const dailyKillsReset = squad.current_day !== today ? 0 : (squad.daily_kills || 0);
                await db.entities.Squad.update(squadIdToUpdate, {
                    weekly_kills: (squad.weekly_kills || 0) + killsToAdd,
                    daily_kills: dailyKillsReset + killsToAdd,
                    current_day: today
                });
                console.log(`[saveScore] Updated squad ${squadIdToUpdate} +${killsToAdd} kills`);
            } catch (err) {
                console.error('[saveScore] Squad update failed:', err.message);
            }
        }

        console.log('[saveScore] Saved for wallet:', verifyResult.walletAddress);
        return Response.json({ success: true });
    } catch (error) {
        console.error('[saveScore]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});