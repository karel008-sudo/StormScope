import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchOpenMeteoForecast } from '../providers/openMeteoProvider.js'

const REFRESH_MS = 5 * 60 * 1000   // re-fetch every 5 minutes
const MOVE_THRESHOLD_DEG = 0.05    // refetch immediately if user moves ~5 km

/**
 * useOpenMeteoForecast(position)
 *
 * - Fetches a 2-hour 15-min precipitation forecast for the given position
 *   (lat/lng). When position changes meaningfully, refetches.
 * - Auto-refresh every 5 minutes while document is visible.
 * - Returns: { data, loading, refreshing, error }
 *
 * data shape: { buckets: [...], fetchedAt, summary }
 */
export function useOpenMeteoForecast(position) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)
  const lastSigRef = useRef(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!position || typeof position.lat !== 'number' || typeof position.lng !== 'number') return
    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController()
    abortRef.current = ac
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const out = await fetchOpenMeteoForecast(position.lat, position.lng, ac.signal)
      setData(out)
      setError(null)
      return out
    } catch (e) {
      if (e?.name === 'AbortError') return null
      setError(e?.message || 'Open-Meteo fetch failed')
      return null
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }, [position])

  // Initial / move-triggered fetch
  useEffect(() => {
    if (!position) return
    const sig = `${position.lat.toFixed(3)},${position.lng.toFixed(3)}`
    const moved =
      !lastSigRef.current ||
      Math.abs(parseFloat(sig.split(',')[0]) - parseFloat(lastSigRef.current.split(',')[0])) > MOVE_THRESHOLD_DEG ||
      Math.abs(parseFloat(sig.split(',')[1]) - parseFloat(lastSigRef.current.split(',')[1])) > MOVE_THRESHOLD_DEG
    if (moved) {
      lastSigRef.current = sig
      refresh({ silent: !!data })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position])

  // Periodic refresh while visible
  useEffect(() => {
    if (typeof document === 'undefined') return
    let timer = null
    const start = () => {
      if (timer != null) return
      timer = setInterval(() => refresh({ silent: true }), REFRESH_MS)
    }
    const stop = () => {
      if (timer != null) {
        clearInterval(timer)
        timer = null
      }
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        refresh({ silent: true })
        start()
      } else {
        stop()
      }
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      stop()
    }
  }, [refresh])

  return { data, loading, refreshing, error, refresh }
}
