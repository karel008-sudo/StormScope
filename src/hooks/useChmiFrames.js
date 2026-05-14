import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchChmiIndex, normalize, isStale } from '../providers/chmiProvider.js'
import { METADATA_REFRESH_MS } from '../constants.js'

const CHMI_CACHE_KEY = 'chmi:index:v1'

/**
 * Manages ČHMÚ index lifecycle. Mirrors useRainViewerFrames API:
 *   { data, loading, refreshing, error, fromCache, stale, lastFetchAt, refresh }
 *
 * - Polls every METADATA_REFRESH_MS while document is visible
 * - Caches the last raw index in localStorage so the offline shell still
 *   has frames to play
 * - Returns null `data` and no error while disabled (caller can short-circuit)
 *
 * @param {{ enabled?: boolean }} [opts] when enabled=false, the hook
 *   neither fetches nor polls; useful for the Settings toggle.
 */
export function useChmiFrames({ enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [lastFetchAt, setLastFetchAt] = useState(null)
  const abortRef = useRef(null)
  const dataRef = useRef(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) return null
    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController()
    abortRef.current = ac
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const meta = await fetchChmiIndex(ac.signal)
      dataRef.current = meta
      setData(meta)
      setError(null)
      setFromCache(false)
      setLastFetchAt(Date.now())
      try { localStorage.setItem(CHMI_CACHE_KEY, JSON.stringify(meta.raw)) } catch {}
      return meta
    } catch (e) {
      if (e?.name === 'AbortError') return null
      setError(e?.message || 'Failed to fetch ČHMÚ index')
      // Fall back to cached index once
      if (!dataRef.current) {
        try {
          const cached = localStorage.getItem(CHMI_CACHE_KEY)
          if (cached) {
            const meta = normalize(JSON.parse(cached))
            dataRef.current = meta
            setData(meta)
            setFromCache(true)
          }
        } catch {}
      }
      return null
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }, [enabled])

  // Initial load + reset when enabled flips.
  useEffect(() => {
    if (!enabled) {
      // Caller turned the layer off — clear state so the timeline doesn't
      // show stale ČHMÚ frames if it gets re-toggled later.
      if (abortRef.current) abortRef.current.abort()
      setData(null)
      setError(null)
      setFromCache(false)
      setLoading(false)
      setRefreshing(false)
      dataRef.current = null
      return
    }
    refresh({ silent: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // Periodic refresh while document is visible + on tab show.
  useEffect(() => {
    if (!enabled) return
    if (typeof document === 'undefined') return
    let timer = null
    const start = () => {
      if (timer != null) return
      timer = setInterval(() => refresh({ silent: true }), METADATA_REFRESH_MS)
    }
    const stop = () => {
      if (timer != null) {
        clearInterval(timer)
        timer = null
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh({ silent: true })
        start()
      } else {
        stop()
      }
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [enabled, refresh])

  const stale = !!(data && isStale(data.generatedAt))

  return { data, loading, refreshing, error, fromCache, stale, lastFetchAt, refresh }
}
