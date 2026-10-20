import React from 'react';
import { TOKEN_LOGO_URL, TOKEN_NAME } from '@/lib/branding';

// The one token logo every screen uses. Swap the logo in src/lib/branding.js.
export default function TokenIcon({ className = 'w-4 h-4' }) {
    return <img src={TOKEN_LOGO_URL} className={className} alt={TOKEN_NAME} />;
}
