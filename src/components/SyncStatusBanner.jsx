import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// Listens for syncFailed (SaveManager) and walletLinkFailed (Base44AuthLinker)
// events and shows a dismissible warning at the top of the screen so players
// know cloud saves are not working.
export default function SyncStatusBanner() {
    const [warning, setWarning] = useState(null);

    useEffect(() => {
        const onSyncFailed = (e) => {
            const reason = e.detail?.reason;
            setWarning({
                title: 'Cloud save failed',
                message: reason === 'network_error'
                    ? 'Could not reach the server. Your progress is saved locally and will sync when reconnected.'
                    : 'Your progress is saved locally but could not sync to the cloud. Try refreshing.',
            });
        };
        const onLinkFailed = () => {
            setWarning({
                title: 'Cloud saves disabled',
                message: 'Could not link your wallet to your account. Refresh the page to retry — your local progress is safe.',
            });
        };
        window.addEventListener('syncFailed', onSyncFailed);
        window.addEventListener('walletLinkFailed', onLinkFailed);
        return () => {
            window.removeEventListener('syncFailed', onSyncFailed);
            window.removeEventListener('walletLinkFailed', onLinkFailed);
        };
    }, []);

    if (!warning) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[10000] flex justify-center px-3 pt-3 pointer-events-none">
            <div className="pointer-events-auto max-w-md w-full bg-amber-950/95 border-2 border-amber-500 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.3)] backdrop-blur-md p-3 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <div className="text-amber-200 font-bold text-sm">{warning.title}</div>
                    <div className="text-amber-300/80 text-xs mt-0.5 leading-snug">{warning.message}</div>
                </div>
                <button
                    onClick={() => setWarning(null)}
                    className="text-amber-400 hover:text-amber-200 transition-colors shrink-0"
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}