import { useState, useEffect } from 'react';
import { OmenXGameSDK, subscribeWalletRealtimeWithOmenXAuth } from '@omen.foundation/game-sdk';

// Singleton cache — shared across all hook instances
let cachedBalance = null;
let listeners = new Set();
let unsubscribe = null;
let consumerCount = 0;

const sdk = new OmenXGameSDK({ gameId: 'cosmic-sloths' });

function notify() {
    listeners.forEach(fn => fn(cachedBalance));
}

function startSubscription() {
    if (unsubscribe || !sdk.isAuthenticated()) return;
    
    try {
        unsubscribe = subscribeWalletRealtimeWithOmenXAuth({
            apiBaseUrl: 'https://api.omen.foundation',
            getAccessToken: () => Promise.resolve(sdk.getAuthData()?.accessToken ?? null),
            walletAddress: sdk.getAuthData()?.walletAddress,
            onBalance: (balances) => {
                const omenxToken = balances?.tokens?.find(t => t.symbol === 'OMENX');
                cachedBalance = parseFloat(omenxToken?.balance ?? '0');
                notify();
            },
            onInventory: () => {}, // no-op for now
        });
    } catch (e) {
        console.error('[useOmenXBalance] subscription failed:', e);
    }
}

function stopSubscription() {
    if (unsubscribe) { 
        unsubscribe(); 
        unsubscribe = null; 
    }
}

export function useOmenXBalance() {
    const [balance, setBalance] = useState(cachedBalance);
    const [loading, setLoading] = useState(cachedBalance === null);

    useEffect(() => {
        const listener = (val) => { setBalance(val); setLoading(false); };
        listeners.add(listener);
        consumerCount++;

        if (sdk.isAuthenticated()) {
            startSubscription();
        }

        // Sync with latest cache immediately
        if (cachedBalance !== null) { setBalance(cachedBalance); setLoading(false); }

        return () => {
            listeners.delete(listener);
            consumerCount--;
            if (consumerCount <= 0) { consumerCount = 0; stopSubscription(); }
        };
    }, []);

    return { balance, loading };
}