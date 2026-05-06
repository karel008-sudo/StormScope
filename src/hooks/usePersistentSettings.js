import { useEffect, useState, useCallback } from 'react'
import { loadSettings, saveSettings, resetSettings, DEFAULT_SETTINGS } from '../db.js'
import { setHapticsEnabled } from '../haptic.js'

/**
 * Persistent app settings. Reads from Dexie on mount; writes through on every
 * update. Returns [settings, setSetting, resetAll, ready].
 */
export function usePersistentSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    loadSettings().then((s) => {
      if (!mounted) return
      setSettings(s)
      setHapticsEnabled(s.hapticsEnabled !== false)
      setReady(true)
    })
    return () => { mounted = false }
  }, [])

  const update = useCallback(async (partial) => {
    const next = await saveSettings(partial)
    setSettings(next)
    if (Object.prototype.hasOwnProperty.call(partial, 'hapticsEnabled')) {
      setHapticsEnabled(next.hapticsEnabled !== false)
    }
    return next
  }, [])

  const reset = useCallback(async () => {
    const next = await resetSettings()
    setSettings(next)
    setHapticsEnabled(next.hapticsEnabled !== false)
    return next
  }, [])

  return { settings, update, reset, ready }
}
