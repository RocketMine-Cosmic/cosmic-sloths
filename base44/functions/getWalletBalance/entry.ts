import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = 'https://staging.api.omen.foundation/v1';

Deno.serve(async (req) => {
    try {
        const { walletAddress, accessToken } = await req.json();

        if (!accessToken && !walletAddress) {
            return Response.json({ error: 'Missing accessToken or walletAddress' }, { status: 400 });
        }

        const apiKey = Deno.env.get('OMENX_API_KEY');
        const authHeader = accessToken
            ? `Bearer ${accessToken}`
            : `Bearer ${apiKey}`;

        // Try several possible endpoints to find the wallet/token balance
        const endpoints = [
            walletAddress ? `${BASE_URL}/wallets/${walletAddress}/balance` : null,
            walletAddress ? `${BASE_URL}/wallets/${walletAddress}` : null,
            `${BASE_URL}/me/wallet`,
            `${BASE_URL}/me/balance`,
            `${BASE_URL}/users/me/wallet`,
        ].filter(Boolean);

        let lastError = null;
        for (const url of endpoints) {
            const res = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                }
            });
            if (res.ok) {
                const data = await res.json();
                return Response.json({ success: true, endpoint: url, ...data });
            }
            const text = await res.text();
            lastError = { url, status: res.status, body: text };
        }

        return Response.json({ error: 'No balance endpoint found', lastError }, { status: 404 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});