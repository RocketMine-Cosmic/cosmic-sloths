import { base44 } from '@/api/base44Client';

// OmenX's grant-batch endpoint takes 45-60s+ to settle a single batch, so the
// payout functions now send exactly ONE rank tier per invocation and report
// `has_more`. This helper drives them: it keeps re-invoking until every tier
// has been sent, reporting progress to the caller as it goes.
//
// Each pass is independently resume-safe (already-paid wallets are skipped), so
// a failed pass can simply be re-run without double-paying.
const MAX_PASSES = 12; // safety stop — far above the ~6 real tiers

export async function runPayoutPasses(functionName, payload, onProgress) {
    let passes = 0;
    let totalPaid = 0;
    let totalOmenx = 0;
    let lastData = null;

    while (passes < MAX_PASSES) {
        passes++;
        const res = await base44.functions.invoke(functionName, payload);
        const data = res.data || {};
        lastData = data;
        totalPaid += Number(data.paid) || 0;
        totalOmenx += Number(data.totalOmenx) || 0;

        if (data.has_more) {
            onProgress?.(`⏳ Paid ${data.tier_paid || 'tier'} — ${data.tiers_remaining} tier(s) to go, still working...`);
        } else {
            return { ...data, totalPaid, totalOmenx, passes };
        }
    }
    return { ...lastData, totalPaid, totalOmenx, passes, incomplete: true };
}