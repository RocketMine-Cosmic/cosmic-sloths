import { useState, useEffect } from 'react';
import { getOmenXUser } from '@/lib/omenxUser';

// Singleton cache
let cachedUser = null;
let listeners = new Set();
let fetchInProgress = false;
let lastFetchTime = 0;
const USER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes — it's just localStorage, no network call
let storageListenerRegistered = false;

function notify() {
    listeners.forEach(fn => fn(cachedUser));
}

async function fetchUser(force = false) {
    const now = Date.now();
    if (!force && now - lastFetchTime < USER_CACHE_DURATION) return;
    if (fetchInProgress) return;
    
    fetchInProgress = true;
    try {
        const user = await getOmenXUser();
        cachedUser = user;
        lastFetchTime = now;
        notify();
    } catch (e) {
        cachedUser = null;
        notify();
    } finally {
        fetchInProgress = false;
    }
}

let pollInitialized = false;
let pollInterval = null;

function startPolling() {
    if (pollInitialized) return;
    pollInitialized = true;
    const now = Date.now();
    if (now - lastFetchTime >= USER_CACHE_DURATION) {
        fetchUser();
    }
    pollInterval = setInterval(() => fetchUser(), USER_CACHE_DURATION);
}

function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    pollInitialized = false;
}

export function useOmenXUser() {
    const [user, setUser] = useState(cachedUser);
    const [loading, setLoading] = useState(cachedUser === null);

    useEffect(() => {
        const listener = (val) => { setUser(val); setLoading(false); };
        listeners.add(listener);

        startPolling();

        if (cachedUser !== null) { setUser(cachedUser); setLoading(false); }

        // Register global storage + update listeners only once across all hook instances
        if (!storageListenerRegistered) {
            storageListenerRegistered = true;
            const onStorage = (e) => { if (e.key === 'omenx_auth_data' && e.storageArea === localStorage) { lastFetchTime = 0; stopPolling(); fetchUser(true).then(() => startPolling()); } };
            const onUserUpdated = () => { lastFetchTime = 0; fetchUser(true); };
            window.addEventListener('storage', onStorage);
            window.addEventListener('omenxUserUpdated', onUserUpdated);
        }

        return () => {
            listeners.delete(listener);
            if (listeners.size === 0) { stopPolling(); storageListenerRegistered = false; }
        };
    }, []);

    return { user, loading };
}