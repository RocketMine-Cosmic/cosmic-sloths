import sys
p=sys.argv[1]; s=open(p).read()
def rep(a,b):
    global s
    assert s.count(a)==1,(a[:70],s.count(a)); s=s.replace(a,b)
# helper
rep("async function getCallerMember(base44, walletAddress, squadId) {\n",
'''// Case-insensitive membership lookup (2026-10-21, K-A5). SquadMember rows were
// written with mixed-case wallets by older join paths, so an exact-match filter
// can miss a real member. Reads the squad's rows and compares lowercased.
async function getCallerMemberCI(base44, walletAddress, squadId) {
    if (!walletAddress || !squadId) return null;
    const me = String(walletAddress).toLowerCase();
    const rows = await with429Retry(() => base44.asServiceRole.entities.SquadMember.filter({ squad_id: squadId }), 'member.ci');
    return rows.find(r => String(r.wallet_address || '').toLowerCase() === me) || null;
}

async function getCallerMember(base44, walletAddress, squadId) {
''')
# leave
rep('''            if (!memberId || !squadId) return Response.json({ error: 'Couldn\\'t leave the squad — please refresh and try again.' }, { status: 400 });

            await base44.asServiceRole.entities.SquadMember.delete(memberId);
''','''            if (!memberId || !squadId) return Response.json({ error: 'Couldn\\'t leave the squad — please refresh and try again.' }, { status: 400 });

            // 2026-10-21 (K-A5): this used to delete WHATEVER member id it was sent —
            // anyone could remove anyone from any squad (member ids are publicly
            // readable). Now the row must be the caller's own, in the squad named.
            let leaving = null;
            try { leaving = await with429Retry(() => base44.asServiceRole.entities.SquadMember.get(memberId), 'leave.get'); } catch {}
            if (!leaving || leaving.squad_id !== squadId) {
                return Response.json({ error: 'You\\'re not a member of this squad.' }, { status: 400 });
            }
            if (String(leaving.wallet_address || '').toLowerCase() !== String(walletAddress).toLowerCase()) {
                return Response.json({ error: 'You can only remove yourself. Leaders and officers can use kick.' }, { status: 403 });
            }

            await base44.asServiceRole.entities.SquadMember.delete(memberId);
''')
# kick
rep('''            // Leader OR officer can kick. Officers can't kick the leader or other officers.
            const caller = await getCallerMember(base44, walletAddress, squadId);''','''            // Leader OR officer can kick. Officers can't kick the leader or other officers.
            const caller = await getCallerMemberCI(base44, walletAddress, squadId);''')
rep('''            // Validate target and rank-restriction.
            try {
                const target = await base44.asServiceRole.entities.SquadMember.get(targetMemberId);
                if (target && target.wallet_address === walletAddress) {
                    return Response.json({ error: 'Use "leave squad" to remove yourself.' }, { status: 400 });
                }
                if (target && caller.role === 'officer' && (target.role === 'leader' || target.role === 'officer')) {
                    return Response.json({ error: 'Officers can\\'t kick the leader or other officers.' }, { status: 403 });
                }
            } catch {}
''','''            // Validate target and rank-restriction.
            // 2026-10-21 (K-A5): the target must be in THIS squad. Before, an officer of
            // one squad could kick members of any other squad by passing their own
            // squadId with someone else's member id, and a failed lookup was ignored.
            let target = null;
            try { target = await with429Retry(() => base44.asServiceRole.entities.SquadMember.get(targetMemberId), 'kick.get'); } catch {}
            if (!target || target.squad_id !== squadId) {
                return Response.json({ error: 'That pilot isn\\'t in your squad.' }, { status: 400 });
            }
            if (String(target.wallet_address || '').toLowerCase() === String(walletAddress).toLowerCase()) {
                return Response.json({ error: 'Use "leave squad" to remove yourself.' }, { status: 400 });
            }
            if (caller.role === 'officer' && (target.role === 'leader' || target.role === 'officer')) {
                return Response.json({ error: 'Officers can\\'t kick the leader or other officers.' }, { status: 403 });
            }
''')
# sendMessage
rep('''            if (!squadId || !content) return Response.json({ error: 'Couldn\\'t send your message — please try again.' }, { status: 400 });
''','''            if (!squadId || !content) return Response.json({ error: 'Couldn\\'t send your message — please try again.' }, { status: 400 });

            // 2026-10-21 (K-A5): only members may post in a squad's chat. Before, anyone
            // signed in could post into any squad by sending its id.
            if (!(await getCallerMemberCI(base44, walletAddress, squadId))) {
                return Response.json({ error: 'You\\'re not a member of this squad.' }, { status: 403 });
            }
''')
open(p,'w').write(s); print('ok')
