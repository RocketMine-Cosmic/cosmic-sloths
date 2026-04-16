import React, { useState, useEffect, useCallback } from 'react';
import { SaveManager } from '../../game/SaveManager';
import { Star, Puzzle, Hexagon, Coins, Wallet, RefreshCw } from 'lucide-react';
import { getOmenXAuthData, getOmenXUser } from '@/lib/omenxUser';
import { base44 } from '@/api/base44Client';

function shortWallet(addr) {
    if (!addr) return null;
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function CurrencyHeader() {
    const [save, setSave] = useState(SaveManager.load());
    const [walletBalance, setWalletBalance] = useState(null);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [walletAddress, setWalletAddress] = useState(null);

    useEffect(() => {
        const handleSaveUpdated = (e) => setSave(e.detail);
        window.addEventListener('saveUpdated', handleSaveUpdated);
        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, []);

    // Read wallet address from OmenX auth
    useEffect(() => {
        const auth = getOmenXAuthData();
        if (auth) {
            const addr = auth.walletAddress || auth.wallet_address || null;
            setWalletAddress(addr);
        }

        // Listen for storage changes (e.g. after login)
        const onStorage = (e) => {
            if (e.key === 'omenx_auth_data') {
                try {
                    const d = e.newValue ? JSON.parse(e.newValue) : null;
                    setWalletAddress(d?.walletAddress || d?.wallet_address || null);
                } catch {}
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const fetchWalletBalance = useCallback(async () => {
        const auth = getOmenXAuthData();
        if (!auth) return;
        const addr = auth.walletAddress || auth.wallet_address || null;
        const accessToken = auth.access_token || null;
        if (!addr && !accessToken) return;

        setLoadingBalance(true);
        try {
            const res = await base44.functions.invoke('getWalletBalance', {
                walletAddress: addr,
                accessToken,
            });
            if (res.data && !res.data.error) {
                setWalletBalance(res.data);
            }
        } catch (e) {
            // non-critical
        }
        setLoadingBalance(false);
    }, []);

    // Fetch balance on mount and when wallet address changes
    useEffect(() => {
        if (walletAddress) fetchWalletBalance();
    }, [walletAddress, fetchWalletBalance]);

    // Extract token amount from balance data (handles various response shapes)
    const onChainTokens = walletBalance
        ? (walletBalance.balance ?? walletBalance.amount ?? walletBalance.tokens ?? walletBalance.cosmicTokens ?? null)
        : null;

    return (
        <div className="flex flex-wrap justify-end gap-1.5 md:gap-3 items-center">
            {/* Wallet address chip */}
            {walletAddress && (
                <div
                    className="flex items-center gap-1.5 text-xs font-black text-purple-300 bg-purple-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)] cursor-default"
                    title={walletAddress}
                >
                    <Wallet className="w-3 h-3 md:w-4 md:h-4 text-purple-400" />
                    <span className="font-mono">{shortWallet(walletAddress)}</span>
                </div>
            )}

            <div className="flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-yellow-300 bg-yellow-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]" title="Star Fragments">
                <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" /> {save.starFragments || 0}
            </div>
            <div className="flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-fuchsia-300 bg-fuchsia-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-fuchsia-700/50 shadow-[0_0_10px_rgba(217,70,239,0.2)]" title="Relic Fragments">
                <Puzzle className="w-3 h-3 md:w-4 md:h-4 fill-fuchsia-400 text-fuchsia-400" /> {save.relicFragments || 0}
            </div>

            {/* Cosmic Tokens — show on-chain balance if available, else local */}
            <div
                className="flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-emerald-300 bg-emerald-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-pointer select-none"
                title={onChainTokens !== null ? `On-chain wallet balance: ${onChainTokens}` : 'Cosmic Tokens (click to refresh)'}
                onClick={fetchWalletBalance}
            >
                {loadingBalance
                    ? <RefreshCw className="w-3 h-3 md:w-4 md:h-4 text-emerald-400 animate-spin" />
                    : <Hexagon className="w-3 h-3 md:w-4 md:h-4 fill-emerald-400 text-emerald-400" />
                }
                {onChainTokens !== null ? onChainTokens : (save.cosmicTokens || 0)}
                {onChainTokens !== null && (
                    <span className="text-[8px] text-emerald-600 font-bold ml-0.5 hidden md:inline">LIVE</span>
                )}
            </div>

            <div className="flex items-center gap-1.5 text-xs md:text-sm lg:text-base font-black text-yellow-400 bg-amber-950/60 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]" title="Gold">
                <Coins className="w-3 h-3 md:w-4 md:h-4 fill-yellow-500 text-yellow-500" /> {save.gold}
            </div>
        </div>
    );
}