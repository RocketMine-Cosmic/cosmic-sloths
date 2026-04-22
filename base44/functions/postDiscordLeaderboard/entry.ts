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

function getWeeklyCloseDate(week_id) {
    const [year, weekStr] = week_id.split('-W');
    const isoWeek = parseInt(weekStr);
    const jan1 = new Date(Date.UTC(parseInt(year), 0, 1));
    const dayOfWeek = jan1.getUTCDay();
    const daysToFirstMonday = (8 - dayOfWeek) % 7;
    const firstMonday = new Date(jan1);
    firstMonday.setUTCDate(jan1.getUTCDate() + daysToFirstMonday);
    const weekStart = new Date(firstMonday);
    weekStart.setUTCDate(firstMonday.getUTCDate() + (isoWeek - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
    return weekEnd;
}

function getSeasonalCloseDate(season_id) {
    const [year, seasonStr] = season_id.split('-S');
    const seasonNum = parseInt(seasonStr);
    const startWeek = (seasonNum - 1) * 4 + 1;
    const endWeek = startWeek + 4;
    const jan1 = new Date(Date.UTC(parseInt(year), 0, 1));
    const dayOfWeek = jan1.getUTCDay();
    const daysToFirstMonday = (8 - dayOfWeek) % 7;
    const firstMonday = new Date(jan1);
    firstMonday.setUTCDate(jan1.getUTCDate() + daysToFirstMonday);
    const seasonEnd = new Date(firstMonday);
    seasonEnd.setUTCDate(firstMonday.getUTCDate() + (endWeek - 1) * 7);
    return seasonEnd;
}

function formatCountdown(closeDate) {
    const now = new Date();
    const msLeft = closeDate - now;
    if (msLeft <= 0) return 'Closed';
    const totalHours = Math.floor(msLeft / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
}

function buildRows(scores) {
     return scores.map((s, i) => {
         const rank = i + 1;
         const icon = s.pilot_icon || '🦥';
         const name = s.player_name || 'Unknown';
         const title = s.player_title ? ` *${s.player_title}*` : '';
         const score = s.score?.toLocaleString() || '0';
         const kills = s.kills ? ` · ${s.kills.toLocaleString()} kills` : '';
         const charName = s.character_id ? ` [${s.character_id}]` : '';
         return `${getRankEmoji(rank)} ${icon} **${name}**${title}${charName} — ${score} pts${kills}`;
     }).join('\n');
 }

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const webhookUrl = Deno.env.get('DISCORD_LEADERBOARD_WEBHOOK');
        if (!webhookUrl) return Response.json({ error: 'Discord webhook not configured' }, { status: 500 });

        let body = {};
        try { body = await req.json(); } catch {}
        const { week_id: defaultWeek, season_id: defaultSeason } = getCurrentPeriodIds();
        const week_id = body.week_id || defaultWeek;
        const season_id = body.season_id || defaultSeason;

        const [weeklyScores, seasonalScores] = await Promise.all([
            base44.asServiceRole.entities.RunScore.filter({ week_id }, '-score', 300),
            base44.asServiceRole.entities.RunScore.filter({ season_id }, '-score', 400),
        ]);

        const weeklyUnique = dedup(weeklyScores, 10);
        const seasonalUnique = dedup(seasonalScores, 10);

        const embeds = [];

        if (weeklyUnique.length > 0) {
            const weeklyClose = getWeeklyCloseDate(week_id);
            embeds.push({
                title: '🏆 Weekly Leaderboard — Cosmic Sloths',
                description: `**Week ${week_id}** — Top ${weeklyUnique.length} Pilots\n⏳ ${formatCountdown(weeklyClose)}\n\n${buildRows(weeklyUnique)}\n\n*Earn OMENX by ranking in the top 30. Play to unlock characters, equip NFTs for bonus Gold & Relic Fragments per run.*`,
                color: 0x0CA7B8,
                timestamp: new Date().toISOString(),
            });
        }

        if (seasonalUnique.length > 0) {
            const seasonalClose = getSeasonalCloseDate(season_id);
            embeds.push({
                title: '🗓️ Seasonal Leaderboard — Cosmic Sloths',
                description: `**Season ${season_id}** — Top ${seasonalUnique.length} Pilots\n⏳ ${formatCountdown(seasonalClose)}\n\n${buildRows(seasonalUnique)}\n\n*Earn OMENX by ranking in the top 40. Unlock new characters through kill milestones or finding them during runs. NFT holders get +5% to +15% Gold & Relic Fragments!*`,
                color: 0xD946EF,
                footer: { text: 'Cosmic Sloths · Compete for OMENX rewards' },
                timestamp: new Date().toISOString(),
            });
        }

        if (embeds.length === 0) return Response.json({ message: 'No scores to post' });

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