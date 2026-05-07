import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// Service worker — manual registration so we can:
//   1. set updateViaCache: 'none' (forces iOS to refetch sw.js every load)
//   2. detect *update* (not first install) and reload so the user sees fresh JS
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // True at the moment of script execution = there was already a SW controlling
  // this page = next controllerchange means a NEW worker took over.
  const wasControlled = !!navigator.serviceWorker.controller

  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!wasControlled) return // first install, no reload needed
    if (reloading) return
    reloading = true
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
