import Dexie from 'dexie'

export const db = new Dexie('StormScope')

// v1: kv only
db.version(1).stores({
  kv: 'key',
})

// v2: + logs (Wingman-style logger backing store)
db.version(2).stores({
  kv: 'key',
  logs: '++id, timestamp, level, category',
})

const SETTINGS_KEY = 'settings'
const META_KEY = 'rainviewer:metadata'
const LAST_LOC_KEY = 'lastLocation'

export const DEFAULT_SETTINGS = {
  radarOpacity: 0.75,
  playbackSpeed: 'normal',  // slow | normal | fast
  defaultZoom: 7,
  smoothRadar: true,
  showSnowLayer: true,
  followLocation: true,
  hapticsEnabled: true,
  preferredColor: 2,        // RainViewer color scheme (0..8)
  reduceMotion: false,
}

export async function loadSettings() {
  try {
    const row = await db.kv.get(SETTINGS_KEY)
    return { ...DEFAULT_SETTINGS, ...(row?.value || {}) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(partial) {
  const current = await loadSettings()
  const next = { ...current, ...partial }
  try { await db.kv.put({ key: SETTINGS_KEY, value: next }) } catch {}
  return next
}

export async function resetSettings() {
  try { await db.kv.delete(SETTINGS_KEY) } catch {}
  return { ...DEFAULT_SETTINGS }
}

// Cached RainViewer metadata for offline shell
export async function cacheMetadata(metadata) {
  try {
    await db.kv.put({
      key: META_KEY,
      value: { metadata, cachedAt: Date.now() },
    })
  } catch {}
}

export async function loadCachedMetadata() {
  try {
    const row = await db.kv.get(META_KEY)
    return row?.value || null
  } catch {
    return null
  }
}

// Last user location (only stored if user explicitly granted)
export async function rememberLocation(lat, lng) {
  try {
    await db.kv.put({ key: LAST_LOC_KEY, value: { lat, lng, savedAt: Date.now() } })
  } catch {}
}

export async function loadLastLocation() {
  try {
    const row = await db.kv.get(LAST_LOC_KEY)
    return row?.value || null
  } catch {
    return null
  }
}

export async function forgetLocation() {
  try { await db.kv.delete(LAST_LOC_KEY) } catch {}
}
