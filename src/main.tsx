import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/capacitor'
import * as SentryReact from '@sentry/react'
import './index.css'
import App from './App.tsx'

const dsn = import.meta.env.VITE_SENTRY_DSN
if (typeof dsn === 'string' && dsn.trim().length > 0) {
  Sentry.init(
    {
      dsn: dsn.trim(),
      environment: import.meta.env.MODE,
      tracesSampleRate: 0,
    },
    SentryReact.init,
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
