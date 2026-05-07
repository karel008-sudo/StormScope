import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'stormscope:admin'
const TAPS_REQUIRED = 7
const TAPS_WINDOW_MS = 3_000

function readPersisted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writePersisted(v) {
  try {
    if (v) window.localStorage.setItem(STORAGE_KEY, '1')
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

/**
 * Admin / developer mode gate.
 *
 * Returns:
 *   admin    — boolean
 *   register — call on each tap of the secret target (e.g. version label)
 *              within a 3 s rolling window. After 7 taps:
 *                - off → on  (returns 'enabled')
 *                - on  → off (returns 'disabled')
 *              Other return values: 'tap' (tap counted) or 'idle' (window expired)
 *   reset    — explicitly disable
 *   forceEnable / forceDisable — programmatic toggles (e.g. URL flag)
 */
export function useAdmin() {
  const [admin, setAdmin] = useState(() => readPersisted())
  const tapsRef = useRef([]) // timestamps within rolling window

  // URL flag: ?admin=1 enables; ?admin=0 disables. Useful for QA without taps.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.has('admin')) {
      const v = params.get('admin') === '1'
      writePersisted(v)
      setAdmin(v)
    }
  }, [])

  const register = useCallback(() => {
    const now = Date.now()
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < TAPS_WINDOW_MS), now]
    if (tapsRef.current.length >= TAPS_REQUIRED) {
      tapsRef.current = []
      const next = !admin
      writePersisted(next)
      setAdmin(next)
      return next ? 'enabled' : 'disabled'
    }
    return 'tap'
  }, [admin])

  const reset = useCallback(() => {
    writePersisted(false)
    setAdmin(false)
    tapsRef.current = []
  }, [])

  const forceEnable = useCallback(() => {
    writePersisted(true)
    setAdmin(true)
  }, [])

  const forceDisable = useCallback(() => {
    writePersisted(false)
    setAdmin(false)
  }, [])

  return { admin, register, reset, forceEnable, forceDisable, tapsRequired: TAPS_REQUIRED }
}
