import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchRainviewerMetadata, normalize, isStale,
} from '../providers/rainviewerProvider.js'
import { cacheMetadata, loadCachedMetadata } from '../db.js'
import { METADATA_REFRESH_MS } from '../constants.js'

/**
 * Manages RainViewer metadata lifecycle.
 *
 * State:
 *   loading      — first load in progress
 *   refreshing   — background refresh in progress
 *   error        — last error message (null if no error)
 *   data         — normalized metadata
 *   fromCache    — true if data came from Dexie cache (no fresh network)
 *   stale        — generated > 15 min ago (irrespective of fromCache)
 *   lastFetchAt  — ms timestamp of last successful network fetch
 */
export function useRainViewerFrames() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [lastFetchAt, setLastFetchAt] = useState(null)
  const abortRef = useRef(null)
  const dataRef = useRef(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController()
    abortRef.current = ac
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const meta = await fetchRainviewerMetadata(ac.signal)
      dataRef.current = meta
      setData(meta)
      setError(null)
      setFromCache(false)
      setLastFetchAt(Date.now())
      cacheMetadata(meta.raw).catch(() => {})
      return meta
    } catch (e) {
      if (e?.name === 'AbortError') return null
      setError(e?.message || 'Failed to fetch radar metadata')
      // Fall back to cached metadata once
      if (!dataRef.current) {
        const cached = await loadCachedMetadata()
        if (cached?.metadata) {
          try {
            const meta = normalize(cached.metadata)
            dataRef.current = meta
            setData(meta)
            setFromCache(true)
          } catch {}
        }
      }
      return null
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    refresh({ silent: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Periodic refresh while document is visible + refresh on tab show
  useEffect(() => {
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
  }, [refresh])

  const stale = !!(data && isStale(data.generatedAt))

  return { data, loading, refreshing, error, fromCache, stale, lastFetchAt, refresh }
}
