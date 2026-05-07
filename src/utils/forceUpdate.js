// Best-effort "force update": unregister all service workers, drop every cache
// the browser holds for this origin, and reload from network.
// Returns a small report so the caller can log it before the page navigates.

export async function forceUpdateApp({ logger } = {}) {
  const report = { caches: 0, swUnregistered: 0, errors: [] }

  if (typeof window === 'undefined') return report

  if ('caches' in window) {
    try {
      const keys = await window.caches.keys()
      for (const k of keys) {
        try { await window.caches.delete(k) } catch (e) { report.errors.push(`cache:${k}:${e.message}`) }
      }
      report.caches = keys.length
    } catch (e) {
      report.errors.push(`caches.keys:${e.message}`)
    }
  }

  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) {
        try { await reg.unregister() } catch (e) { report.errors.push(`unregister:${e.message}`) }
      }
      report.swUnregistered = regs.length
    } catch (e) {
      report.errors.push(`getRegistrations:${e.message}`)
    }
  }

  // Bust the SW cooldown so the next register actually runs.
  try { window.localStorage.removeItem('stormscope:lastSWReload') } catch {}

  if (logger) logger.info('sw', 'Force update triggered', report)

  // Hard reload bypasses the SW (which is now unregistered) and the HTTP cache
  // because we set Cache-Control: no-store on index.html / sw.js via netlify
  // headers historically; on Pages we rely on hash-named JS/CSS so a normal
  // reload picks the new HTML which references the new assets.
  setTimeout(() => {
    try { window.location.reload() } catch {}
  }, 80)

  return report
}
