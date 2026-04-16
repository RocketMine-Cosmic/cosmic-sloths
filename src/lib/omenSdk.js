import { OmenXGameSDK } from '@omen.foundation/game-sdk';

let _authData = null;
const _listeners = new Set();

const sdk = new OmenXGameSDK({
  gameId: 'cosmic-sloths',
  onAuth: (authData) => {
    console.log('Authenticated!', authData);
    _authData = authData;
    _listeners.forEach(fn => fn(authData));
  },
  onAuthError: (error) => console.error('Auth error:', error),
});

export const omenSdkReady = sdk.init();

export const getOmenAuthData = () => _authData;

export const onOmenAuth = (fn) => {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
};

export default sdk;