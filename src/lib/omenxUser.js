/**
 * Gets the current OmenX user data from sessionStorage.
 * Replaces base44.auth.me() for wallet-only auth.
 */
export function getOmenXUser() {
    try {
        const authData = JSON.parse(sessionStorage.getItem('omenx_auth_data'));
        if (!authData?.walletAddress) return null;
        
        return {
            walletAddress: authData.walletAddress,
            username: authData.username,
            full_name: authData.username || 'Player',
            player_name: authData.username || 'Player',
        };
    } catch {
        return null;
    }
}

/**
 * Updates OmenX user data in sessionStorage.
 * Used for profile customization (name, title, icon).
 */
export function updateOmenXUser(updates) {
    try {
        const authData = JSON.parse(sessionStorage.getItem('omenx_auth_data'));
        if (!authData) return;
        const updated = { ...authData, ...updates };
        sessionStorage.setItem('omenx_auth_data', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('omenxUserUpdated', { detail: updated }));
    } catch (e) {
        console.error('[updateOmenXUser] Failed:', e);
    }
}