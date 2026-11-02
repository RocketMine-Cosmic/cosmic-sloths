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
const invoke = base44.functions.invoke.bind(base44.functions);
base44.functions.invoke = async (name, data) => {
  try {
    const res = await invoke(name, data);
    announceIfStale(res?.data);
    return res;
  } catch (err) {
    announceIfStale(err?.data);
    throw err;
  }
};
