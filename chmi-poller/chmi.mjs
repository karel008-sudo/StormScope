// ČHMÚ open-data fetchers.
//
// We hit two listings:
//   pseudocappi2km/png/      — 5-min current radar snapshots, named like
//                              pacz2gmaps3.z_cappi020.YYYYMMDD.HHMM.0.png
//   fct_pseudocappi2km/png/  — 5-min forecast TAR archives, named like
//                              pacz2gmaps3.fct_z_cappi020.YYYYMMDD.HHMM.ft60s10.tar
//                              (each TAR contains 6 PNGs: +10..+60 min)
//
// Per radar_description_en.pdf §24 (PseudoCAPPI_2km PNG):
//   - Whole image:  680×460 px, E 11.267°–20.770° / N 48.047°–52.167°
//   - Data area:           E 11.267°–19.624° / N 48.047°–51.458°
//                          (= 598×381 px subregion at x=0..598, y=79..460)
//   - Projection:   EPSG:3857 (web mercator)
//   - Resolution:   1×1 km
//
// We crop on the poller side and ship 598×381 frames matching CHMI_DATA_BBOX,
// so the frontend ImageOverlay just maps them onto that bbox.

import tarStream from 'tar-stream'
import { Readable } from 'node:stream'

export const CHMI_BASE = 'https://opendata.chmi.cz/meteorology/weather/radar/composite'
export const PAST_DIR  = `${CHMI_BASE}/pseudocappi2km/png/`
export const FCT_DIR   = `${CHMI_BASE}/fct_pseudocappi2km/png/`

// Geographical bbox of the entire 680×460 source PNG (with label + legend strip).
export const CHMI_WHOLE_IMAGE_BBOX = {
  west:  11.267,
  east:  20.770,
  south: 48.047,
  north: 52.167,
  pixelW: 680,
  pixelH: 460,
}

// Geographical bbox of the radar data area only.
// This is what the cropped PNGs (and Leaflet ImageOverlay) refer to.
export const CHMI_DATA_BBOX = {
  west:  11.267,
  east:  19.624,
  south: 48.047,
  north: 51.458,
  pixelW: 598,
  pixelH: 381,
}

// Pixel offsets of the data area inside the source image. Derived once and
// asserted in png.mjs so any silent upstream change becomes a hard failure.
export const CHMI_DATA_CROP = {
  x: 0,
  y: 79, // (52.167 - 51.458) / (52.167 - 48.047) * 460 ≈ 79.13 → 79
  width:  598, // (19.624 - 11.267) / (20.770 - 11.267) * 680 ≈ 598.02 → 598
  height: 381, // 460 - 79 = 381
}

const FILENAME_RE = /^pacz2gmaps3\.z_cappi020\.(\d{8})\.(\d{4})\.0\.png$/
const FCT_TAR_RE  = /^pacz2gmaps3\.fct_z_cappi020\.(\d{8})\.(\d{4})\.ft60s10\.tar$/
const FCT_PNG_RE  = /^pacz2gmaps3\.fct_z_cappi020\.(\d{8})\.(\d{4})\.(\d+)\.png$/

const DEFAULT_HEADERS = {
  // Identify ourselves so ČHMÚ admins can correlate traffic.
  'User-Agent': 'StormScope-ChmiPoller/1.0 (+https://github.com/karel008-sudo/StormScope)',
}

/**
 * Fetch with retry + exponential backoff. Throws on final failure.
 */
async function fetchWithRetry(url, opts = {}, { attempts = 3, baseDelayMs = 800 } = {}) {
  let lastErr = null
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { ...DEFAULT_HEADERS, ...(opts.headers || {}) },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
      return res
    } catch (e) {
      lastErr = e
      if (i < attempts - 1) {
        const delay = baseDelayMs * Math.pow(2, i)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

/**
 * Parse the public Apache directory listing into a list of file entries.
 * Returns [{ name, lastModified, sizeBytes }].
 */
function parseDirIndex(html) {
  const out = []
  // Apache "Index of" rows look like:
  //   <a href="file.png">file.png</a>            DD-Mon-YYYY HH:MM   12345
  const re = /<a href="([^"]+)">[^<]+<\/a>\s+([0-9]{2}-[A-Za-z]{3}-[0-9]{4} [0-9]{2}:[0-9]{2})\s+([0-9]+|-)/g
  let m
  while ((m = re.exec(html)) != null) {
    const [, href, modText, sizeText] = m
    if (href.endsWith('/') || href === '../') continue
    out.push({
      name: href,
      lastModified: parseApacheDate(modText),
      sizeBytes: sizeText === '-' ? 0 : parseInt(sizeText, 10),
    })
  }
  return out
}

const MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 }
function parseApacheDate(s) {
  // "11-May-2026 09:50"
  const [d, mon, rest] = s.split(/[-\s]/)
  const [year, time] = [rest, s.split(' ')[1]]
  const [hh, mm] = time.split(':').map((n) => parseInt(n, 10))
  return Date.UTC(parseInt(year, 10), MONTHS[mon] ?? 0, parseInt(d, 10), hh, mm, 0)
}

/**
 * Convert ČHMÚ filename time to a UNIX timestamp (seconds, UTC).
 * ČHMÚ files are timestamped in UTC.
 */
export function tsFromFilename(name) {
  let m = FILENAME_RE.exec(name) || FCT_TAR_RE.exec(name) || FCT_PNG_RE.exec(name)
  if (!m) return null
  const [, ymd, hhmm] = m
  const y = parseInt(ymd.slice(0, 4), 10)
  const mo = parseInt(ymd.slice(4, 6), 10) - 1
  const d = parseInt(ymd.slice(6, 8), 10)
  const h = parseInt(hhmm.slice(0, 2), 10)
  const mi = parseInt(hhmm.slice(2, 4), 10)
  return Math.floor(Date.UTC(y, mo, d, h, mi, 0) / 1000)
}

/**
 * @returns Promise<Array<{name, time, lastModified, sizeBytes}>>
 *   sorted ascending by time, only valid filenames included
 */
export async function listPastFrames({ limit = 144 } = {}) {
  const res = await fetchWithRetry(PAST_DIR)
  const html = await res.text()
  const all = parseDirIndex(html)
    .filter((e) => FILENAME_RE.test(e.name))
    .map((e) => ({ ...e, time: tsFromFilename(e.name) }))
    .filter((e) => e.time != null)
  all.sort((a, b) => a.time - b.time)
  return all.slice(-limit)
}

/**
 * Returns the latest forecast TAR entry (or null).
 */
export async function findLatestForecastTar() {
  const res = await fetchWithRetry(FCT_DIR)
  const html = await res.text()
  const all = parseDirIndex(html)
    .filter((e) => FCT_TAR_RE.test(e.name))
    .map((e) => ({ ...e, time: tsFromFilename(e.name) }))
    .filter((e) => e.time != null)
  all.sort((a, b) => a.time - b.time)
  return all.length ? all[all.length - 1] : null
}

/**
 * Download a single past-radar PNG.
 */
export async function fetchPastPng(name) {
  const res = await fetchWithRetry(`${PAST_DIR}${name}`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Download + extract a forecast TAR.
 *
 * Returns Array<{ name, time, leadMin, png: Buffer }>
 */
export async function fetchForecastFrames(tarName) {
  const res = await fetchWithRetry(`${FCT_DIR}${tarName}`)
  const buf = Buffer.from(await res.arrayBuffer())
  return await extractTar(buf)
}

function extractTar(buffer) {
  return new Promise((resolve, reject) => {
    const out = []
    const extract = tarStream.extract()
    extract.on('entry', (header, stream, next) => {
      const chunks = []
      stream.on('data', (c) => chunks.push(c))
      stream.on('end', () => {
        const baseName = header.name.split('/').pop()
        const m = FCT_PNG_RE.exec(baseName)
        if (m) {
          const time = tsFromFilename(baseName)
          const leadMin = parseInt(m[3], 10)
          out.push({
            name: baseName,
            time,
            leadMin,
            png: Buffer.concat(chunks),
          })
        }
        next()
      })
      stream.resume()
    })
    extract.on('finish', () => {
      out.sort((a, b) => a.leadMin - b.leadMin)
      resolve(out)
    })
    extract.on('error', reject)
    Readable.from(buffer).pipe(extract)
  })
}
