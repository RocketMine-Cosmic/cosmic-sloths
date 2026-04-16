import { OmenXGameSDK } from '@omen.foundation/game-sdk';

let _authData = null;
const _listeners = new Set();

let sdk = null;

try {
  sdk = new OmenXGameSDK({
    gameId: 'cosmic-sloths',
    onAuth: (authData) => {
      console.log('[OmenX] Authenticated!', authData);
      _authData = authData;
      _listeners.forEach(fn => fn(authData));
    },
    onAuthError: (error) => console.error('[OmenX] Auth error:', error),
  });

  sdk.init().catch(e => console.error('[OmenX] init error:', e));
} catch (e) {
  console.error('[OmenX] SDK construction error:', e);
}

export const getOmenAuthData = () => _authData;

export const onOmenAuth = (fn) => {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
};

export default sdk;