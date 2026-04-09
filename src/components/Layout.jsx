import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Gamepad2, Hexagon, Trophy, Users, Menu, User, BookOpen, Star, ShieldAlert, Award, Info, Gamepad, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import SpaceBackground from './game/SpaceBackground';
import SettingsModal from './game/SettingsModal';
import { Settings } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [showSettings, setShowSettings] = useState(false);
    
    // Hide layout on game screen
    if (location.pathname === '/game') {
        return <Outlet />;
    }

    const navItems = [
        { path: '/', label: 'Play', icon: Gamepad2 },
        { path: '/upgrades', label: 'Upgrades', icon: Star },
        { path: '/leaderboard', label: 'Ranks', icon: Trophy },
        { path: '/squads', label: 'Squads', icon: Users },
    ];

    const moreItems = [
        { path: '/profile', label: 'Profile', icon: User },
        { path: '/achievements', label: 'Achievements', icon: Award },
        { path: '/mastery', label: 'Mastery', icon: ShieldAlert },
        { path: '/dailys', label: 'Daily Missions', icon: ShieldAlert },
        { path: '/global-raid', label: 'Global Raid', icon: ShieldAlert },
        { path: '/trials', label: 'Leviathan Trials', icon: ShieldAlert },
        { path: '/bestiary', label: 'Bestiary', icon: BookOpen },
        { path: '/synergy-codex', label: 'Synergies', icon: BookOpen },
        { path: '/info', label: 'How to Play', icon: Info },
        { path: '/credits', label: 'Credits', icon: Info },
    ];

    return (
        <div className="min-h-screen bg-[#0b0416] text-slate-200 font-sans flex flex-col">
            <SpaceBackground />
            
            <header className="sticky top-0 z-50 bg-[#0b0416]/80 backdrop-blur-xl border-b border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-widest uppercase text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] hover:text-cyan-300 transition-colors">
                            <Gamepad className="w-6 h-6" /> Sloth
                        </Link>
                        
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                                            isActive 
                                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                                            : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 border border-transparent'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-all border border-transparent outline-none">
                                        <Menu className="w-4 h-4" />
                                        More <ChevronDown className="w-3 h-3" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-48 bg-[#0b0416]/95 backdrop-blur-xl border border-cyan-500/30 text-slate-200">
                                    {moreItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <DropdownMenuItem key={item.path} asChild className="focus:bg-cyan-500/20 focus:text-cyan-300 cursor-pointer">
                                                <Link to={item.path} className="flex items-center gap-2 w-full">
                                                    <Icon className="w-4 h-4" /> {item.label}
                                                </Link>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                    {user?.role === 'admin' && (
                                        <DropdownMenuItem asChild className="focus:bg-fuchsia-500/20 focus:text-fuchsia-300 cursor-pointer border-t border-slate-800 mt-1 pt-1">
                                            <Link to="/admin" className="flex items-center gap-2 w-full text-fuchsia-400">
                                                <ShieldAlert className="w-4 h-4" /> Admin
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => setShowSettings(true)} className="focus:bg-cyan-500/20 focus:text-cyan-300 cursor-pointer border-t border-slate-800 mt-1 pt-1 text-cyan-400">
                                        <Settings className="w-4 h-4 mr-2" /> Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={logout} className="focus:bg-red-500/20 focus:text-red-300 cursor-pointer text-red-400">
                                        Log Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </nav>
                    </div>

                    <div className="flex items-center md:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300">
                                    <Menu className="w-6 h-6" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-[#0b0416]/95 backdrop-blur-xl border border-cyan-500/30 text-slate-200">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <DropdownMenuItem key={item.path} asChild className="focus:bg-cyan-500/20 focus:text-cyan-300 cursor-pointer">
                                            <Link to={item.path} className="flex items-center gap-2 w-full">
                                                <Icon className="w-4 h-4" /> {item.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    );
                                })}
                                <div className="h-px bg-slate-800 my-1" />
                                {moreItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <DropdownMenuItem key={item.path} asChild className="focus:bg-cyan-500/20 focus:text-cyan-300 cursor-pointer text-slate-400">
                                            <Link to={item.path} className="flex items-center gap-2 w-full">
                                                <Icon className="w-4 h-4" /> {item.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    );
                                })}
                                <div className="h-px bg-slate-800 my-1" />
                                <DropdownMenuItem onClick={() => setShowSettings(true)} className="focus:bg-cyan-500/20 focus:text-cyan-300 cursor-pointer text-cyan-400">
                                    <Settings className="w-4 h-4 mr-2" /> Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={logout} className="focus:bg-red-500/20 focus:text-red-300 cursor-pointer text-red-400">
                                    Log Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="flex-1 relative z-10 w-full">
                <Outlet />
            </main>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
}