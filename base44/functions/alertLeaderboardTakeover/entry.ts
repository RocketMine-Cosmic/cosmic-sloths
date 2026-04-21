import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

async function postTakeover(webhookUrl, embed) {
    const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Discord error ${res.status}: ${err}`);
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const webhookUrl = Deno.env.get('DISCORD_ALERT_WEBHOOK');
        if (!webhookUrl) {
            return Response.json({ error: 'DISCORD_ALERT_WEBHOOK not configured' }, { status: 500 });
        }

        // This function is triggered by the entity automation on RunScore create/update
        const body = await req.json();
        const newScore = body.data;

        if (!newScore || !newScore.score) {
            return Response.json({ skipped: 'no score data' });
        }

        const { week_id, season_id } = getCurrentPeriodIds();

        // Only care about scores from the current periods
        const isCurrentWeek = newScore.week_id === week_id;
        const isCurrentSeason = newScore.season_id === season_id;

        if (!isCurrentWeek && !isCurrentSeason) {
            return Response.json({ skipped: 'not current period' });
        }

        const name = newScore.player_name || 'Unknown Pilot';
        const icon = newScore.pilot_icon || '🦥';
        const title = newScore.player_title ? ` — *${newScore.player_title}*` : '';
        const score = newScore.score?.toLocaleString() || '0';

        const alerts = [];

        // Check weekly #1
        if (isCurrentWeek) {
            const weeklyScores = await base44.asServiceRole.entities.RunScore.filter({ week_id }, '-score', 50);
            // Deduplicate
            const seen = new Set();
            const unique = [];
            for (const s of weeklyScores) {
                const key = s.wallet_address || s.user_id;
                if (!key || seen.has(key)) continue;
                seen.add(key);
                unique.push(s);
                if (unique.length >= 2) break;
            }
            const currentTop = unique[0];
            // This score is #1 if it matches the top score and belongs to this player
            const isTopScore = currentTop &&
                (currentTop.wallet_address === newScore.wallet_address || currentTop.user_id === newScore.user_id) &&
                currentTop.score === newScore.score;

            if (isTopScore) {
                // Check if previous #1 was someone else
                const prevTop = unique[1];
                const takenOver = !prevTop || prevTop.wallet_address !== newScore.wallet_address;
                if (takenOver) {
                    alerts.push({
                        title: '👑 Weekly #1 Takeover!',
                        description: `${icon} **${name}**${title} has seized the top of the **Weekly Leaderboard**!\n\n🏆 Score: **${score} pts**\n📅 Week: ${week_id}`,
                        color: 0x0CA7B8,
                        footer: { text: 'Sloths in Space · Weekly Leaderboard' },
                        timestamp: new Date().toISOString(),
                    });
                }
            }
        }

        // Check seasonal #1
        if (isCurrentSeason) {
            const seasonalScores = await base44.asServiceRole.entities.RunScore.filter({ season_id }, '-score', 50);
            const seen = new Set();
            const unique = [];
            for (const s of seasonalScores) {
                const key = s.wallet_address || s.user_id;
                if (!key || seen.has(key)) continue;
                seen.add(key);
                unique.push(s);
                if (unique.length >= 2) break;
            }
            const currentTop = unique[0];
            const isTopScore = currentTop &&
                (currentTop.wallet_address === newScore.wallet_address || currentTop.user_id === newScore.user_id) &&
                currentTop.score === newScore.score;

            if (isTopScore) {
                const prevTop = unique[1];
                const takenOver = !prevTop || prevTop.wallet_address !== newScore.wallet_address;
                if (takenOver) {
                    alerts.push({
                        title: '👑 Seasonal #1 Takeover!',
                        description: `${icon} **${name}**${title} has seized the top of the **Seasonal Leaderboard**!\n\n🏆 Score: **${score} pts**\n🗓️ Season: ${season_id}`,
                        color: 0xD946EF,
                        footer: { text: 'Sloths in Space · Seasonal Leaderboard' },
                        timestamp: new Date().toISOString(),
                    });
                }
            }
        }

        if (alerts.length === 0) {
            return Response.json({ skipped: 'not a #1 takeover' });
        }

        for (const embed of alerts) {
            await postTakeover(webhookUrl, embed);
        }

        return Response.json({ success: true, alerts: alerts.length });
    } catch (error) {
        console.error('[alertLeaderboardTakeover]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});