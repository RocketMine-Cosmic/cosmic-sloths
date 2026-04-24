import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export function useSessionValidator() {
    const [sessionStatus, setSessionStatus] = useState({
        isActive: true,
        supersededTime: null,
        warning: null
    });

    useEffect(() => {
        // Session validation disabled — too expensive on OmenX API quota with multi-tab
        // If needed in future, only validate on explicit logout/re-login, not polling
        return;
    }, []);

    return sessionStatus;
}