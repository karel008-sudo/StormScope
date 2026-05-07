import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { db } from './db.js'
import { initLogger, logger } from './logger.js'
import './index.css'

// Wire the persistent logger to Dexie before any subsystem starts emitting.
initLogger(db)

// Capture global errors into the persistent log so the LogViewer (admin
// dev tools) can surface them later, even if devtools weren't open.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    logger.error('global', 'Unhandled promise rejection', {
      message: reason?.message ?? String(reason),
      stack: reason?.stack?.slice(0, 600),
    })
  })
  const prevOnerror = window.onerror
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('global', 'Uncaught JS error', {
      message: typeof message === 'string' ? message : String(message),
      source,
      lineno,
      colno,
      stack: error?.stack?.slice(0, 600),
    })
    if (typeof prevOnerror === 'function') {
      try { return prevOnerror(message, source, lineno, colno, error) } catch {}
    }
  }
}

// Service worker — manual registration so we can:
//   1. set updateViaCache: 'none' (forces iOS to refetch sw.js every load)
//   2. detect *update* (not first install) and reload so the user sees fresh JS
//   3. guard against reload loops with a localStorage cooldown
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const RELOAD_KEY = 'stormscope:lastSWReload'
  const COOLDOWN_MS = 60_000
  const wasControlled = !!navigator.serviceWorker.controller

  const safeReadTs = () => {
    try {
      const raw = window.localStorage.getItem(RELOAD_KEY)
      const n = raw ? parseInt(raw, 10) : 0
      return Number.isFinite(n) ? n : 0
    } catch { return 0 }
  }
  const safeWriteTs = (v) => {
    try { window.localStorage.setItem(RELOAD_KEY, String(v)) } catch {}
  }

  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!wasControlled) return // first install, no reload needed
    if (reloading) return
    const last = safeReadTs()
    const elapsed = Date.now() - last
    if (last && elapsed < COOLDOWN_MS) {
      logger.warn('sw', 'controllerchange suppressed (cooldown)', { elapsed })
      return
    }
    reloading = true
    safeWriteTs(Date.now())
    logger.info('sw', 'controllerchange — reloading for new build')
    window.location.reload()
  })

  window.addEventListener('load', () => {
    // Vite serves the SW under the configured base — use BASE_URL so it
    // works on GitHub Pages subpath deploys.
    const swUrl = `${import.meta.env.BASE_URL}sw.js`
    navigator.serviceWorker
      .register(swUrl, { updateViaCache: 'none' })
      .then((reg) => {
        logger.info('sw', 'Service worker registered', { scope: reg.scope })
        try { reg.update() } catch {}
      })
      .catch((err) => logger.error('sw', 'SW registration failed', { message: err.message }))
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
