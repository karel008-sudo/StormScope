import { useCallback, useEffect, useRef, useState } from 'react'
import { rememberLocation, loadLastLocation } from '../db.js'

/**
 * Geolocation hook with these states:
 *  - status: 'idle' | 'requesting' | 'granted' | 'denied' | 'os-blocked' | 'error' | 'unsupported'
 *  - position: { lat, lng, accuracy, ts, cached } | null
 *  - request(): one-shot geolocation request
 *  - watch(start): start/stop watchPosition
 *
 * Behavior notes:
 *  - Cached last-known location is restored only into a still-empty position
 *    slot (functional setState), so it cannot overwrite a fresh GPS fix.
 *  - "os-blocked" is detected heuristically: a PERMISSION_DENIED that comes
 *    back faster than 250 ms means the browser already had a cached "no",
 *    which on iOS / macOS Safari typically means location is disabled at the
 *    OS or browser level — re-prompting will silently fail forever until the
 *    user changes Settings. We surface a guidance message instead.
 */
const FAST_DENY_MS = 250

export function useGeolocation({ autoRestoreCached = true } = {}) {
  const [status, setStatus] = useState('idle')
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const watchIdRef = useRef(null)
  const reqStartRef = useRef(null)

  // Restore cached location for instant centering — only if a fresh fix has
  // not already been written by request()/watch(). Without this guard, the
  // cached resolve can race ahead and overwrite a fresh GPS fix.
  useEffect(() => {
    if (!autoRestoreCached) return
    let mounted = true
    loadLastLocation().then((p) => {
      if (!mounted || !p) return
      setPosition((prev) => prev || { lat: p.lat, lng: p.lng, accuracy: null, ts: p.savedAt, cached: true })
    })
    return () => { mounted = false }
  }, [autoRestoreCached])

  const handleSuccess = useCallback((pos) => {
    const p = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      ts: pos.timestamp || Date.now(),
      cached: false,
    }
    setPosition(p)
    setStatus('granted')
    setError(null)
    rememberLocation(p.lat, p.lng).catch(() => {})
  }, [])

  const handleError = useCallback((err) => {
    const elapsed = reqStartRef.current ? Date.now() - reqStartRef.current : Infinity
    const fastDeny = err.code === err.PERMISSION_DENIED && elapsed < FAST_DENY_MS
    if (err.code === err.PERMISSION_DENIED) {
      setStatus(fastDeny ? 'os-blocked' : 'denied')
    } else {
      setStatus('error')
    }
    setError({ code: err.code, message: err.message, elapsed })
  }, [])

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    setError(null)
    reqStartRef.current = Date.now()
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 12_000,
    })
  }, [handleSuccess, handleError])

  const watch = useCallback((start) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    if (start) {
      if (watchIdRef.current != null) return
      setStatus('requesting')
      reqStartRef.current = Date.now()
      watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 20_000,
      })
    } else {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [handleSuccess, handleError])

  useEffect(() => () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  return { status, position, error, request, watch }
}
