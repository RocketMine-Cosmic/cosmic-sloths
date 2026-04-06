import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        base44.auth.me().then(me => {
            setUser(me);
            if (me?.role !== 'admin') {
                navigate('/');
            }
        });
    }, [navigate]);

    const { data: pools, isLoading } = useQuery({
        queryKey: ['tokenPools'],
        queryFn: () => base44.entities.TokenPool.list('-created_date', 100),
        enabled: !!user && user.role === 'admin'
    });

    if (!user || user.role !== 'admin') return null;

    const weeklyData = pools?.filter(p => p.period_type === 'weekly').sort((a, b) => a.period_id.localeCompare(b.period_id)) || [];
    const seasonalData = pools?.filter(p => p.period_type === 'seasonal').sort((a, b) => a.period_id.localeCompare(b.period_id)) || [];

    return (
        <div className="min-h-screen relative text-slate-200 p-2 pb-20 md:p-6 font-sans">
            <SpaceBackground />
            <div className="max-w-6xl mx-auto relative z-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 md:mb-6 border-b border-red-900/40 pb-2 md:pb-4">
                    <div>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                            className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                        >
                            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Main Menu
                        </button>
                        <h1 className="text-xl md:text-4xl font-black tracking-widest uppercase flex items-center gap-3" style={{ color: '#ef4444', textShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
                            <BarChart3 className="w-6 h-6 md:w-8 md:h-8" /> ADMIN DASHBOARD
                        </h1>
                        <p className="text-slate-500 mt-1 md:text-sm text-[10px] tracking-widest uppercase">System Analytics & Token Spending</p>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[#0b0416]/80 backdrop-blur-xl rounded-xl border border-red-900/50 p-4 md:p-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                            <h2 className="text-lg font-bold text-red-400 mb-4 tracking-widest uppercase">Weekly Token Spend</h2>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis dataKey="period_id" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                            itemStyle={{ color: '#ef4444' }}
                                        />
                                        <Bar dataKey="total_spent" name="Tokens Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-[#0b0416]/80 backdrop-blur-xl rounded-xl border border-orange-900/50 p-4 md:p-6 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                            <h2 className="text-lg font-bold text-orange-400 mb-4 tracking-widest uppercase">Seasonal Token Spend</h2>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={seasonalData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis dataKey="period_id" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                            itemStyle={{ color: '#f97316' }}
                                        />
                                        <Line type="monotone" dataKey="total_spent" name="Tokens Spent" stroke="#f97316" strokeWidth={3} dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}