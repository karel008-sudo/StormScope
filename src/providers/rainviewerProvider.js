// RainViewer provider — fetches public weather-maps metadata and produces a
// normalized list of past + nowcast frames usable by the timeline player.
//
// Public API (no auth required, free for personal use):
//   GET https://api.rainviewer.com/public/weather-maps.json
// Tile URL template (from response.host + frame.path):
//   {host}{path}/{size}/{z}/{x}/{y}/{color}/{smooth}_{snow}.png

import {
  RAINVIEWER_ENDPOINT,
  RAINVIEWER_TILE_SIZE,
  RAINVIEWER_COLOR,
  RAINVIEWER_SMOOTH,
  RAINVIEWER_SNOW,
} from '../constants.js'

export const RAINVIEWER_PROVIDER = {
  id: 'rainviewer',
  label: 'RainViewer',
  attribution:
    'Radar by <a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a>',
  capabilities: {
    past: true,
    nowcast: true,    // sometimes empty — handle gracefully
    lightning: false,
    satellite: false, // satellite arrays exist but vary in availability
  },
  // Used by Insights / Settings to set honest expectations
  limitations:
    'Approximately the last 2 hours of past frames at ~10-min cadence. Forecast frames (typically up to ~30 min ahead) are sometimes empty.',
}

/**
 * Fetch & normalize RainViewer metadata.
 * Throws on network / parse / timeout errors so caller can react.
 *
 * @param {AbortSignal} [signal] caller's abort signal (e.g. unmount)
 * @param {{ timeoutMs?: number }} [opts] timeout for slow networks (default 8 s)
 */
export async function fetchRainviewerMetadata(signal, { timeoutMs = 8_000 } = {}) {
  const timeoutCtrl = new AbortController()
  const timer = setTimeout(() => timeoutCtrl.abort(new Error('timeout')), timeoutMs)
  // Compose caller signal + timeout signal — abort on either
  const onAbort = () => timeoutCtrl.abort()
  if (signal) {
    if (signal.aborted) timeoutCtrl.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  try {
    const res = await fetch(RAINVIEWER_ENDPOINT, {
      signal: timeoutCtrl.signal,
      cache: 'no-cache',
      credentials: 'omit',
    })
    if (!res.ok) {
      throw new Error(`RainViewer metadata HTTP ${res.status}`)
    }
    const data = await res.json()
    if (!data || typeof data !== 'object') {
      throw new Error('RainViewer metadata: invalid response body')
    }
    return normalize(data)
  } catch (e) {
    if (e?.name === 'AbortError') {
      // surface timeout vs caller-cancel
      const reason = timeoutCtrl.signal.reason
      if (reason && reason.message === 'timeout') {
        const wrapped = new Error('RainViewer metadata: timed out')
        wrapped.name = 'TimeoutError'
        throw wrapped
      }
    }
    throw e
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

/**
 * Normalize a raw weather-maps.json payload.
 *
 * Defensive against:
 *   - missing/null `radar`, `radar.past`, `radar.nowcast`
 *   - missing `host`
 *   - missing `generated`
 *   - frames with missing `time` or `path`
 *   - frames in wrong order
 *   - duplicate frames
 *
 * @returns {{
 *   frames: Frame[],
 *   pastCount: number,
 *   nowcastCount: number,
 *   host: string,
 *   generatedAt: number,
 *   hasNowcast: boolean,
 *   version: string|null,
 *   raw: object
 * }}
 */
export function normalize(raw) {
  const safeRaw = raw && typeof raw === 'object' ? raw : {}
  const host = typeof safeRaw.host === 'string' && safeRaw.host
    ? safeRaw.host.replace(/\/+$/, '')
    : 'https://tilecache.rainviewer.com'

  const generatedAt = Number.isFinite(Number(safeRaw.generated))
    ? Number(safeRaw.generated)
    : Math.floor(Date.now() / 1000)

  const radar = safeRaw.radar && typeof safeRaw.radar === 'object' ? safeRaw.radar : {}
  const past = sanitizeFrameList(radar.past)
  const nowcast = sanitizeFrameList(radar.nowcast)

  const pastFrames = past.map((f, i) => toFrame(f, 'past', i, generatedAt))
  const nowcastFrames = nowcast.map((f, i) => toFrame(f, 'nowcast', i, generatedAt))
  if (pastFrames.length) {
    pastFrames[pastFrames.length - 1].isNowCandidate = true
  }

  return {
    frames: [...pastFrames, ...nowcastFrames],
    pastCount: pastFrames.length,
    nowcastCount: nowcastFrames.length,
    host,
    generatedAt,
    hasNowcast: nowcastFrames.length > 0,
    version: typeof safeRaw.version === 'string' ? safeRaw.version : null,
    raw: safeRaw,
  }
}

function sanitizeFrameList(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []
  for (const f of list) {
    if (!f || typeof f !== 'object') continue
    const time = Number(f.time)
    const path = typeof f.path === 'string' ? f.path : null
    if (!Number.isFinite(time) || time <= 0) continue
    if (!path) continue
    const key = `${time}|${path}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ time, path })
  }
  out.sort((a, b) => a.time - b.time)
  return out
}

function toFrame(f, type, idx, generatedAt) {
  const time = f.time
  return {
    id: `rv:${type}:${idx}:${time}`,
    provider: 'rainviewer',
    type,
    time,
    path: f.path,
    label: type === 'nowcast'
      ? `+${Math.max(0, Math.round((time - generatedAt) / 60))} min`
      : formatHHMM(time),
    isNowCandidate: false,
  }
}

function formatHHMM(ts) {
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Build a Leaflet tile URL template for a given frame and tile options.
 * Returns null if frame or host is missing — callers should not render a layer.
 */
export function buildTileUrl(host, frame, opts = {}) {
  if (!host || !frame || !frame.path) return null
  const size = opts.size ?? RAINVIEWER_TILE_SIZE
  const color = opts.color ?? RAINVIEWER_COLOR
  const smooth = opts.smooth ?? RAINVIEWER_SMOOTH
  const snow = opts.snow ?? RAINVIEWER_SNOW
  return `${host}${frame.path}/${size}/{z}/{x}/{y}/${color}/${smooth}_${snow}.png`
}

/**
 * Returns true if metadata is older than `maxAgeSeconds` seconds.
 * Used to surface a "stale" indicator when offline / cached.
 */
export function isStale(generatedAt, maxAgeSeconds = 15 * 60) {
  if (!Number.isFinite(generatedAt)) return true
  const age = Date.now() / 1000 - generatedAt
  return age > maxAgeSeconds
}

/**
 * Available RainViewer color schemes.
 * https://www.rainviewer.com/api/weather-maps-api.html
 */
export const RAINVIEWER_COLOR_SCHEMES = [
  { value: 0, label: 'BW Black & White' },
  { value: 1, label: 'Original' },
  { value: 2, label: 'Universal Blue' },
  { value: 3, label: 'TITAN' },
  { value: 4, label: 'The Weather Channel' },
  { value: 5, label: 'Meteored' },
  { value: 6, label: 'NEXRAD III' },
  { value: 7, label: 'Rainbow @ SELEX-IS' },
  { value: 8, label: 'Dark Sky' },
]
