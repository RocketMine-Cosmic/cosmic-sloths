import React from 'react';

// Convert a TokenSpendLog row into a short, human-readable purchase description.
// Falls back gracefully on legacy rows that don't have grant_info / sku_id yet.
function formatGrant(grant) {
    if (!grant || typeof grant !== 'object') return null;
    const { type } = grant;
    if (type === 'stat') {
        return `Stat ▸ ${grant.stat || '?'} Lv${grant.level ?? '?'} (${grant.tier || '?'})`;
    }
    if (type === 'weapon') {
        return `Weapon ▸ ${grant.weaponId || '?'} · ${grant.stat || '?'} Lv${grant.level ?? '?'} (${grant.tier || '?'})`;
    }
    if (type === 'talent') {
        return `Talent ▸ ${grant.charId || '?'} · ${grant.talentId || '?'} (T${grant.talentTier ?? '?'} ${grant.tier || ''})`;
    }
    if (type === 'cosmetic') {
        const where = grant.charId ? ` for ${grant.charId}` : '';
        return `Cosmetic ▸ ${grant.slot || '?'} · ${grant.cosmeticId || '?'}${where}`;
    }
    return type;
}

export default function SpendLogDescription({ log }) {
    const fromGrant = formatGrant(log.grant_info);
    const fromSku = log.sku_id;

    if (!fromGrant && !fromSku) {
        return <span className="text-slate-600 italic text-[10px]">unknown</span>;
    }

    return (
        <div className="flex flex-col gap-0.5 max-w-[260px]">
            {fromGrant && <span className="text-slate-200 text-[11px] leading-tight">{fromGrant}</span>}
            {fromSku && (
                <span className="text-slate-500 font-mono text-[9px] truncate" title={fromSku}>{fromSku}</span>
            )}
        </div>
    );
}