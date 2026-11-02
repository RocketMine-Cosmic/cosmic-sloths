import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// The sign-in hand-off pages in index.html (/auth/omen-start, /auth/frame-return) are on their way
// somewhere else: don't boot the whole game on them (F-002).
if (!window.__CS_AUTH_HANDOFF) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  )
}
