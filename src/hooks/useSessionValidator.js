import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export function useSessionValidator() {
    const [sessionStatus, setSessionStatus] = useState({
        isActive: true,
        supersededTime: null,
        warning: null
    });

    useEffect(() => {
        const getAuthData = () => {
            try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
        };

        const getSessionId = () => {
            try { return JSON.parse(localStorage.getItem('omenx_session_data'))?.sessionId; } catch { return null; }
        };

        const validateSession = async () => {
            const auth = getAuthData();
            const sessionId = getSessionId();

            if (!auth?.walletAddress || !auth?.accessToken || !sessionId) {
                return;
            }

            try {
                const res = await base44.functions.invoke('validateSession', {
                    walletAddress: auth.walletAddress,
                    accessToken: auth.accessToken,
                    sessionId: sessionId
                });

                if (!res.data?.isActive) {
                    // This session was superseded
                    setSessionStatus({
                        isActive: false,
                        supersededTime: res.data?.lastActiveTime || Date.now(),
                        warning: `You're logged in from another device. Current session will be read-only in 60 seconds.`
                    });
                } else {
                    setSessionStatus({
                        isActive: true,
                        supersededTime: null,
                        warning: null
                    });
                }
            } catch (e) {
                // Network error — assume session is still active
                console.error('[useSessionValidator]', e.message);
            }
        };

        // Check every 120 seconds (only on focus after initial check)
        validateSession();
        const interval = setInterval(validateSession, 120000);

        // Also check when tab regains focus
        const onFocus = () => validateSession();
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    return sessionStatus;
}