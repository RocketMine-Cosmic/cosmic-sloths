import { OmenXGameSDK } from '@omen.foundation/game-sdk';

const sdk = new OmenXGameSDK({
  gameId: 'cosmic-sloths',
  onAuth: (authData) => console.log('Authenticated!', authData),
  onAuthError: (error) => console.error('Auth error:', error),
});

export const omenSdkReady = sdk.init();

export default sdk;