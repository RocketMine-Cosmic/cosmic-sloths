/**
 * OmenX user helpers — replaces base44.auth.me() / updateMe() throughout the app.
 * All identity data is stored in localStorage under 'omenx_auth_data' and 'cosmic_sloth_save'.
 *
 * Identity is keyed by wallet address (canonical).
 * walletAddress is populated by omenxTokenExchange backend function at login time.
 */

const STORAGE_KEY = 'omenx_auth_data';

export function getOmenXAuthData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
}

/**
 * Returns a user-like object from OmenX auth + SaveManager data.
 * Returns null if not logged in.
 */
export function getOmenXUser() {
    const auth = getOmenXAuthData();
    if (!auth) return null;

    // Load extra profile data from save
    let saveData = {};
    try {
        const raw = localStorage.getItem('cosmic_sloth_save');
        if (raw) saveData = JSON.parse(raw);
    } catch {}

    // Wallet address is the canonical identity — used as user ID and for on-chain token lookups
    const walletAddress = auth.walletAddress || auth.wallet_address || null;

    return {
        id: walletAddress || auth.userId || auth.username || 'omenx-user',
        walletAddress,
        full_name: saveData.pilotName || auth.username || walletAddress || 'Pilot',
        player_name: saveData.pilotName || auth.username || null,
        email: auth.email || null,
        created_date: auth.created_date || new Date().toISOString(),
        data: {
            player_name: saveData.pilotName || auth.username || null,
            player_title: saveData.playerTitle || null,
            pilot_icon: saveData.pilotIcon || '🦥',
        },
        // raw omenx fields
        _auth: auth,
        _save: saveData,
    };
}

/**
 * Update profile fields — persists to SaveManager (localStorage).
 * Supported fields: player_name, player_title, pilot_icon
 */
export function updateOmenXUser(fields) {
    try {
        const raw = localStorage.getItem('cosmic_sloth_save');
        const saveData = raw ? JSON.parse(raw) : {};
        if (fields.player_name !== undefined) saveData.pilotName = fields.player_name;
        if (fields.player_title !== undefined) saveData.playerTitle = fields.player_title;
        if (fields.pilot_icon !== undefined) saveData.pilotIcon = fields.pilot_icon;
        saveData.updated_at = Date.now();
        localStorage.setItem('cosmic_sloth_save', JSON.stringify(saveData));
        window.dispatchEvent(new CustomEvent('saveUpdated', { detail: saveData }));
    } catch (e) {
        console.error('[omenxUser] Failed to update user', e);
    }
}