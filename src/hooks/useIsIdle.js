import { useEffect, useState } from 'react';

// Returns true after `timeoutMs` of no user interaction (mouse/keyboard/touch/scroll)
// or while the tab is hidden. Resets to false on any activity / tab focus.
// Used to pause expensive polling for users who walk away.
export function useIsIdle(timeoutMs = 5 * 60 * 1000) {
    const [idle, setIdle] = useState(false);

    useEffect(() => {
        let timer = null;
        const reset = () => {
            if (idle) setIdle(false);
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => setIdle(true), timeoutMs);
        };
        const onVisibility = () => {
            if (document.hidden) {
                setIdle(true);
                if (timer) clearTimeout(timer);
            } else {
                reset();
            }
        };

        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
        events.forEach(e => window.addEventListener(e, reset, { passive: true }));
        document.addEventListener('visibilitychange', onVisibility);

        reset(); // start the timer

        return () => {
            if (timer) clearTimeout(timer);
            events.forEach(e => window.removeEventListener(e, reset));
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [timeoutMs, idle]);

    return idle;
}