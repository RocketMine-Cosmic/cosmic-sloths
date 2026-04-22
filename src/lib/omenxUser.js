import { getAuthFromIndexedDB, saveAuthToIndexedDB } from './indexedDbAuth.js';

/**
 * Synchronous version — reads localStorage only. Use in game callbacks where async is not possible.
 */
export function getOmenXUserSync() {
    try {
        const authData = JSON.parse(localStorage.getItem('omenx_auth_data'));
        if (!authData?.walletAddress) return null;
        return {
            walletAddress: authData.walletAddress,
            username: authData.username,
            full_name: authData.username || authData.player_name || 'Player',
            player_name: authData.player_name || authData.username || 'Player',
            pilot_icon: authData.pilot_icon || '🦥',
            data: {
                player_name: authData.player_name || authData.username || 'Player',
                player_title: authData.player_title || '',
                pilot_icon: authData.pilot_icon || '🦥',
            }
        };
    } catch {
        return null;
    }
}

/**
 * Gets the current OmenX user data from IndexedDB or localStorage.
 * Replaces base44.auth.me() for wallet-only auth.
 */
export async function getOmenXUser() {
    try {
        // Try IndexedDB first (survives history clear)
        let authData = await getAuthFromIndexedDB();
        
        // Fallback to localStorage
        if (!authData) {
            authData = JSON.parse(localStorage.getItem('omenx_auth_data'));
        }
        
        if (!authData?.walletAddress) {
            return null;
        }
        
        return {
            walletAddress: authData.walletAddress,
            username: authData.username,
            full_name: authData.username || authData.player_name || 'Player',
            player_name: authData.player_name || authData.username || 'Player',
            pilot_icon: authData.pilot_icon || '🦥',
            // Expose nested data fields at top level for compatibility
            data: {
                player_name: authData.player_name || authData.username || 'Player',
                player_title: authData.player_title || '',
                pilot_icon: authData.pilot_icon || '🦥',
            }
        };
    } catch {
        return null;
    }
}

/**
 * Updates OmenX user data in IndexedDB and localStorage.
 * Used for profile customization (name, title, icon).
 */
export async function updateOmenXUser(updates) {
    try {
        let authData = await getAuthFromIndexedDB();
        if (!authData) {
            authData = JSON.parse(localStorage.getItem('omenx_auth_data'));
        }
        if (!authData) return;
        
        const updated = { ...authData, ...updates };
        await saveAuthToIndexedDB(updated);
        localStorage.setItem('omenx_auth_data', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('omenxUserUpdated', { detail: updated }));
    } catch (e) {
        console.error('[updateOmenXUser] Update error');
    }
}