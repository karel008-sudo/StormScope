import { useCallback, useEffect, useRef, useState } from 'react'
import { rememberLocation, loadLastLocation } from '../db.js'

/**
 * Geolocation hook with three states:
 *  - status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error' | 'unsupported'
 *  - position: { lat, lng, accuracy, ts } | null
 *  - request(): triggers a one-shot geolocation request
 *  - watch(start): starts a watchPosition session
 *
 * The hook auto-restores the last successful location from Dexie on mount,
 * so we can render a centered map immediately without waiting for a fix.
 */
export function useGeolocation({ autoRestoreCached = true } = {}) {
  const [status, setStatus] = useState('idle')
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const watchIdRef = useRef(null)

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
    if (err.code === err.PERMISSION_DENIED) setStatus('denied')
    else setStatus('error')
    setError({ code: err.code, message: err.message })
  }, [])

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    setError(null)
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
