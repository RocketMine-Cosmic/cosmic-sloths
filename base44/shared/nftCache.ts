// Short-lived cache of a wallet's NFT names (T-003, 4 Nov 2026).
//
// WHY: spendGold, forgeAction and purchaseSku each asked Omen
// GET /v1/players/:wallet?chainId=56 on EVERY talent / gold / forge action for
// an NFT character not in save.unlockedCharacters. Omen bills per request, and
// a player buying four talents in a row made four identical calls in seconds.
//
// HOW: one answer from Omen is kept for CACHE_TTL_MS, first in this isolate's
// memory, then in the server-only OmenNftCache table (Base44 isolates don't
// share memory, so the table is what makes a burst across isolates one call).
// A miss or an expired row still asks Omen. Only a successful Omen answer is
// cached — an error or a 404 is never cached, so nothing can stick "not owned".
//
// WHAT IT IS NOT: a record of ownership. An NFT can be sold; at worst a sold
// NFT still counts for up to CACHE_TTL_MS. Nothing here writes into the save.
//
// Names are returned lowercased but NOT normalised: each caller matches exactly
// as it did before (purchaseSku strips "_am", spendGold / forgeAction don't).

const CACHE_TTL_MS = 10 * 60 * 1000;
const mem = new Map<string, { names: string[]; at: number }>();

function balanceKeys(): string[] {
    const keys = [
        Deno.env.get('OMENX_BALANCE_API_KEY'),
        Deno.env.get('OMENX_BALANCE_API_KEY_2'),
        Deno.env.get('OMENX_BALANCE_API_KEY_3'),
        Deno.env.get('OMENX_BALANCE_API_KEY_4'),
        Deno.env.get('OMENX_BALANCE_API_KEY_5'),
        Deno.env.get('OMENX_BALANCE_API_KEY_6'),
        Deno.env.get('OMENX_BALANCE_API_KEY_7'),
        Deno.env.get('OMENX_BALANCE_API_KEY_8'),
        Deno.env.get('OMENX_BALANCE_API_KEY_9'),
    ].filter(Boolean) as string[];
    return keys.map(k => ({ k, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => x.k);
}

// Ask Omen. Same contract the three callers used: try keys in random order,
// move on only for 429 / 5xx; any other answer is final.
async function fetchFromOmen(walletAddress: string): Promise<string[] | null> {
    let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
    if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;
    for (const key of balanceKeys()) {
        const res = await fetch(`${apiBaseUrl}/v1/players/${walletAddress}?chainId=56`, {
            headers: { 'Authorization': `Bearer ${key}` },
        });
        if (res.ok) {
            const data = await res.json();
            const nfts = data?.nfts || [];
            return nfts.map((n: any) => String(n?.metadata?.name || '').toLowerCase()).filter(Boolean);
        }
        if (res.status !== 429 && res.status < 500) return null;
    }
    return null;
}

/**
 * The wallet's NFT names (lowercased), or null if Omen couldn't answer.
 * `base44` is the request's client; only its asServiceRole is used.
 */
export async function getWalletNftNames(base44: any, walletAddress: string, caller = 'fn'): Promise<string[] | null> {
    const wallet = String(walletAddress || '').toLowerCase();
    if (!wallet) return null;
    const now = Date.now();

    const m = mem.get(wallet);
    if (m && now - m.at < CACHE_TTL_MS) {
        console.log(`[nftCache] ${caller} hit (memory)`);
        return m.names;
    }

    let row: any = null;
    try {
        const rows = await base44.asServiceRole.entities.OmenNftCache.filter({ wallet_address: wallet });
        row = (rows || []).sort((a: any, b: any) => (b.fetched_at_ms || 0) - (a.fetched_at_ms || 0))[0] || null;
        if (row && now - (row.fetched_at_ms || 0) < CACHE_TTL_MS && Array.isArray(row.nft_names)) {
            mem.set(wallet, { names: row.nft_names, at: row.fetched_at_ms });
            console.log(`[nftCache] ${caller} hit (table)`);
            return row.nft_names;
        }
    } catch (e) {
        console.warn(`[nftCache] table read failed, asking Omen: ${(e as any)?.message || e}`);
    }

    console.log(`[nftCache] ${caller} OMEN CALL`);
    let names: string[] | null = null;
    try { names = await fetchFromOmen(walletAddress); } catch { names = null; }
    if (!names) return null;

    const at = Date.now();
    mem.set(wallet, { names, at });
    try {
        if (row?.id) {
            await base44.asServiceRole.entities.OmenNftCache.update(row.id, { nft_names: names, fetched_at_ms: at });
        } else {
            await base44.asServiceRole.entities.OmenNftCache.create({ wallet_address: wallet, nft_names: names, fetched_at_ms: at });
        }
    } catch (e) {
        console.warn(`[nftCache] table write failed (answer still used): ${(e as any)?.message || e}`);
    }
    return names;
}
