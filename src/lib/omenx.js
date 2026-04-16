import { OmenXGameSDK } from '@omen.foundation/game-sdk';

export const omenx = new OmenXGameSDK({
  gameId: 'cosmic-sloths',
  onAuth: (authData) => {
    console.log('[OmenX] Authenticated', authData);
  },
  onAuthError: (err) => {
    console.error('[OmenX] Auth error', err);
  },
  onLogout: () => {
    console.log('[OmenX] Logged out');
  },
});

export const initOmenX = () => omenx.init();