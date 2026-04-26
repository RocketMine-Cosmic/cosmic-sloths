import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session → linked wallet → AdminWallet lookup.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const callerWallet = me.wallet_address?.toLowerCase();
        if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
        const adminWallets = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: callerWallet });
        if (adminWallets.length === 0) return Response.json({ error: 'Forbidden' }, { status: 403 });

        const { type, query, period, squadId } = await req.json();

        if (type === 'overview') {
            const [scores, saves] = await Promise.all([
                base44.asServiceRole.entities.RunScore.list('-created_date', 1000),
                base44.asServiceRole.entities.PlayerSave.list('-updated_at', 500),
            ]);

            const totalPlayers = saves.length;
            const totalScores = scores.length;

            const charCounts = {};
            scores.forEach(s => {
                if (s.character_id) {
                    charCounts[s.character_id] = (charCounts[s.character_id] || 0) + 1;
                }
            });
            const topCharacters = Object.entries(charCounts)
                .map(([character_id, count]) => ({ character_id, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 8);

            return Response.json({ totalPlayers, totalScores, topCharacters });
        }

        if (type === 'scores') {
            let allScores = await base44.asServiceRole.entities.RunScore.list('-score', 200);
            if (period === 'weekly') {
                const now = new Date();
                const year = now.getUTCFullYear();
                const startOfYear = new Date(Date.UTC(year, 0, 1));
                const startOfWeek = new Date(startOfYear);
                startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
                const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
                const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;
                allScores = allScores.filter(s => s.week_id === week_id);
            } else if (period === 'seasonal') {
                const now = new Date();
                const year = now.getUTCFullYear();
                const startOfYear = new Date(Date.UTC(year, 0, 1));
                const startOfWeek = new Date(startOfYear);
                startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
                const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
                const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
                const season_id = `${year}-S${seasonNum}`;
                allScores = allScores.filter(s => s.season_id === season_id);
            }
            return Response.json({ scores: allScores.slice(0, 200) });
        }

        if (type === 'playerSearch') {
            const saves = await base44.asServiceRole.entities.PlayerSave.list('-updated_at', 500);
            if (!query) {
                return Response.json({ players: saves.slice(0, 30) });
            }
            const q = query.toLowerCase();
            const matched = saves.filter(s =>
                s.wallet_address?.toLowerCase().includes(q) ||
                s.save_data?.player_name?.toLowerCase().includes(q)
            ).slice(0, 30);
            return Response.json({ players: matched });
        }

        if (type === 'squads') {
            const squads = await base44.asServiceRole.entities.Squad.list('-weekly_kills', 200);
            return Response.json({ squads });
        }

        if (type === 'squadMembers') {
            if (!squadId) return Response.json({ members: [] });
            const members = await base44.asServiceRole.entities.SquadMember.filter({ squad_id: squadId });
            return Response.json({ members });
        }

        if (type === 'raid') {
            const now = new Date();
            const year = now.getUTCFullYear();
            const startOfYear = new Date(Date.UTC(year, 0, 1));
            const startOfWeek = new Date(startOfYear);
            startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
            const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
            const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;

            const [bosses, contributions] = await Promise.all([
                base44.asServiceRole.entities.GlobalBoss.filter({ week_id }),
                base44.asServiceRole.entities.GlobalBossContribution.filter({ week_id }),
            ]);

            const boss = bosses.length > 0 ? bosses[0] : null;
            return Response.json({ boss, contributions });
        }

        return Response.json({ error: 'Unknown type' }, { status: 400 });
    } catch (error) {
        console.error('[getAdminDataExtended]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});