import { useEffect, useState } from 'react';
import { AlertTriangle, X, RefreshCw, Check } from 'lucide-react';
import { SaveManager } from '../game/SaveManager';

// Listens for syncFailed (SaveManager) and walletLinkFailed (Base44AuthLinker)
// events and shows a dismissible warning at the top of the screen so players
// know cloud saves are not working. Sync failures get a "Retry now" button
// that runs an immediate (debounce-skipping) sync attempt.
export default function SyncStatusBanner() {
    const [warning, setWarning] = useState(null);
    const [retrying, setRetrying] = useState(false);
    const [retrySuccess, setRetrySuccess] = useState(false);

    useEffect(() => {
        const onSyncFailed = (e) => {
            const reason = e.detail?.reason;
            setRetrySuccess(false);
            setWarning({
                kind: 'sync',
                title: 'Cloud save failed',
                message: reason === 'network_error'
                    ? 'Could not reach the server. Your progress is saved locally — try again when reconnected.'
                    : 'Your progress is saved locally but could not sync to the cloud.',
            });
        };
        const onLinkFailed = () => {
            setWarning({
                kind: 'link',
                title: 'Cloud saves disabled',
                message: 'Could not link your wallet to your account. Refresh the page to retry — your local progress is safe.',
            });
        };
        // Auto-dismiss the banner once a sync goes through (e.g. after the
        // user comes back online and the next save() succeeds).
        const onSyncSuccess = () => setWarning(null);
        window.addEventListener('syncFailed', onSyncFailed);
        window.addEventListener('walletLinkFailed', onLinkFailed);
        window.addEventListener('saveSyncSuccess', onSyncSuccess);
        return () => {
            window.removeEventListener('syncFailed', onSyncFailed);
            window.removeEventListener('walletLinkFailed', onLinkFailed);
            window.removeEventListener('saveSyncSuccess', onSyncSuccess);
        };
    }, []);

    const handleRetry = async () => {
        if (retrying) return;
        setRetrying(true);
        setRetrySuccess(false);
        try {
            await SaveManager.syncToBackendImmediate();
            // syncToBackendImmediate fires saveSyncSuccess on success which clears
            // the banner via the listener. If we got here without that firing,
            // it means another syncFailed event already replaced the warning.
            setRetrySuccess(true);
            // Brief success flash before the banner is dismissed by the success listener
            setTimeout(() => setRetrySuccess(false), 1500);
        } catch {
            // syncFailed listener will refresh the warning copy.
        } finally {
            setRetrying(false);
        }
    };

    if (!warning) return null;

    const isSync = warning.kind === 'sync';

    return (
        <div className="fixed top-0 left-0 right-0 z-[10000] flex justify-center px-3 pt-3 pointer-events-none">
            <div className="pointer-events-auto max-w-md w-full bg-amber-950/95 border-2 border-amber-500 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.3)] backdrop-blur-md p-3 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <div className="text-amber-200 font-bold text-sm">{warning.title}</div>
                    <div className="text-amber-300/80 text-xs mt-0.5 leading-snug">{warning.message}</div>
                    {isSync && (
                        <button
                            onClick={handleRetry}
                            disabled={retrying}
                            className="mt-2 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 disabled:cursor-not-allowed text-amber-950 font-bold text-xs px-3 py-1.5 rounded transition-colors"
                        >
                            {retrySuccess ? (
                                <><Check className="w-3.5 h-3.5" /> Synced</>
                            ) : retrying ? (
                                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Retrying…</>
                            ) : (
                                <><RefreshCw className="w-3.5 h-3.5" /> Retry now</>
                            )}
                        </button>
                    )}
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