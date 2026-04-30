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
                description: `**Week ${week_id}** — Top ${weeklyUnique.length} Pilots\n⏳ ${formatCountdown(weeklyClose)}\n\n${buildRows(weeklyUnique)}\n\n**Unlock Characters:**\n🔫 Reach kill milestones (2k/5k/10k/20k) for permanent unlocks\n💎 Own an NFT? Instant unlock + rarity-based per-run bonuses (+5% to +15% Gold & Relic Fragments)\n\n**Earn OMENX** by ranking in the top 30!`,
                color: 0x0CA7B8,
                timestamp: new Date().toISOString(),
            });
        }

        if (seasonalUnique.length > 0) {
            const seasonalClose = getSeasonalCloseDate(season_id);
            embeds.push({
                title: '🗓️ Seasonal Leaderboard — Cosmic Sloths',
                description: `**Season ${season_id}** — Top ${seasonalUnique.length} Pilots\n⏳ ${formatCountdown(seasonalClose)}\n\n${buildRows(seasonalUnique)}\n\n**Unlock Characters:**\n🔫 Reach kill milestones (2k/5k/10k/20k) for permanent unlocks\n💎 Own an NFT? Instant unlock + rarity-based per-run bonuses (+5% to +15% Gold & Relic Fragments)\n\n**Earn OMENX** by ranking in the top 40!`,
                color: 0xD946EF,
                footer: { text: 'Cosmic Sloths · NFTs unlock characters instantly + boost runs' },
                timestamp: new Date().toISOString(),
            });

            // Champions Pool embed — live snapshot of seasonal squad standings
            try {
                const pools = await base44.asServiceRole.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' });
                const totalSpent = pools.length > 0 ? (pools[0].total_spent || 0) : 0;
                const championsPool = Math.floor(totalSpent * 0.05);

                // Aggregate this season's squad war stats (4 weeks)
                const m = /^(\d{4})-S(\d+)$/.exec(season_id);
                const weekIds = [];
                if (m) {
                    const yr = parseInt(m[1], 10);
                    const sNum = parseInt(m[2], 10);
                    const startWk = (sNum - 1) * 4 + 1;
                    for (let i = 0; i < 4; i++) weekIds.push(`${yr}-W${String(startWk + i).padStart(2, '0')}`);
                }
                const allWars = [];
                for (const wid of weekIds) {
                    const wars = await base44.asServiceRole.entities.SquadWar.filter({ week_id: wid });
                    allWars.push(...wars);
                }
                const bySquad = new Map();
                const ensure = (id, name, tag, icon) => {
                    if (!id) return null;
                    if (!bySquad.has(id)) bySquad.set(id, { squad_id: id, name: name || '', tag: tag || '', icon: icon || '🛡️', wins: 0, ties: 0, byes: 0, kills: 0, wars_fought: 0 });
                    return bySquad.get(id);
                };
                for (const w of allWars) {
                    const a = ensure(w.squad_a_id, w.squad_a_name, w.squad_a_tag, w.squad_a_icon);
                    const b = w.squad_b_id ? ensure(w.squad_b_id, w.squad_b_name, w.squad_b_tag, w.squad_b_icon) : null;
                    if (a) { a.wars_fought++; a.kills += Number(w.kills_a || 0); }
                    if (b) { b.wars_fought++; b.kills += Number(w.kills_b || 0); }
                    if (!w.is_resolved) continue;
                    if (w.result_kind === 'bye' && a) a.byes++;
                    else if (w.result_kind === 'tie') { if (a) a.ties++; if (b) b.ties++; }
                    else if (w.result_kind === 'win_a') { if (a) a.wins++; }
                    else if (w.result_kind === 'win_b') { if (b) b.wins++; }
                }
                const ranked = Array.from(bySquad.values())
                    .map(s => ({ ...s, points: s.wins * 3 + s.ties + s.byes, eligible: s.wars_fought >= 2 }))
                    .filter(s => s.eligible)
                    .sort((a, b) => b.points - a.points || b.kills - a.kills || b.wars_fought - a.wars_fought)
                    .slice(0, 3);

                const shares = ranked.length === 1 ? [1.0] : ranked.length === 2 ? [0.65, 0.35] : [0.5, 0.3, 0.2];
                const medals = ['🥇', '🥈', '🥉'];
                const rows = ranked.length > 0
                    ? ranked.map((s, i) => {
                        const share = Math.floor(championsPool * shares[i]);
                        return `${medals[i]} ${s.icon} **${s.name}** [${s.tag}] — ${s.points} pts · ${s.kills.toLocaleString()} kills — projected **${share.toLocaleString()} OMENX**`;
                    }).join('\n')
                    : '_No eligible squads yet — fight ≥ 2 wars + ≥ 2 members to qualify._';

                embeds.push({
                    title: '👑 Squad Wars Champions Pool',
                    description: `**Season ${season_id}** · 5% of the seasonal OMENX pool reserved for top 3 squads\n💰 Current pool: **${championsPool.toLocaleString()} OMENX** (split 🥇 50% / 🥈 30% / 🥉 20%)\n⏳ ${formatCountdown(seasonalClose)}\n\n${rows}\n\n*Each squad's share is split equally among current members. Distributed automatically at season end. Projected = estimate based on current pool.*`,
                    color: 0xF59E0B,
                    footer: { text: 'Eligibility: ≥ 2 wars fought + ≥ 2 members at season end' },
                    timestamp: new Date().toISOString(),
                });
            } catch (e) {
                console.warn('[postDiscordLeaderboard] Champions Pool embed failed:', e.message);
            }
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

        // Also post NFT unlock info to a separate notification (optional)
        const nftNotifyUrl = Deno.env.get('DISCORD_NFT_NOTIFY_WEBHOOK');
        if (nftNotifyUrl && weeklyUnique.length > 0) {
            const nftEmbed = {
                title: '💎 NFT Character Unlock System',
                description: '**Instant Unlock + Per-Run Bonuses:**\n\n🔹 Own an OmenX NFT? Instantly unlock the character + earn rarity-based Gold & Fragment bonuses every run (for that character)!\n🔹 **Sell your NFT?** Character is removed from your roster, but kill mastery is preserved for when you re-acquire it.\n\n**Rarity Bonuses (Per Run):**\n⬜ Common: +5% Gold, +5% Fragments\n🟢 Uncommon: +7% Gold, +8% Fragments\n🔵 Rare: +10% Gold, +10% Fragments\n🟣 Epic: +12% Gold, +13% Fragments\n🟡 Legendary: +15% Gold, +15% Fragments\n\n**Alternative Path:** Reach cumulative kill milestones (2k/5k/10k/20k) to permanently unlock characters.',
                color: 0x9333EA,
                footer: { text: '💎 NFTs enhance progression but are not required' },
                timestamp: new Date().toISOString(),
            };
            
            try {
                await fetch(nftNotifyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ embeds: [nftEmbed] }),
                });
            } catch (e) {
                console.warn('[postDiscordLeaderboard] NFT notify failed:', e.message);
            }
        }

        return Response.json({ success: true, week_id, season_id, posted: { weekly: weeklyUnique.length, seasonal: seasonalUnique.length } });
    } catch (error) {
        console.error('[postDiscordLeaderboard]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});