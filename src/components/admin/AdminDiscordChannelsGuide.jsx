import React from 'react';
import { Bell, AlertTriangle, Coins, Shield, Swords, Trophy, Megaphone } from 'lucide-react';

// Reference card for the Discord webhooks wired into the app's backend functions.
// Helps staff understand what each alert channel covers so they can triage faster.
const CHANNELS = [
    {
        secret: 'DISCORD_ERROR_WEBHOOK',
        name: '#errors',
        purpose: 'Backend crashes & unexpected failures',
        color: 'red',
        icon: AlertTriangle,
        triggers: [
            'A backend function throws an unhandled exception (e.g. purchaseSku, refundAllOmenx)',
            'External API failures (OmenX payment / balance / NFT lookups, Base44 SDK errors)',
            'Internal data corruption detected during writes',
        ],
        severity: 'High',
        action: 'Investigate stack trace immediately. May indicate a bug, downtime, or upstream API outage.',
    },
    {
        secret: 'DISCORD_ECONOMY_WEBHOOK',
        name: '#economy-alerts',
        purpose: 'Large or suspicious OMENX/gold movements',
        color: 'amber',
        icon: Coins,
        triggers: [
            'Single OMENX purchase ≥ 50 (large spend signal)',
            'Gold-loss audit triggered by player support ticket',
            'Bulk refunds and treasury payouts',
        ],
        severity: 'Medium',
        action: 'Cross-check player wallet & spend log. Confirms VIPs or flags whales/abuse for review.',
    },
    {
        secret: 'DISCORD_MOD_WEBHOOK',
        name: '#moderation',
        purpose: 'Player moderation actions',
        color: 'orange',
        icon: Shield,
        triggers: [
            'Squad chat message deleted by moderator',
            'Wallet muted or unmuted from squad chat',
            'Blacklist additions / removals',
        ],
        severity: 'Low',
        action: 'Audit trail only — confirms moderator actions are being logged. Review for pattern abuse.',
    },
    {
        secret: 'DISCORD_SQUADWARS_WEBHOOK',
        name: '#squad-wars',
        purpose: 'Weekly Squad Wars lifecycle events',
        color: 'red',
        icon: Swords,
        triggers: [
            'Weekly pairings posted (Monday 00:00 UTC)',
            'Wars resolved Sunday night with winners + kill counts',
            'Bye-week assignments',
        ],
        severity: 'Info',
        action: 'No action needed. Public-facing community channel. Verify scheduler ran on time each Monday.',
    },
    {
        secret: 'DISCORD_LEADERBOARD_WEBHOOK',
        name: '#leaderboard',
        purpose: 'Weekly & seasonal leaderboard recaps',
        color: 'cyan',
        icon: Trophy,
        triggers: [
            'Weekly top 100 posted at end of cycle (with OMENX payouts)',
            'Seasonal recap every 4 weeks',
            'Squad Champions OMENX prize pool distributions',
        ],
        severity: 'Info',
        action: 'No action needed. Promotes ranked competition. Confirm payouts match the on-chain transfers.',
    },
    {
        secret: 'DISCORD_ALERT_WEBHOOK',
        name: '#leaderboard-takeover',
        purpose: 'Notable rank changes during the week',
        color: 'fuchsia',
        icon: Megaphone,
        triggers: [
            'A player takes #1 on the weekly leaderboard',
            'Top-10 shake-ups (large rank jumps)',
        ],
        severity: 'Info',
        action: 'No action needed. Hype/community channel. Helps drive engagement & FOMO mid-week.',
    },
];

const COLOR_CLASSES = {
    red:     { border: 'border-red-700/50',     bg: 'bg-red-950/30',     text: 'text-red-400',     pill: 'bg-red-900/60 text-red-200' },
    amber:   { border: 'border-amber-700/50',   bg: 'bg-amber-950/30',   text: 'text-amber-400',   pill: 'bg-amber-900/60 text-amber-200' },
    orange:  { border: 'border-orange-700/50',  bg: 'bg-orange-950/30',  text: 'text-orange-400',  pill: 'bg-orange-900/60 text-orange-200' },
    cyan:    { border: 'border-cyan-700/50',    bg: 'bg-cyan-950/30',    text: 'text-cyan-400',    pill: 'bg-cyan-900/60 text-cyan-200' },
    fuchsia: { border: 'border-fuchsia-700/50', bg: 'bg-fuchsia-950/30', text: 'text-fuchsia-400', pill: 'bg-fuchsia-900/60 text-fuchsia-200' },
};

const SEVERITY_CLASSES = {
    High:   'bg-red-900/60 text-red-200 border-red-700',
    Medium: 'bg-amber-900/60 text-amber-200 border-amber-700',
    Low:    'bg-slate-800 text-slate-300 border-slate-600',
    Info:   'bg-cyan-900/60 text-cyan-200 border-cyan-700',
};

function ChannelCard({ channel }) {
    const c = COLOR_CLASSES[channel.color];
    const Icon = channel.icon;
    return (
        <div className={`bg-[#0b0416]/80 border ${c.border} rounded-xl overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${c.border} ${c.bg}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={16} className={c.text} />
                    <div className="min-w-0">
                        <div className={`text-sm font-black ${c.text}`}>{channel.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{channel.secret}</div>
                    </div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${SEVERITY_CLASSES[channel.severity]}`}>
                    {channel.severity}
                </span>
            </div>
            <div className="p-4 space-y-3">
                <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Purpose</div>
                    <div className="text-sm text-slate-200">{channel.purpose}</div>
                </div>
                <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">What triggers a post</div>
                    <ul className="space-y-1">
                        {channel.triggers.map((t, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className={c.text}>•</span>
                                <span>{t}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Staff action</div>
                    <div className={`text-xs px-3 py-2 rounded ${c.pill}`}>{channel.action}</div>
                </div>
            </div>
        </div>
    );
}

export default function AdminDiscordChannelsGuide() {
    return (
        <div className="space-y-4">
            <div className="bg-[#0b0416]/80 border border-indigo-900/50 rounded-xl p-4">
                <h2 className="text-base font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Bell size={16} /> Discord Alert Channels
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    Reference for staff: what each Discord webhook posts, how urgent it is, and what to do when you see a message there.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {CHANNELS.map(c => <ChannelCard key={c.secret} channel={c} />)}
            </div>
        </div>
    );
}