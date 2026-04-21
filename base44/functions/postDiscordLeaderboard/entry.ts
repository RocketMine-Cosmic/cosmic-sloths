import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getCurrentWeekId() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${year}-W${String(isoWeek).padStart(2, '0')}`;
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

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const webhookUrl = Deno.env.get('DISCORD_LEADERBOARD_WEBHOOK');
        if (!webhookUrl) {
            return Response.json({ error: 'Discord webhook not configured' }, { status: 500 });
        }

        // Allow optional week_id override via payload
        let body = {};
        try { body = await req.json(); } catch {}
        const week_id = body.week_id || getCurrentWeekId();

        // Fetch top 30 scores for the week
        const scores = await base44.asServiceRole.entities.RunScore.filter({ week_id }, '-score', 300);

        // Deduplicate by wallet_address
        const seen = new Set();
        const unique = [];
        for (const s of scores) {
            const key = s.wallet_address || s.user_id;
            if (!key || seen.has(key)) continue;
            seen.add(key);
            unique.push(s);
            if (unique.length >= 10) break; // Show top 10 in Discord
        }

        if (unique.length === 0) {
            return Response.json({ message: 'No scores to post' });
        }

        // Build leaderboard rows
        const rows = unique.map((s, i) => {
            const rank = i + 1;
            const icon = getPilotIcon(s);
            const name = s.player_name || 'Unknown';
            const title = s.player_title ? ` *${s.player_title}*` : '';
            const score = s.score?.toLocaleString() || '0';
            const kills = s.kills ? ` · ${s.kills.toLocaleString()} kills` : '';
            return `${getRankEmoji(rank)} ${icon} **${name}**${title} — ${score} pts${kills}`;
        }).join('\n');

        const embed = {
            title: '🏆 Weekly Leaderboard',
            description: `**Week ${week_id}** — Top ${unique.length} Pilots\n\n${rows}`,
            color: 0x0CA7B8,
            footer: { text: 'Sloths in Space · Compete for OMENX rewards' },
            timestamp: new Date().toISOString(),
        };

        const discordRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] }),
        });

        if (!discordRes.ok) {
            const err = await discordRes.text();
            throw new Error(`Discord error ${discordRes.status}: ${err}`);
        }

        return Response.json({ success: true, week_id, posted: unique.length });
    } catch (error) {
        console.error('[postDiscordLeaderboard]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});