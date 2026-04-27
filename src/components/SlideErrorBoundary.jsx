import React from 'react';

// Catches dynamic-import failures from React.lazy (e.g. Vite dev-server 504s,
// network blips). Shows a retry button instead of crashing the carousel.
export default class SlideErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        console.warn('[SlideErrorBoundary] caught', error?.message || error);
    }

    handleRetry = () => {
        // Force a fresh import attempt by reloading the page.
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <div className="text-4xl">⚠️</div>
                    <div className="text-slate-300 text-sm max-w-xs">
                        This page failed to load. The dev server may be busy.
                    </div>
                    <button
                        onClick={this.handleRetry}
                        className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold px-4 py-2 rounded-lg border border-fuchsia-400/50 transition-colors"
                    >
                        Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}