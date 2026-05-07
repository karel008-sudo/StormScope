import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// Service worker — manual registration so we can:
//   1. set updateViaCache: 'none' (forces iOS to refetch sw.js every load)
//   2. detect *update* (not first install) and reload so the user sees fresh JS
//   3. guard against reload loops with a localStorage cooldown
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const RELOAD_KEY = 'stormscope:lastSWReload'
  const COOLDOWN_MS = 60_000
  // True at the moment of script execution = there was already a SW controlling
  // this page = next controllerchange means a NEW worker took over.
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
      // We just reloaded recently — refuse another reload to break any loop.
      // The user can still pull-to-refresh manually.
      return
    }
    reloading = true
    safeWriteTs(Date.now())
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        try { reg.update() } catch {}
      })
      .catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
