/**
 * Gets the current OmenX user data from localStorage.
 * Replaces base44.auth.me() for wallet-only auth.
 */
export function getOmenXUser() {
    try {
        const authData = JSON.parse(localStorage.getItem('omenx_auth_data'));
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