import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Auth is handled explicitly via the Sign In button (src/lib/frameAuth.js signInBase44).
// requiresAuth:false prevents the SDK from auto-redirecting to login on app load
// or after logout — users browse the carousel anonymously until they sign in.
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Purchase safety net (F-002, 2 Nov 2026). When Omen refuses a purchase because the wallet has no
// recent login (Omen's 30-day player session gate), purchaseSku answers 409 `omenSessionStale`.
// Seven screens call purchaseSku; rather than teach each one, every function answer passes through
// here and the flag is announced once. src/lib/omenx.js decides what to do with it.
const announceIfStale = (body) => {
  try {
    if (body && body.omenSessionStale) window.dispatchEvent(new CustomEvent('omenSessionStale'));
  } catch {}
};
// Omen session telemetry (T-006, 24 Nov 2026). The purchases, claims and squad actions a player
// makes all pass through here, so they are counted in this one place instead of in ~25 screens.
// ONLY functions/actions that run from a player's click are listed — never reads, polling or
// automatic calls (e.g. squadActions resetPeriods / getTreasury / getDailyGoal), per Omen's rule.
// Announced as an event so this file needn't import the telemetry module (src/lib/omenTelemetry.js).
const SQUAD_ACTIONS = new Set(['join', 'leave', 'sendMessage', 'requestJoin', 'approveJoin', 'denyJoin', 'setRank', 'kick',
  'transferLeadership', 'saveSettings', 'setDailyGoal', 'clearDailyGoal', 'donateTreasury', 'activateBuff']);
const playerActionFor = (name, data) => {
  switch (name) {
    case 'purchaseSku': return ['purchase_made', { sku_type: String(data?.skuId || '').startsWith('ingame-') ? 'in_run' : 'omen_store' }];
    case 'spendGold': return ['purchase_made', { sku_type: 'gold' }];
    case 'forgeAction': return ['purchase_made', { sku_type: 'forge' }];
    case 'craftRelic': return ['purchase_made', { sku_type: 'relic_craft' }];
    case 'prestigeRelic': return ['purchase_made', { sku_type: 'relic_prestige' }];
    case 'claimDailyLogin': return ['reward_claimed', { kind: 'daily_login' }];
    case 'claimDailyTask': return ['reward_claimed', { kind: 'daily_task' }];
    case 'claimBounty': return ['reward_claimed', { kind: data?.type === 'dailyMission' ? 'daily_mission' : 'bounty' }];
    case 'claimBossReward': return ['reward_claimed', { kind: 'raid_boss' }];
    case 'claimSeasonalSkin': return ['reward_claimed', { kind: 'seasonal_skin' }];
    case 'createSquad': return ['squad_action', { action: 'create' }];
    case 'squadWarEngine': return data?.action === 'claimWinBonus' ? ['reward_claimed', { kind: 'squad_war_bonus' }] : null;
    case 'squadActions':
      if (data?.action === 'claimWeekly') return ['reward_claimed', { kind: 'squad_weekly' }];
      if (data?.action === 'claimDaily') return ['reward_claimed', { kind: 'squad_daily' }];
      return SQUAD_ACTIONS.has(data?.action) ? ['squad_action', { action: data.action }] : null;
    default: return null;
  }
};
const announcePlayerAction = (name, data) => {
  try {
    const a = playerActionFor(name, data);
    if (a) window.dispatchEvent(new CustomEvent('cs-player-action', { detail: { name: a[0], props: a[1] } }));
  } catch {}
};

const invoke = base44.functions.invoke.bind(base44.functions);
base44.functions.invoke = async (name, data) => {
  announcePlayerAction(name, data);
  try {
    const res = await invoke(name, data);
    announceIfStale(res?.data);
    return res;
  } catch (err) {
    announceIfStale(err?.data);
    throw err;
  }
};
