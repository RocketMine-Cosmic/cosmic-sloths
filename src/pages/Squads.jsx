import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Users, Search, Plus, MessageSquare, Shield, Send, ArrowLeft, Gift } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import { SaveManager } from '../game/SaveManager';
import { useToast } from "@/components/ui/use-toast";
import moment from 'moment';

const WEEKLY_KILLS_TARGET = 10000;
const REWARD_GOLD = 2500;
const REWARD_REROLLS = 5;
const MAX_SQUAD_MEMBERS = 5;

export default function Squads({ isCarousel }) {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [user, setUser] = useState(null);
    const [myMemberRecord, setMyMemberRecord] = useState(null);
    const [mySquad, setMySquad] = useState(null);
    
    // States for No Squad
    const [allSquads, setAllSquads] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newSquadName, setNewSquadName] = useState('');
    const [newSquadTag, setNewSquadTag] = useState('');
    const [newSquadDesc, setNewSquadDesc] = useState('');

    // States for In Squad
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'members'
    const [squadMembers, setSquadMembers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef(null);

    const getCurrentWeek = () => moment().format('YYYY-[W]ww');

    useEffect(() => {
        const loadUserAndSquad = async () => {
            try {
                const me = await base44.auth.me();
                setUser(me);
                if (me) {
                    const memberships = await base44.entities.SquadMember.filter({ user_id: me.id });
                    if (memberships.length > 0) {
                        const member = memberships[0];
                        setMyMemberRecord(member);
                        
                        const squad = await base44.entities.Squad.get(member.squad_id);
                        
                        // Check weekly reset
                        const currentWeek = getCurrentWeek();
                        if (squad.current_week !== currentWeek) {
                            const updatedSquad = await base44.entities.Squad.update(squad.id, {
                                current_week: currentWeek,
                                weekly_kills: 0
                            });
                            setMySquad(updatedSquad);
                        } else {
                            setMySquad(squad);
                        }
                    } else {
                        // Load all squads
                        const squads = await base44.entities.Squad.list('-created_date', 50);
                        setAllSquads(squads);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        loadUserAndSquad();
    }, []);

    useEffect(() => {
        if (mySquad) {
            const loadMembersAndMessages = async () => {
                const members = await base44.entities.SquadMember.filter({ squad_id: mySquad.id });
                setSquadMembers(members);
                
                const msgs = await base44.entities.SquadMessage.filter({ squad_id: mySquad.id }, '-created_date', 50);
                setMessages(msgs.reverse());
            };
            loadMembersAndMessages();
            
            // Subscriptions
            const unsubMessages = base44.entities.SquadMessage.subscribe((event) => {
                if (event.type === 'create' && event.data.squad_id === mySquad.id) {
                    setMessages(prev => [...prev, event.data]);
                }
            });
            const unsubSquad = base44.entities.Squad.subscribe((event) => {
                if (event.type === 'update' && event.id === mySquad.id) {
                    setMySquad(event.data);
                }
            });
            return () => { unsubMessages(); unsubSquad(); };
        }
    }, [mySquad]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeTab]);

    const handleCreateSquad = async (e) => {
        e.preventDefault();
        if (!newSquadName || !newSquadTag || !user) return;
        
        try {
            SoundManager.playUIClick();
            const squad = await base44.entities.Squad.create({
                name: newSquadName,
                tag: newSquadTag.toUpperCase().substring(0, 4),
                description: newSquadDesc,
                owner_id: user.id,
                weekly_kills: 0,
                current_week: getCurrentWeek(),
                member_count: 1
            });
            
            const member = await base44.entities.SquadMember.create({
                squad_id: squad.id,
                user_id: user.id,
                player_name: user.full_name,
                role: 'leader',
                last_payout_week: ''
            });
            
            setMySquad(squad);
            setMyMemberRecord(member);
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to create squad. Name might be taken." });
        }
    };

    const handleJoinSquad = async (squadId) => {
        if (!user) return;
        try {
            SoundManager.playUIClick();
            const currentSquad = await base44.entities.Squad.get(squadId);
            if ((currentSquad.member_count || 0) >= MAX_SQUAD_MEMBERS) {
                toast({ title: "Squad Full", description: "This squad has reached the maximum number of members." });
                return;
            }

            const member = await base44.entities.SquadMember.create({
                squad_id: squadId,
                user_id: user.id,
                player_name: user.full_name,
                role: 'member',
                last_payout_week: ''
            });
            
            await base44.entities.SquadMessage.create({
                squad_id: squadId,
                user_id: 'system',
                player_name: 'SYSTEM',
                content: `${user.full_name} has joined the squad!`
            });
            
            const updatedSquad = await base44.entities.Squad.update(squadId, {
                member_count: (currentSquad.member_count || 0) + 1
            });
            setMyMemberRecord(member);
            setMySquad(updatedSquad);
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to join squad." });
        }
    };

    const handleLeaveSquad = async () => {
        if (!myMemberRecord) return;
        try {
            SoundManager.playUIClick();
            await base44.entities.SquadMember.delete(myMemberRecord.id);
            
            await base44.entities.SquadMessage.create({
                squad_id: mySquad.id,
                user_id: 'system',
                player_name: 'SYSTEM',
                content: `${user.full_name} has left the squad.`
            });
            
            await base44.entities.Squad.update(mySquad.id, {
                member_count: Math.max(0, (mySquad.member_count || 1) - 1)
            });

            setMyMemberRecord(null);
            setMySquad(null);
            const squads = await base44.entities.Squad.list('-created_date', 50);
            setAllSquads(squads);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !mySquad || !user) return;
        
        const content = newMessage.trim();
        setNewMessage('');
        
        try {
            SoundManager.playUIClick();
            await base44.entities.SquadMessage.create({
                squad_id: mySquad.id,
                user_id: user.id,
                player_name: user.full_name,
                content: content
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleClaimWeekly = async () => {
        if (!mySquad || !myMemberRecord) return;
        const currentWeek = getCurrentWeek();
        
        if (mySquad.weekly_kills >= WEEKLY_KILLS_TARGET && myMemberRecord.last_payout_week !== currentWeek) {
            try {
                SoundManager.playLevelUp();
                
                // Update local save
                const currentSave = SaveManager.load();
                currentSave.gold += REWARD_GOLD;
                currentSave.rerollTokens = (currentSave.rerollTokens || 0) + REWARD_REROLLS;
                SaveManager.save(currentSave);
                
                // Update member record
                const updatedMember = await base44.entities.SquadMember.update(myMemberRecord.id, {
                    last_payout_week: currentWeek
                });
                setMyMemberRecord(updatedMember);
                
                toast({
                    title: "Weekly Bounty Claimed!",
                    description: `You received ${REWARD_GOLD} Gold and ${REWARD_REROLLS} Reroll Tokens!`,
                });
            } catch (e) {
                console.error(e);
            }
        }
    };

    if (!user) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} bg-slate-950 text-slate-200 p-2 pb-20 md:p-6 font-mono`}>
            <div className="max-w-5xl mx-auto h-full flex flex-col">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 md:mb-6 border-b border-slate-800 pb-2 md:pb-4 shrink-0">
                    <div>
                        {!isCarousel && (
                            <button 
                                onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                                className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                            >
                                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Main Menu
                            </button>
                        )}
                        <h1 className="text-2xl md:text-3xl font-bold text-orange-400 tracking-tight flex items-center gap-2">
                            <Users className="w-6 h-6 md:w-8 md:h-8" /> SLOTH SQUADS
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs">Team up, slay together, earn rewards.</p>
                    </div>
                </header>

                {!mySquad ? (
                    // --- NO SQUAD VIEW ---
                    <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
                        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-4 shrink-0">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Search className="w-5 h-5 text-cyan-400" /> Find a Squad
                                </h2>
                                <button 
                                    onClick={() => setIsCreating(!isCreating)}
                                    className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Create Squad
                                </button>
                            </div>
                            
                            {isCreating ? (
                                <form onSubmit={handleCreateSquad} className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4 shrink-0">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Squad Name</label>
                                        <input 
                                            required maxLength={20}
                                            value={newSquadName} onChange={e => setNewSquadName(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-orange-500"
                                            placeholder="e.g. Astro Sloths"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Tag (Max 4 chars)</label>
                                        <input 
                                            required maxLength={4}
                                            value={newSquadTag} onChange={e => setNewSquadTag(e.target.value.toUpperCase())}
                                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-orange-500 uppercase"
                                            placeholder="ASTR"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
                                        <input 
                                            maxLength={50}
                                            value={newSquadDesc} onChange={e => setNewSquadDesc(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-orange-500"
                                            placeholder="Chill vibes only"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-2 rounded font-bold transition-colors">
                                            Create
                                        </button>
                                        <button type="button" onClick={() => setIsCreating(false)} className="px-4 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded font-bold transition-colors">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                    {allSquads.length === 0 ? (
                                        <div className="text-center text-slate-500 py-8">No squads found. Be the first to create one!</div>
                                    ) : (
                                        allSquads.map(squad => (
                                            <div key={squad.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white text-lg">{squad.name}</span>
                                                        <span className="bg-slate-900 px-1.5 py-0.5 rounded text-xs text-orange-400 border border-orange-900">
                                                            [{squad.tag}]
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-1">{squad.description || 'No description'}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        <Users className="w-3 h-3 inline mr-1" />
                                                        {squad.member_count || 1}/{MAX_SQUAD_MEMBERS} Members
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleJoinSquad(squad.id)}
                                                    disabled={(squad.member_count || 0) >= MAX_SQUAD_MEMBERS}
                                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                                                        (squad.member_count || 0) >= MAX_SQUAD_MEMBERS
                                                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                                    }`}
                                                >
                                                    {(squad.member_count || 0) >= MAX_SQUAD_MEMBERS ? 'Full' : 'Join'}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // --- IN SQUAD VIEW ---
                    <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
                        {/* LEFT PANEL: INFO & BOUNTY */}
                        <div className="w-full md:w-80 flex flex-col gap-4 shrink-0">
                            <div className="bg-slate-900 border border-orange-500/50 rounded-xl p-4 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{mySquad.name}</h2>
                                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-xs text-orange-400 border border-orange-900">
                                            [{mySquad.tag}]
                                        </span>
                                    </div>
                                    <button 
                                        onClick={handleLeaveSquad}
                                        className="text-xs text-red-400 hover:text-red-300 bg-red-950/30 px-2 py-1 rounded border border-red-900/50"
                                    >
                                        Leave
                                    </button>
                                </div>
                                <p className="text-sm text-slate-400 mb-4">{mySquad.description}</p>
                                
                                <div className="border-t border-slate-800 pt-4">
                                    <h3 className="text-sm font-bold text-yellow-400 mb-2 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Weekly Squad Bounty
                                    </h3>
                                    <div className="text-xs text-slate-300 mb-2">
                                        Defeat {WEEKLY_KILLS_TARGET.toLocaleString()} enemies together this week.
                                    </div>
                                    
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-slate-400">Progress</span>
                                        <span className="text-white">
                                            {Math.min(mySquad.weekly_kills || 0, WEEKLY_KILLS_TARGET).toLocaleString()} / {WEEKLY_KILLS_TARGET.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700 mb-3">
                                        <div 
                                            className="bg-gradient-to-r from-orange-600 to-yellow-400 h-full transition-all duration-500" 
                                            style={{ width: `${Math.min(100, ((mySquad.weekly_kills || 0) / WEEKLY_KILLS_TARGET) * 100)}%` }}
                                        />
                                    </div>
                                    
                                    {(() => {
                                        const isComplete = (mySquad.weekly_kills || 0) >= WEEKLY_KILLS_TARGET;
                                        const isClaimed = myMemberRecord?.last_payout_week === getCurrentWeek();
                                        
                                        if (isComplete && !isClaimed) {
                                            return (
                                                <button
                                                    onClick={handleClaimWeekly}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                                                >
                                                    <Gift className="w-4 h-4" /> CLAIM WEEKLY PAYOUT
                                                </button>
                                            );
                                        } else if (isClaimed) {
                                            return (
                                                <div className="text-center text-xs font-bold text-emerald-500 bg-emerald-950/30 py-2 rounded-lg border border-emerald-900/50">
                                                    ✓ PAYOUT CLAIMED FOR THIS WEEK
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT PANEL: CHAT & MEMBERS */}
                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden min-h-[400px]">
                            <div className="flex border-b border-slate-800 shrink-0">
                                <button 
                                    onClick={() => setActiveTab('chat')}
                                    className={`flex-1 py-3 font-bold text-sm flex justify-center items-center gap-2 ${activeTab === 'chat' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800/30'}`}
                                >
                                    <MessageSquare className="w-4 h-4" /> Squad Chat
                                </button>
                                <button 
                                    onClick={() => setActiveTab('members')}
                                    className={`flex-1 py-3 font-bold text-sm flex justify-center items-center gap-2 ${activeTab === 'members' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800/30'}`}
                                >
                                    <Users className="w-4 h-4" /> Members ({squadMembers.length}/{MAX_SQUAD_MEMBERS})
                                </button>
                            </div>
                            
                            {activeTab === 'chat' ? (
                                <>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {messages.length === 0 ? (
                                            <div className="text-center text-slate-500 mt-10">No messages yet. Say hi!</div>
                                        ) : (
                                            messages.map(msg => (
                                                <div key={msg.id} className={`flex flex-col ${msg.user_id === user.id ? 'items-end' : 'items-start'}`}>
                                                    {msg.user_id === 'system' ? (
                                                        <div className="w-full text-center text-xs text-slate-500 my-2 italic">
                                                            {msg.content}
                                                        </div>
                                                    ) : (
                                                        <div className={`max-w-[80%] rounded-lg p-2 md:p-3 ${
                                                            msg.user_id === user.id 
                                                                ? 'bg-cyan-900/50 text-white border border-cyan-800' 
                                                                : 'bg-slate-800 text-slate-200 border border-slate-700'
                                                        }`}>
                                                            <div className="text-[10px] font-bold opacity-50 mb-0.5">
                                                                {msg.player_name}
                                                            </div>
                                                            <div className="text-sm md:text-base break-words">
                                                                {msg.content}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>
                                    <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900 shrink-0 flex gap-2">
                                        <input 
                                            type="text"
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
                                            maxLength={200}
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {squadMembers.map(member => (
                                        <div key={member.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-400">
                                                    {member.player_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white flex items-center gap-2">
                                                        {member.player_name}
                                                        {member.user_id === user.id && <span className="text-[10px] bg-cyan-900 text-cyan-400 px-1.5 rounded">YOU</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-400 capitalize">{member.role}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}