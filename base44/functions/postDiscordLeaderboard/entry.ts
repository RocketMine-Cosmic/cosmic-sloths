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

function getRankEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `**#${rank}**`;
}

function getPilotIcon(score) {
    return score.pilot_icon || '🦥';
}

function dedup(scores, limit = 10) {
    const seen = new Set();
    const result = [];
    for (const s of scores) {
        const key = s.wallet_address || s.user_id;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        result.push(s);
        if (result.length >= limit) break;
    }
    return result;
}

function buildRows(scores) {
    return scores.map((s, i) => {
        const rank = i + 1;
        const icon = getPilotIcon(s);
        const name = s.player_name || 'Unknown';
        const title = s.player_title ? ` *${s.player_title}*` : '';
        const score = s.score?.toLocaleString() || '0';
        const kills = s.kills ? ` · ${s.kills.toLocaleString()} kills` : '';
        return `${getRankEmoji(rank)} ${icon} **${name}**${title} — ${score} pts${kills}`;
    }).join('\n');
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const webhookUrl = Deno.env.get('DISCORD_LEADERBOARD_WEBHOOK');
        if (!webhookUrl) {
            return Response.json({ error: 'Discord webhook not configured' }, { status: 500 });
        }

        let body = {};
        try { body = await req.json(); } catch {}
        const { week_id: defaultWeek, season_id: defaultSeason } = getCurrentPeriodIds();
        const week_id = body.week_id || defaultWeek;
        const season_id = body.season_id || defaultSeason;

        // Fetch both leaderboards in parallel
        const [weeklyScores, seasonalScores] = await Promise.all([
            base44.asServiceRole.entities.RunScore.filter({ week_id }, '-score', 300),
            base44.asServiceRole.entities.RunScore.filter({ season_id }, '-score', 400),
        ]);

        const weeklyUnique = dedup(weeklyScores, 10);
        const seasonalUnique = dedup(seasonalScores, 10);

        const embeds = [];

        if (weeklyUnique.length > 0) {
            embeds.push({
                title: '🏆 Weekly Leaderboard',
                description: `**Week ${week_id}** — Top ${weeklyUnique.length} Pilots\n\n${buildRows(weeklyUnique)}`,
                color: 0x0CA7B8,
                timestamp: new Date().toISOString(),
            });
        }

        if (seasonalUnique.length > 0) {
            embeds.push({
                title: '🗓️ Seasonal Leaderboard',
                description: `**Season ${season_id}** — Top ${seasonalUnique.length} Pilots\n\n${buildRows(seasonalUnique)}`,
                color: 0xD946EF,
                footer: { text: 'Sloths in Space · Compete for OMENX rewards' },
                timestamp: new Date().toISOString(),
            });
        }

        if (embeds.length === 0) {
            return Response.json({ message: 'No scores to post' });
        }

        // Dry run — return preview without posting
        if (body.dry_run) {
            return Response.json({ preview: embeds, week_id, season_id, would_post: { weekly: weeklyUnique.length, seasonal: seasonalUnique.length } });
        }

        const discordRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds }),
        });

        if (!discordRes.ok) {
            const err = await discordRes.text();
            throw new Error(`Discord error ${discordRes.status}: ${err}`);
        }

        return Response.json({ success: true, week_id, season_id, posted: { weekly: weeklyUnique.length, seasonal: seasonalUnique.length } });
    } catch (error) {
        console.error('[postDiscordLeaderboard]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});