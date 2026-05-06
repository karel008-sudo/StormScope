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
  attribution: 'Radar by <a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a>',
  capabilities: {
    past: true,
    nowcast: true,    // sometimes empty — handle gracefully
    lightning: false,
    satellite: false, // satellite arrays exist in API but often empty in free tier
  },
}

/**
 * Fetch & normalize RainViewer metadata.
 * Throws on network / parse errors so caller can react.
 *
 * @returns {Promise<{
 *   frames: Frame[],
 *   pastCount: number,
 *   nowcastCount: number,
 *   host: string,
 *   generatedAt: number,
 *   hasNowcast: boolean,
 *   raw: object
 * }>}
 */
export async function fetchRainviewerMetadata(signal) {
  const res = await fetch(RAINVIEWER_ENDPOINT, {
    signal,
    cache: 'no-cache',
    credentials: 'omit',
  })
  if (!res.ok) {
    throw new Error(`RainViewer metadata HTTP ${res.status}`)
  }
  const data = await res.json()
  return normalize(data)
}

export function normalize(raw) {
  const host = (raw && raw.host) || 'https://tilecache.rainviewer.com'
  const generatedAt = Number(raw?.generated) || Math.floor(Date.now() / 1000)
  const past = Array.isArray(raw?.radar?.past) ? raw.radar.past : []
  const nowcast = Array.isArray(raw?.radar?.nowcast) ? raw.radar.nowcast : []

  const pastFrames = past.map((f, i) => toFrame(f, 'past', i, generatedAt))
  const nowcastFrames = nowcast.map((f, i) => toFrame(f, 'nowcast', i, generatedAt))
  // Mark the latest past frame as the "Now" candidate
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
    raw,
  }
}

function toFrame(f, type, idx, generatedAt) {
  const time = Number(f?.time) || 0
  return {
    id: `rv:${type}:${idx}:${time}`,
    provider: 'rainviewer',
    type,
    time,
    path: String(f?.path || ''),
    label: type === 'nowcast' ? `+${Math.round((time - generatedAt) / 60)} min` : labelFromTs(time),
    isNowCandidate: false,
  }
}

function labelFromTs(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Build a Leaflet tile URL template for a given frame and tile options.
 */
export function buildTileUrl(host, frame, opts = {}) {
  const size = opts.size ?? RAINVIEWER_TILE_SIZE
  const color = opts.color ?? RAINVIEWER_COLOR
  const smooth = opts.smooth ?? RAINVIEWER_SMOOTH
  const snow = opts.snow ?? RAINVIEWER_SNOW
  // Leaflet substitutes {z}/{x}/{y} at tile fetch time
  return `${host}${frame.path}/${size}/{z}/{x}/{y}/${color}/${smooth}_${snow}.png`
}
