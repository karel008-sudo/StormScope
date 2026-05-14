// ČHMÚ provider — fetches the index.json published by the chmi-poller
// GitHub Action and produces a normalized list of past + nowcast frames
// with the same shape RainViewerProvider produces, so the timeline player
// stays provider-agnostic.
//
// Data shape on the wire (chmi-poller/poll.mjs writes this):
//   {
//     schema: 2,
//     generatedAt: <unix-seconds>,
//     bbox:  [west, south, east, north],
//     pixel: { width, height },
//     pastCount, nowcastCount,
//     frames: [
//       { sourceName, type: 'past'|'nowcast', time, leadMin, sha,
//         sizeBytes, url }, ...
//     ],
//     source: { ... attribution + license ... }
//   }
//
// Each frame's `url` is already an absolute jsDelivr URL — the frontend
// drops it straight into a Leaflet ImageOverlay.

import { CHMI_INDEX_URL, CHMI_INDEX_URL_FALLBACK, CHMI_DATA_BBOX } from '../constants.js'

export const CHMI_PROVIDER = {
  id: 'chmi',
  label: 'ČHMÚ (CZRAD)',
  attribution:
    'Radar by <a href="https://opendata.chmi.cz/" target="_blank" rel="noopener">© ČHMÚ</a>',
  capabilities: {
    past: true,
    nowcast: true,    // 6 forecast frames at +10..+60 min
    lightning: false,
    satellite: false,
  },
  // Used by Insights / Settings to set honest expectations
  limitations:
    'Czech Republic only (E 11.27°–19.62° / N 48.05°–51.46°). 12 h of past frames at 5-min cadence + 60-min nowcast in 10-min steps. ~5–30 min stale on the frontend (GitHub Actions cron lag).',
  bbox: CHMI_DATA_BBOX,
}

/**
 * Returns true iff the position falls inside the ČHMÚ data bbox (so the
 * overlay actually adds value there). Used by the layer logic to skip the
 * ImageOverlay for users far outside CZ.
 */
export function isInsideChmiCoverage({ lat, lng }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  return (
    lat >= CHMI_DATA_BBOX.south && lat <= CHMI_DATA_BBOX.north &&
    lng >= CHMI_DATA_BBOX.west  && lng <= CHMI_DATA_BBOX.east
  )
}

/**
 * Fetch & normalize the chmi-data index.
 * Tries jsDelivr first (CDN, fast, may lag minutes after publish), then
 * raw.githubusercontent.com as a freshness fallback.
 *
 * @param {AbortSignal} [signal]
 * @param {{ timeoutMs?: number }} [opts]
 */
export async function fetchChmiIndex(signal, { timeoutMs = 8_000 } = {}) {
  const errors = []
  for (const url of [CHMI_INDEX_URL, CHMI_INDEX_URL_FALLBACK]) {
    try {
      const data = await fetchOne(url, signal, timeoutMs)
      return normalize(data)
    } catch (e) {
      if (e?.name === 'AbortError') throw e
      errors.push(`${url}: ${e?.message || e}`)
    }
  }
  throw new Error(`ČHMÚ index unreachable — ${errors.join(' | ')}`)
}

async function fetchOne(url, signal, timeoutMs) {
  const timeoutCtrl = new AbortController()
  const timer = setTimeout(() => timeoutCtrl.abort(new Error('timeout')), timeoutMs)
  const onAbort = () => timeoutCtrl.abort()
  if (signal) {
    if (signal.aborted) timeoutCtrl.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  try {
    const res = await fetch(url, {
      signal: timeoutCtrl.signal,
      cache: 'no-cache',
      credentials: 'omit',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data || typeof data !== 'object') throw new Error('not an object')
    return data
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

/**
 * Normalize the on-disk index into the same shape useRainViewerFrames consumers
 * expect: { frames, pastCount, nowcastCount, generatedAt, host, hasNowcast,
 *           bbox, pixel, raw }.
 */
export function normalize(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {}
  const generatedAt = Number.isFinite(Number(safe.generatedAt))
    ? Number(safe.generatedAt)
    : Math.floor(Date.now() / 1000)

  const bboxArr = Array.isArray(safe.bbox) && safe.bbox.length === 4
    ? safe.bbox
    : [CHMI_DATA_BBOX.west, CHMI_DATA_BBOX.south, CHMI_DATA_BBOX.east, CHMI_DATA_BBOX.north]
  const bbox = {
    west:  Number(bboxArr[0]),
    south: Number(bboxArr[1]),
    east:  Number(bboxArr[2]),
    north: Number(bboxArr[3]),
  }

  const inputFrames = Array.isArray(safe.frames) ? safe.frames : []
  const seen = new Set()
  const past = []
  const nowcast = []
  for (const f of inputFrames) {
    if (!f || typeof f !== 'object') continue
    const time = Number(f.time)
    const url  = typeof f.url === 'string' ? f.url : null
    const type = f.type === 'nowcast' ? 'nowcast' : 'past'
    if (!Number.isFinite(time) || time <= 0) continue
    if (!url) continue
    const key = `${type}|${time}|${url}`
    if (seen.has(key)) continue
    seen.add(key)
    const frame = toFrame(f, type, time, url, generatedAt)
    if (type === 'nowcast') nowcast.push(frame)
    else past.push(frame)
  }
  past.sort((a, b) => a.time - b.time)
  nowcast.sort((a, b) => a.time - b.time)
  if (past.length) past[past.length - 1].isNowCandidate = true

  return {
    frames: [...past, ...nowcast],
    pastCount: past.length,
    nowcastCount: nowcast.length,
    generatedAt,
    bbox,
    pixel: safe.pixel || null,
    hasNowcast: nowcast.length > 0,
    // host kept for shape parity with RainViewer; ČHMÚ frames carry their
    // full URL inline so consumers don't need to compose anything.
    host: '',
    raw: safe,
  }
}

function toFrame(f, type, time, url, generatedAt) {
  const leadMin = type === 'nowcast' ? Math.max(0, Number(f.leadMin) || 0) : 0
  return {
    id: `chmi:${type}:${f.sha || time}`,
    provider: 'chmi',
    type,
    time,
    leadMin,
    url,
    sha: f.sha || null,
    label: type === 'nowcast'
      ? `+${leadMin || Math.max(0, Math.round((time - generatedAt) / 60))} min`
      : formatHHMM(time),
    isNowCandidate: false,
  }
}

function formatHHMM(ts) {
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Returns true if metadata is older than `maxAgeSeconds` seconds. Default
 * threshold is 30 min — covers the worst-case GitHub Actions cron lag.
 */
export function isStale(generatedAt, maxAgeSeconds = 30 * 60) {
  if (!Number.isFinite(generatedAt)) return true
  const age = Date.now() / 1000 - generatedAt
  return age > maxAgeSeconds
}
