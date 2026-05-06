import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRainviewerMetadata, normalize } from '../providers/rainviewerProvider.js'
import { cacheMetadata, loadCachedMetadata } from '../db.js'
import { METADATA_REFRESH_MS } from '../constants.js'

/**
 * Manages RainViewer metadata lifecycle.
 *
 * State:
 *   loading      — first load in progress
 *   refreshing   — background refresh in progress
 *   error        — last error message (null if no error)
 *   data         — normalized metadata { frames, host, generatedAt, hasNowcast, ... }
 *   fromCache    — true if data came from Dexie cache (no fresh network)
 *   lastFetchAt  — ms timestamp of last successful network fetch
 *
 * Auto-refreshes every METADATA_REFRESH_MS while the document is visible.
 */
export function useRainViewerFrames() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [lastFetchAt, setLastFetchAt] = useState(null)
  const abortRef = useRef(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController()
    abortRef.current = ac
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const meta = await fetchRainviewerMetadata(ac.signal)
      setData(meta)
      setError(null)
      setFromCache(false)
      setLastFetchAt(Date.now())
      // best-effort cache update
      cacheMetadata(meta.raw).catch(() => {})
      return meta
    } catch (e) {
      if (e?.name === 'AbortError') return null
      setError(e.message || 'Failed to fetch radar metadata')
      // Fall back to cached metadata if available
      const cached = await loadCachedMetadata()
      if (cached?.metadata && !data) {
        try {
          const meta = normalize(cached.metadata)
          setData(meta)
          setFromCache(true)
        } catch {}
      }
      return null
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }, [data])

  // Initial load
  useEffect(() => {
    refresh({ silent: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Periodic refresh while visible
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

  return { data, loading, refreshing, error, fromCache, lastFetchAt, refresh }
}
