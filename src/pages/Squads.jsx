import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Users, Search, Plus, MessageSquare, Shield, Send, ArrowLeft, Gift, Settings, Crown, UserX, Coins, Puzzle } from 'lucide-react';
import EmojiPicker, { SQUAD_ICONS } from '../components/game/EmojiPicker';
import { SoundManager } from '../game/SoundManager';
import { SaveManager } from '../game/SaveManager';
import { useToast } from "@/components/ui/use-toast";
import moment from 'moment';
import { getSquadLevel, getNextSquadLevel, getSquadXpProgress } from '../game/SquadLevels';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';

const MAX_SQUAD_MEMBERS = 5;

// Bounty tiers scale with squad level
const BOUNTY_TIERS = [
    { minLevel: 1, target: 2000,  gold: 500,   fragments: 1, label: 'Rookie Bounty' },
    { minLevel: 2, target: 5000,  gold: 1200,  fragments: 2, label: 'Drifter Bounty' },
    { minLevel: 3, target: 10000, gold: 2500,  fragments: 3, label: 'Hunter Bounty' },
    { minLevel: 4, target: 18000, gold: 4000,  fragments: 4, label: 'Vanguard Bounty' },
    { minLevel: 5, target: 30000, gold: 6500,  fragments: 5, label: 'Reaper Bounty' },
    { minLevel: 6, target: 50000, gold: 10000, fragments: 7, label: 'Legend Bounty' },
    { minLevel: 7, target: 75000, gold: 15000, fragments: 10, label: 'Cosmic Bounty' },
];

const DAILY_BOUNTY_TIERS = [
    { minLevel: 1, target: 300,  gold: 150,   fragments: 0, label: 'Daily Patrol' },
    { minLevel: 2, target: 800,  gold: 300,   fragments: 0, label: 'Daily Sweep' },
    { minLevel: 3, target: 1500, gold: 600,   fragments: 1, label: 'Daily Hunt' },
    { minLevel: 4, target: 2500, gold: 1000,  fragments: 1, label: 'Daily Purge' },
    { minLevel: 5, target: 4500, gold: 1500,  fragments: 2, label: 'Daily Assault' },
    { minLevel: 6, target: 7500, gold: 2500,  fragments: 2, label: 'Daily Crusade' },
    { minLevel: 7, target: 12000, gold: 4000, fragments: 3, label: 'Daily Annihilation' },
];

function getBountyTier(level) {
    let tier = BOUNTY_TIERS[0];
    for (const t of BOUNTY_TIERS) {
        if (level >= t.minLevel) tier = t;
    }
    return tier;
}

function getDailyBountyTier(level) {
    let tier = DAILY_BOUNTY_TIERS[0];
    for (const t of DAILY_BOUNTY_TIERS) {
        if (level >= t.minLevel) tier = t;
    }
    return tier;
}

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
    const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'members', or 'settings'
    const [squadMembers, setSquadMembers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef(null);

    // Settings edit state
    const [editName, setEditName] = useState('');
    const [editTag, setEditTag] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editIcon, setEditIcon] = useState('🛡️');
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [showSquadIconPicker, setShowSquadIconPicker] = useState(false);

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
                        const currentDay = moment().format('YYYY-MM-DD');
                        let needsUpdate = false;
                        const updateData = {};
                        let updatedSquad = squad;

                        if (squad.current_week !== currentWeek) {
                            // Award XP from last week's kills before resetting
                            const earnedXp = squad.weekly_kills || 0;
                            const newXp = (squad.xp || 0) + earnedXp;
                            const newLevelData = getSquadLevel(newXp);
                            updateData.current_week = currentWeek;
                            updateData.weekly_kills = 0;
                            updateData.xp = newXp;
                            updateData.level = newLevelData.level;
                            needsUpdate = true;
                        }
                        
                        if (squad.current_day !== currentDay) {
                            updateData.current_day = currentDay;
                            updateData.daily_kills = 0;
                            needsUpdate = true;
                        }

                        if (needsUpdate) {
                            updatedSquad = await base44.entities.Squad.update(squad.id, updateData);
                        }
                        
                        setMySquad(updatedSquad);
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
            setEditName(mySquad.name || '');
            setEditTag(mySquad.tag || '');
            setEditDesc(mySquad.description || '');
            setEditIcon(mySquad.icon || '🛡️');
        }
    }, [mySquad]);

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
                    setMessages(prev => {
                        // If this message is already in the list (e.g. from optimistic update), skip
                        if (prev.some(m => m.id === event.data.id)) return prev;
                        // Replace any optimistic message from the same user with same content
                        const hasOptimistic = prev.some(m => m.id?.startsWith('optimistic-') && m.content === event.data.content && m.user_id === event.data.user_id);
                        if (hasOptimistic) {
                            return prev.map(m => (m.id?.startsWith('optimistic-') && m.content === event.data.content && m.user_id === event.data.user_id) ? event.data : m);
                        }
                        return [...prev, event.data];
                    });
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
        if (chatEndRef.current) {
            const container = chatEndRef.current.parentElement;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [messages, activeTab]);

    const handleCreateSquad = async (e) => {
        e.preventDefault();
        if (!newSquadName || !newSquadTag || !user) return;
        
        try {
            SoundManager.playUIClick();
            
            const currentSave = SaveManager.load();
            if (currentSave.lastSquadLeaveTime && Date.now() - currentSave.lastSquadLeaveTime < 24 * 60 * 60 * 1000) {
                const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - currentSave.lastSquadLeaveTime)) / (60 * 60 * 1000));
                toast({ title: "Cooldown Active", description: `You must wait ${hoursLeft} hours after leaving a squad before creating a new one.` });
                return;
            }

            const squad = await base44.entities.Squad.create({
                name: newSquadName,
                tag: newSquadTag.toUpperCase().substring(0, 4),
                description: newSquadDesc,
                owner_id: user.id,
                weekly_kills: 0,
                current_week: getCurrentWeek(),
                daily_kills: 0,
                current_day: moment().format('YYYY-MM-DD'),
                member_count: 1,
                xp: 0,
                level: 1
            });
            
            const displayName = user.data?.player_name || user.player_name || user.data?.full_name || user.full_name || 'A new pilot';
            const member = await base44.entities.SquadMember.create({
                squad_id: squad.id,
                user_id: user.id,
                player_name: displayName,
                player_title: user.data?.player_title || '',
                role: 'leader',
                last_payout_week: '',
                last_daily_payout_date: ''
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
            
            const currentSave = SaveManager.load();
            if (currentSave.lastSquadLeaveTime && Date.now() - currentSave.lastSquadLeaveTime < 24 * 60 * 60 * 1000) {
                const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - currentSave.lastSquadLeaveTime)) / (60 * 60 * 1000));
                toast({ title: "Cooldown Active", description: `You must wait ${hoursLeft} hours after leaving a squad before joining a new one.` });
                return;
            }

            const existingMembers = await base44.entities.SquadMember.filter({ user_id: user.id });
            if (existingMembers.length > 0) {
                toast({ title: "Already in a Squad", description: "You are already in a squad." });
                return;
            }

            const currentSquad = await base44.entities.Squad.get(squadId);
            if ((currentSquad.member_count || 0) >= MAX_SQUAD_MEMBERS) {
                toast({ title: "Squad Full", description: "This squad has reached the maximum number of members." });
                return;
            }

            const displayName = user.data?.player_name || user.player_name || user.data?.full_name || user.full_name || 'A new pilot';

            const member = await base44.entities.SquadMember.create({
                squad_id: squadId,
                user_id: user.id,
                player_name: displayName,
                player_title: user.data?.player_title || '',
                role: 'member',
                last_payout_week: '',
                last_daily_payout_date: ''
            });
            
            await base44.entities.SquadMessage.create({
                squad_id: squadId,
                user_id: 'system',
                player_name: 'SYSTEM',
                content: `${displayName} has joined the squad!`
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
            
            const displayName = user.data?.player_name || user.player_name || user.data?.full_name || user.full_name || 'A pilot';

            await base44.entities.SquadMessage.create({
                squad_id: mySquad.id,
                user_id: 'system',
                player_name: 'SYSTEM',
                content: `${displayName} has left the squad.`
            });
            
            await base44.entities.Squad.update(mySquad.id, {
                member_count: Math.max(0, (mySquad.member_count || 1) - 1)
            });

            const currentSave = SaveManager.load();
            currentSave.lastSquadLeaveTime = Date.now();
            SaveManager.save(currentSave);

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
        SoundManager.playUIClick();

        // Optimistically add to local state immediately
        const displayName = user.data?.player_name || user.player_name || user.data?.full_name || user.full_name || 'Pilot';
        const optimisticMsg = {
            id: `optimistic-${Date.now()}`,
            squad_id: mySquad.id,
            user_id: user.id,
            player_name: displayName,
            player_title: user.data?.player_title || '',
            content: content,
            created_date: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);
        
        try {
            const saved = await base44.entities.SquadMessage.create({
                squad_id: mySquad.id,
                user_id: user.id,
                player_name: displayName,
                player_title: user.data?.player_title || '',
                content: content
            });
            // Replace optimistic message with real one
            setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? saved : m));
        } catch (e) {
            console.error('[Squad] Failed to send message:', e);
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        }
    };

    const isLeader = myMemberRecord?.role === 'leader';

    const handleKickMember = async (member) => {
        if (!isLeader || member.user_id === user.id) return;
        try {
            SoundManager.playUIClick();
            await base44.entities.SquadMember.delete(member.id);
            await base44.entities.Squad.update(mySquad.id, {
                member_count: Math.max(0, (mySquad.member_count || 1) - 1)
            });
            await base44.entities.SquadMessage.create({
                squad_id: mySquad.id,
                user_id: 'system',
                player_name: 'SYSTEM',
                content: `${member.player_name} was removed from the squad.`
            });
            setSquadMembers(prev => prev.filter(m => m.id !== member.id));
            toast({ title: "Member Kicked", description: `${member.player_name} has been removed.` });
        } catch (e) {
            console.error(e);
        }
    };

    const handleTransferLeadership = async (member) => {
        if (!isLeader || member.user_id === user.id) return;
        try {
            SoundManager.playUIClick();
            // Demote current leader, promote new leader
            await base44.entities.SquadMember.update(myMemberRecord.id, { role: 'member' });
            await base44.entities.SquadMember.update(member.id, { role: 'leader' });
            await base44.entities.Squad.update(mySquad.id, { owner_id: member.user_id });
            await base44.entities.SquadMessage.create({
                squad_id: mySquad.id,
                user_id: 'system',
                player_name: 'SYSTEM',
                content: `${member.player_name} is now the squad leader!`
            });
            setMyMemberRecord(prev => ({ ...prev, role: 'member' }));
            setSquadMembers(prev => prev.map(m => {
                if (m.id === myMemberRecord.id) return { ...m, role: 'member' };
                if (m.id === member.id) return { ...m, role: 'leader' };
                return m;
            }));
            toast({ title: "Leadership Transferred", description: `${member.player_name} is now the leader.` });
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        if (!editName.trim() || !editTag.trim()) return;
        setIsSavingSettings(true);
        try {
            const updated = await base44.entities.Squad.update(mySquad.id, {
                name: editName.trim(),
                tag: editTag.trim().toUpperCase().substring(0, 4),
                description: editDesc.trim(),
                icon: editIcon
            });
            setMySquad(updated);
            toast({ title: "Settings Saved", description: "Squad info has been updated." });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to save settings." });
        }
        setIsSavingSettings(false);
    };

    const handleClaimWeekly = async () => {
        if (!mySquad || !myMemberRecord) return;
        const currentWeek = getCurrentWeek();
        const tier = getBountyTier(mySquad.level || 1);
        
        if (myMemberRecord.created_date) {
            const joinDate = new Date(myMemberRecord.created_date).getTime();
            if (Date.now() - joinDate < 24 * 60 * 60 * 1000) {
                const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - joinDate)) / (60 * 60 * 1000));
                toast({ title: "New Member Cooldown", description: `You must be in the squad for 24 hours before claiming rewards. (${hoursLeft}h left)` });
                return;
            }
        }

        if ((mySquad.weekly_kills || 0) >= tier.target && myMemberRecord.last_payout_week !== currentWeek) {
            try {
                SoundManager.playLevelUp();
                
                // Update local save
                const currentSave = SaveManager.load();
                currentSave.gold += tier.gold;
                currentSave.relicFragments = (currentSave.relicFragments || 0) + tier.fragments;
                SaveManager.save(currentSave);
                
                // Update member record
                const updatedMember = await base44.entities.SquadMember.update(myMemberRecord.id, {
                    last_payout_week: currentWeek
                });
                setMyMemberRecord(updatedMember);
                
                toast({
                    title: "Weekly Bounty Claimed!",
                    description: `You received ${tier.gold.toLocaleString()} Gold and ${tier.fragments} Relic Fragments!`,
                });
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleClaimDaily = async () => {
        if (!mySquad || !myMemberRecord) return;
        const currentDay = moment().format('YYYY-MM-DD');
        const tier = getDailyBountyTier(mySquad.level || 1);
        
        if (myMemberRecord.created_date) {
            const joinDate = new Date(myMemberRecord.created_date).getTime();
            if (Date.now() - joinDate < 24 * 60 * 60 * 1000) {
                const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - joinDate)) / (60 * 60 * 1000));
                toast({ title: "New Member Cooldown", description: `You must be in the squad for 24 hours before claiming rewards. (${hoursLeft}h left)` });
                return;
            }
        }

        if ((mySquad.daily_kills || 0) >= tier.target && myMemberRecord.last_daily_payout_date !== currentDay) {
            try {
                SoundManager.playGoldPickup();
                
                // Update local save
                const currentSave = SaveManager.load();
                currentSave.gold += tier.gold;
                currentSave.relicFragments = (currentSave.relicFragments || 0) + tier.fragments;
                SaveManager.save(currentSave);
                
                // Update member record
                const updatedMember = await base44.entities.SquadMember.update(myMemberRecord.id, {
                    last_daily_payout_date: currentDay
                });
                setMyMemberRecord(updatedMember);
                
                toast({
                    title: "Daily Bounty Claimed!",
                    description: `You received ${tier.gold.toLocaleString()} Gold${tier.fragments > 0 ? ` and ${tier.fragments} Relic Fragments` : ''}!`,
                });
            } catch (e) {
                console.error(e);
            }
        }
    };

    if (!user) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className={`${isCarousel ? 'h-full flex flex-col' : 'h-[100dvh] flex flex-col'} relative text-slate-200 p-2 pb-2 md:p-6 font-sans overflow-hidden`}>

            <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 md:mb-6 border-b border-slate-800 pb-2 md:pb-4 shrink-0">
                    <div>

                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest flex items-center gap-2" style={{ background: 'linear-gradient(90deg, #F59E0B, #F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.5))' }}>
                            <Users className="w-6 h-6 md:w-8 md:h-8 text-amber-400" /> SLOTH SQUADS
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs tracking-widest uppercase">Team up, slay together, earn rewards.</p>
                    </div>
                    <CurrencyHeader />
                </header>

                {!mySquad ? (
                    // --- NO SQUAD VIEW ---
                    <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
                        <div className="flex-1 bg-[#0b0416]/60 backdrop-blur-xl rounded-xl border border-orange-500/30 p-4 flex flex-col overflow-hidden min-h-0 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
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
                                        allSquads.map(squad => {
                                            const lvl = getSquadLevel(squad.xp || 0);
                                            return (
                                            <div key={squad.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center transition-colors"
                                                style={{ border: `1px solid ${lvl.borderColor}50` }}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg w-6 h-6 inline-flex items-center justify-center overflow-hidden rounded-md shrink-0">
                                                            {(squad.icon || lvl.badge).startsWith('http') ? <img src={squad.icon} className="w-full h-full object-cover" alt="squad" /> : (squad.icon || lvl.badge)}
                                                        </span>
                                                        <span className="font-bold text-white text-lg">{squad.name}</span>
                                                        <span className="px-1.5 py-0.5 rounded text-xs border bg-slate-900"
                                                            style={{ color: lvl.borderColor, borderColor: lvl.borderColor + '60' }}
                                                        >[{squad.tag}]</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                            style={{ color: lvl.borderColor, background: lvl.glowColor }}
                                                        >Lv.{lvl.level} {lvl.name}</span>
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
                                        )})
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // --- IN SQUAD VIEW ---
                    <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 overflow-hidden min-h-0">
                        {/* MOBILE: Compact squad info bar — full LEFT PANEL on desktop */}
                        {(() => {
                            const squadXp = mySquad.xp || 0;
                            const lvlData = getSquadLevel(squadXp);
                            const nextLvl = getNextSquadLevel(squadXp);
                            const xpProgress = getSquadXpProgress(squadXp);
                            const tier = getBountyTier(mySquad.level || 1);
                            const kills = mySquad.weekly_kills || 0;
                            const isComplete = kills >= tier.target;
                            const isClaimed = myMemberRecord?.last_payout_week === getCurrentWeek();
                            
                            const dailyTier = getDailyBountyTier(mySquad.level || 1);
                            const dailyKills = mySquad.daily_kills || 0;
                            const isDailyComplete = dailyKills >= dailyTier.target;
                            const isDailyClaimed = myMemberRecord?.last_daily_payout_date === moment().format('YYYY-MM-DD');
                            return (
                                <>
                                {/* MOBILE compact strip */}
                                <div className="md:hidden bg-[#0b0416]/80 backdrop-blur-xl rounded-xl p-3 shrink-0" style={{ border: `2px solid ${lvlData.borderColor}`, boxShadow: `0 0 20px ${lvlData.glowColor}` }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-xl shrink-0 w-8 h-8 inline-flex items-center justify-center overflow-hidden rounded-md">
                                                {(mySquad.icon || lvlData.badge).startsWith('http') ? <img src={mySquad.icon} className="w-full h-full object-cover" alt="squad" /> : (mySquad.icon || lvlData.badge)}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-white text-sm truncate">{mySquad.name}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded border shrink-0" style={{ color: lvlData.borderColor, borderColor: lvlData.borderColor + '60', background: lvlData.glowColor }}>
                                                        [{mySquad.tag}] Lv.{lvlData.level}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={handleLeaveSquad} className="text-xs text-red-400 bg-red-950/30 px-2 py-1 rounded border border-red-900/50 shrink-0 ml-2">
                                            Leave
                                        </button>
                                    </div>
                                    {/* XP bar */}
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${xpProgress}%`, background: lvlData.borderColor }} />
                                    </div>
                                    {/* Daily Bounty progress row */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="w-3 h-3 text-cyan-400 shrink-0" />
                                        <span className="text-[10px] text-slate-400 flex-1 truncate">{dailyTier.label}: {Math.min(dailyKills, dailyTier.target).toLocaleString()}/{dailyTier.target.toLocaleString()}</span>
                                        <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden shrink-0">
                                            <div className="bg-gradient-to-r from-cyan-600 to-cyan-300 h-full" style={{ width: `${Math.min(100, (dailyKills / dailyTier.target) * 100)}%` }} />
                                        </div>
                                        {isDailyComplete && !isDailyClaimed && (
                                            <button onClick={handleClaimDaily} className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold animate-pulse shrink-0">
                                                CLAIM
                                            </button>
                                        )}
                                        {isDailyClaimed && <span className="text-[10px] text-emerald-500 font-bold shrink-0">✓ Claimed</span>}
                                    </div>
                                    {/* Weekly Bounty progress row */}
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-3 h-3 text-yellow-400 shrink-0" />
                                        <span className="text-[10px] text-slate-400 flex-1 truncate">{tier.label}: {Math.min(kills, tier.target).toLocaleString()}/{tier.target.toLocaleString()}</span>
                                        <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden shrink-0">
                                            <div className="bg-gradient-to-r from-orange-600 to-yellow-400 h-full" style={{ width: `${Math.min(100, (kills / tier.target) * 100)}%` }} />
                                        </div>
                                        {isComplete && !isClaimed && (
                                            <button onClick={handleClaimWeekly} className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold animate-pulse shrink-0">
                                                CLAIM
                                            </button>
                                        )}
                                        {isClaimed && <span className="text-[10px] text-emerald-500 font-bold shrink-0">✓ Claimed</span>}
                                    </div>
                                </div>

                                {/* DESKTOP full left panel */}
                                <div className="hidden md:flex w-80 flex-col gap-4 shrink-0">
                                    <div className="bg-[#0b0416]/80 backdrop-blur-xl rounded-xl p-4" style={{ border: `2px solid ${lvlData.borderColor}`, boxShadow: `0 0 30px ${lvlData.glowColor}` }}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-2xl shrink-0 w-8 h-8 inline-flex items-center justify-center overflow-hidden rounded-md">
                                                        {(mySquad.icon || lvlData.badge).startsWith('http') ? <img src={mySquad.icon} className="w-full h-full object-cover" alt="squad" /> : (mySquad.icon || lvlData.badge)}
                                                    </span>
                                                    <h2 className="text-xl font-bold text-white">{mySquad.name}</h2>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-xs border" style={{ color: lvlData.borderColor, borderColor: lvlData.borderColor + '60' }}>
                                                        [{mySquad.tag}]
                                                    </span>
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: lvlData.borderColor, background: lvlData.glowColor }}>
                                                        Lv.{lvlData.level} {lvlData.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={handleLeaveSquad} className="text-xs text-red-400 hover:text-red-300 bg-red-950/30 px-2 py-1 rounded border border-red-900/50">
                                                Leave
                                            </button>
                                        </div>
                                        <p className="text-sm text-slate-400 mb-3">{mySquad.description}</p>
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span style={{ color: lvlData.borderColor }}>Squad XP</span>
                                                {nextLvl ? (
                                                    <span className="text-slate-400">{squadXp.toLocaleString()} / {nextLvl.xpRequired.toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-yellow-400">MAX LEVEL</span>
                                                )}
                                            </div>
                                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                                                <div className="h-full transition-all duration-700 rounded-full" style={{ width: `${xpProgress}%`, background: `linear-gradient(to right, ${lvlData.borderColor}99, ${lvlData.borderColor})` }} />
                                            </div>
                                            {nextLvl && <div className="text-[10px] text-slate-500 mt-1">Next: {nextLvl.badge} {nextLvl.name} — earned at end of each week</div>}
                                        </div>
                                        <div className="border-t border-slate-800 pt-4 flex flex-col gap-4">
                                            {/* Daily Bounty */}
                                            <div className="bg-slate-900/50 rounded-xl p-3 border border-cyan-900/40">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                                                        <Shield className="w-4 h-4" /> {dailyTier.label} (Daily)
                                                    </h3>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/50 bg-cyan-950/50 text-cyan-300">
                                                        Lv.{mySquad.level || 1}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-300 mb-2">Defeat {dailyTier.target.toLocaleString()} enemies today.</div>
                                                <div className="flex gap-2 mb-3">
                                                    <div className="flex-1 bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700 flex flex-col items-center">
                                                        <Coins className="w-4 h-4 fill-yellow-500 text-yellow-500 mb-1" />
                                                        <div className="text-xs font-bold text-yellow-400">{dailyTier.gold.toLocaleString()} Gold</div>
                                                    </div>
                                                    {dailyTier.fragments > 0 && (
                                                        <div className="flex-1 bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700 flex flex-col items-center">
                                                            <Puzzle className="w-4 h-4 fill-fuchsia-400 text-fuchsia-400 mb-1" />
                                                            <div className="text-xs font-bold text-fuchsia-400">{dailyTier.fragments} Fragments</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                    <span className="text-slate-400">Progress</span>
                                                    <span className="text-white">{Math.min(dailyKills, dailyTier.target).toLocaleString()} / {dailyTier.target.toLocaleString()}</span>
                                                </div>
                                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700 mb-3">
                                                    <div className="bg-gradient-to-r from-cyan-600 to-cyan-300 h-full transition-all duration-500" style={{ width: `${Math.min(100, (dailyKills / dailyTier.target) * 100)}%` }} />
                                                </div>
                                                {isDailyComplete && !isDailyClaimed ? (
                                                    <button onClick={handleClaimDaily} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                                                        <Gift className="w-3 h-3" /> CLAIM DAILY
                                                    </button>
                                                ) : isDailyClaimed ? (
                                                    <div className="text-center text-xs font-bold text-emerald-500 bg-emerald-950/30 py-1.5 rounded-lg border border-emerald-900/50">
                                                        ✓ CLAIMED FOR TODAY
                                                    </div>
                                                ) : null}
                                            </div>

                                            {/* Weekly Bounty */}
                                            <div className="bg-slate-900/50 rounded-xl p-3 border border-yellow-900/40">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                                                        <Shield className="w-4 h-4" /> {tier.label} (Weekly)
                                                    </h3>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-500/50 bg-yellow-950/50 text-yellow-300">
                                                        Lv.{mySquad.level || 1}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-300 mb-2">Defeat {tier.target.toLocaleString()} enemies this week.</div>
                                                <div className="flex gap-2 mb-3">
                                                    <div className="flex-1 bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700 flex flex-col items-center">
                                                        <Coins className="w-4 h-4 fill-yellow-500 text-yellow-500 mb-1" />
                                                        <div className="text-xs font-bold text-yellow-400">{tier.gold.toLocaleString()} Gold</div>
                                                    </div>
                                                    <div className="flex-1 bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700 flex flex-col items-center">
                                                        <Puzzle className="w-4 h-4 fill-fuchsia-400 text-fuchsia-400 mb-1" />
                                                        <div className="text-xs font-bold text-fuchsia-400">{tier.fragments} Fragments</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                    <span className="text-slate-400">Progress</span>
                                                    <span className="text-white">{Math.min(kills, tier.target).toLocaleString()} / {tier.target.toLocaleString()}</span>
                                                </div>
                                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700 mb-3">
                                                    <div className="bg-gradient-to-r from-orange-600 to-yellow-400 h-full transition-all duration-500" style={{ width: `${Math.min(100, (kills / tier.target) * 100)}%` }} />
                                                </div>
                                                {isComplete && !isClaimed ? (
                                                    <button onClick={handleClaimWeekly} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                                                        <Gift className="w-3 h-3" /> CLAIM WEEKLY
                                                    </button>
                                                ) : isClaimed ? (
                                                    <div className="text-center text-xs font-bold text-emerald-500 bg-emerald-950/30 py-1.5 rounded-lg border border-emerald-900/50">
                                                        ✓ CLAIMED FOR THIS WEEK
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                </>
                            );
                        })()}

                        {/* RIGHT PANEL: CHAT, MEMBERS & SETTINGS */}
                        <div className="flex-1 bg-[#0b0416]/80 backdrop-blur-xl border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.15)] rounded-xl flex flex-col overflow-hidden min-h-0">
                            <div className="flex border-b border-slate-800 shrink-0">
                                <button 
                                    onClick={() => setActiveTab('chat')}
                                    className={`flex-1 py-3 font-bold text-sm flex justify-center items-center gap-2 ${activeTab === 'chat' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800/30'}`}
                                >
                                    <MessageSquare className="w-4 h-4" /> Chat
                                </button>
                                <button 
                                    onClick={() => setActiveTab('members')}
                                    className={`flex-1 py-3 font-bold text-sm flex justify-center items-center gap-2 ${activeTab === 'members' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800/30'}`}
                                >
                                    <Users className="w-4 h-4" /> Members ({squadMembers.length}/{MAX_SQUAD_MEMBERS})
                                </button>
                                {isLeader && (
                                    <button 
                                        onClick={() => setActiveTab('settings')}
                                        className={`flex-1 py-3 font-bold text-sm flex justify-center items-center gap-2 ${activeTab === 'settings' ? 'text-orange-400 border-b-2 border-orange-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800/30'}`}
                                    >
                                        <Settings className="w-4 h-4" /> Settings
                                    </button>
                                )}
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
                                                        <div className={`max-w-[70%] rounded-lg p-2 ${
                                                            msg.user_id === user.id 
                                                                ? 'bg-cyan-900/50 text-white border border-cyan-800' 
                                                                : 'bg-slate-800 text-slate-200 border border-slate-700'
                                                        }`}>
                                                            <div className="text-[10px] font-bold opacity-50 mb-0.5 flex items-center gap-1">
                                                                {msg.player_name}
                                                                {msg.player_title && <span className="px-1 bg-slate-900/50 rounded text-[8px] tracking-wider text-amber-300">{msg.player_title}</span>}
                                                            </div>
                                                            <div className="text-sm break-words">
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
                            ) : activeTab === 'members' ? (
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {squadMembers.map(member => (
                                        <div key={member.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-400">
                                                    {member.player_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white flex items-center gap-2">
                                                        {member.role === 'leader' && <Crown className="w-3 h-3 text-yellow-400" />}
                                                        {member.player_name}
                                                        {member.player_title && <span className="text-[9px] bg-slate-900/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-900/50 tracking-wider">{member.player_title}</span>}
                                                        {member.user_id === user.id && <span className="text-[10px] bg-cyan-900 text-cyan-400 px-1.5 rounded">YOU</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-400 capitalize">{member.role}</div>
                                                </div>
                                            </div>
                                            {isLeader && member.user_id !== user.id && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleTransferLeadership(member)}
                                                        className="text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-950/30 px-2 py-1 rounded border border-yellow-900/50 flex items-center gap-1"
                                                        title="Transfer Leadership"
                                                    >
                                                        <Crown className="w-3 h-3" /> Promote
                                                    </button>
                                                    <button
                                                        onClick={() => handleKickMember(member)}
                                                        className="text-xs text-red-400 hover:text-red-300 bg-red-950/30 px-2 py-1 rounded border border-red-900/50 flex items-center gap-1"
                                                        title="Kick Member"
                                                    >
                                                        <UserX className="w-3 h-3" /> Kick
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto p-4">
                                    <form onSubmit={handleSaveSettings} className="space-y-4">
                                        <div className="relative z-20">
                                            <label className="block text-xs font-bold text-slate-400 mb-1">Squad Icon</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSquadIconPicker(v => !v)}
                                                    className="w-14 h-14 bg-slate-800 border border-slate-700 hover:border-orange-500 rounded-xl text-3xl flex items-center justify-center transition-colors overflow-hidden"
                                                >
                                                    {editIcon?.startsWith('http') ? <img src={editIcon} className="w-full h-full object-cover" alt="squad" /> : editIcon}
                                                </button>
                                                {showSquadIconPicker && (
                                                    <EmojiPicker
                                                        options={SQUAD_ICONS}
                                                        selected={editIcon}
                                                        onSelect={setEditIcon}
                                                        onClose={() => setShowSquadIconPicker(false)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1">Squad Name</label>
                                            <input
                                                required maxLength={20}
                                                value={editName} onChange={e => setEditName(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1">Tag (Max 4 chars)</label>
                                            <input
                                                required maxLength={4}
                                                value={editTag} onChange={e => setEditTag(e.target.value.toUpperCase())}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-orange-500 uppercase"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
                                            <input
                                                maxLength={50}
                                                value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-orange-500"
                                                placeholder="Squad description..."
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSavingSettings}
                                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors"
                                        >
                                            {isSavingSettings ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <div className="border-t border-slate-700 pt-4">
                                            <h4 className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wider">Danger Zone</h4>
                                            <button
                                                type="button"
                                                onClick={handleLeaveSquad}
                                                className="w-full bg-red-950/30 hover:bg-red-950/60 text-red-400 font-bold py-2.5 rounded-lg border border-red-900/50 transition-colors"
                                            >
                                                Disband / Leave Squad
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}