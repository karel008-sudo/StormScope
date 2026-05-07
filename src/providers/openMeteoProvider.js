// Open-Meteo provider — free, no-API-key, CORS-friendly precipitation forecast.
// We use it strictly as a NUMERIC forecast at the user's point location to fill
// the gap when RainViewer's tile-based nowcast is empty (which is most of the
// time outside of active precipitation).
//
// Endpoint:
//   https://api.open-meteo.com/v1/forecast
//     ?latitude={lat}&longitude={lon}
//     &minutely_15=precipitation,precipitation_probability,weather_code
//     &forecast_minutely_15={n}
//     &timezone=auto
//
// Quality notes:
//   - Europe is served by DWD ICON-D2 (~2 km grid, 15-min cadence)
//   - Outside Europe the model varies; we still get hourly precipitation.
//   - We do NOT extrapolate this onto the radar map — it's a point forecast
//     at the user's location, displayed separately as a forecast strip.

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

// 15-min buckets covering the next 2 hours.
export const FORECAST_BUCKET_COUNT = 8

export const OPEN_METEO_PROVIDER = {
  id: 'open-meteo',
  label: 'Open-Meteo',
  attribution:
    'Forecast by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> (DWD ICON-D2 in Europe)',
  capabilities: { numericPointForecast: true, mapOverlay: false },
}

export async function fetchOpenMeteoForecast(lat, lng, signal, { timeoutMs = 8_000 } = {}) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Open-Meteo: latitude/longitude required')
  }
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    minutely_15: 'precipitation,precipitation_probability,weather_code',
    forecast_minutely_15: String(FORECAST_BUCKET_COUNT),
    past_minutely_15: '0',
    timezone: 'auto',
  })

  const timeoutCtrl = new AbortController()
  const timer = setTimeout(() => timeoutCtrl.abort(new Error('timeout')), timeoutMs)
  const onAbort = () => timeoutCtrl.abort()
  if (signal) {
    if (signal.aborted) timeoutCtrl.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: timeoutCtrl.signal,
      cache: 'no-cache',
      credentials: 'omit',
    })
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
    const data = await res.json()
    return normalize(data)
  } catch (e) {
    if (e?.name === 'AbortError') {
      const reason = timeoutCtrl.signal.reason
      if (reason && reason.message === 'timeout') {
        const wrapped = new Error('Open-Meteo: timed out')
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
 * Normalize Open-Meteo response into a list of buckets:
 *   { time: msEpoch, minutesFromNow, precipMm, probability }
 */
export function normalize(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {}
  const m = safe.minutely_15 && typeof safe.minutely_15 === 'object' ? safe.minutely_15 : {}
  const times = Array.isArray(m.time) ? m.time : []
  const precip = Array.isArray(m.precipitation) ? m.precipitation : []
  const probs = Array.isArray(m.precipitation_probability) ? m.precipitation_probability : []
  const codes = Array.isArray(m.weather_code) ? m.weather_code : []

  // Open-Meteo returns local-time strings without zone; combined with our
  // tz=auto request we can treat them as already-local. Parse as ms epoch
  // assuming the wall-clock zone matches the device.
  const now = Date.now()
  const buckets = []
  for (let i = 0; i < times.length; i++) {
    const t = times[i]
    if (!t) continue
    const ts = new Date(t).getTime()
    if (!Number.isFinite(ts)) continue
    const mm = typeof precip[i] === 'number' ? precip[i] : null
    const pp = typeof probs[i] === 'number' ? probs[i] : null
    const wc = typeof codes[i] === 'number' ? codes[i] : null
    buckets.push({
      time: ts,
      minutesFromNow: Math.round((ts - now) / 60000),
      precipMm: mm,
      probability: pp,
      weatherCode: wc,
    })
  }

  // Drop buckets that are clearly already in the past (defensive).
  const future = buckets.filter((b) => b.minutesFromNow >= -8)

  return {
    buckets: future,
    fetchedAt: now,
    summary: summarize(future),
  }
}

/**
 * Pick a one-line headline so the strip can show actionable copy at a glance.
 */
export function summarize(buckets) {
  if (!buckets || !buckets.length) return { kind: 'unknown', text: 'No forecast available' }

  // Find the first bucket where precipitation is meaningful (>= 0.1 mm).
  const firstWet = buckets.find((b) => (b.precipMm ?? 0) >= 0.1)
  if (!firstWet) return { kind: 'dry', text: 'No precipitation in the next 2 hours' }

  const intensity = intensityOf(firstWet.precipMm)
  const inMin = Math.max(0, firstWet.minutesFromNow)
  if (inMin <= 5) return { kind: 'now', text: `${capitalize(intensity)} now` }
  return { kind: 'soon', text: `${capitalize(intensity)} in ${inMin} min` }
}

/**
 * Map mm/h to one of the same intensity bands the radar legend uses, so the
 * forecast strip color-coding stays visually consistent with the map.
 */
export function intensityOf(mmPer15Min) {
  // Open-Meteo precipitation is mm per 15 min. Convert to mm/h for banding.
  const mmh = (mmPer15Min ?? 0) * 4
  if (mmh < 0.1) return 'none'
  if (mmh < 0.5) return 'drizzle'
  if (mmh < 2.5) return 'light'
  if (mmh < 7.6) return 'moderate'
  if (mmh < 50) return 'heavy'
  return 'severe'
}

export const INTENSITY_COLORS = {
  none:     '#3f3f46',
  drizzle:  '#3b82f6',
  light:    '#22d3ee',
  moderate: '#22c55e',
  heavy:    '#f59e0b',
  severe:   '#f43f5e',
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
