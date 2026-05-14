export const APP_NAME = 'StormScope'
export const APP_TAGLINE = 'Live radar around you'

// Default map center: Prague, CZ (until geolocation resolves)
export const DEFAULT_CENTER = [50.0755, 14.4378]
export const DEFAULT_ZOOM = 7

export const RAINVIEWER_ENDPOINT = 'https://api.rainviewer.com/public/weather-maps.json'

// Tile rendering options for RainViewer radar layer
// See https://www.rainviewer.com/api/weather-maps-api.html
export const RAINVIEWER_TILE_SIZE = 256
export const RAINVIEWER_COLOR = 2       // 2 = "Universal Blue"
export const RAINVIEWER_SMOOTH = 1
export const RAINVIEWER_SNOW = 1

// How often to refresh metadata when app is foreground (ms)
export const METADATA_REFRESH_MS = 5 * 60 * 1000

// ČHMÚ provider — index.json + cropped PNGs published every ~10 min by the
// chmi-poller GitHub Action to the `chmi-data` branch of the same repo.
// Frontend consumes via jsDelivr (CORS=*, edge-cached, ~7 day cache).
//
// CHMI_INDEX_URL points at the live index. The frames it references are
// already absolute jsDelivr URLs, so the frontend never needs to know the
// base URL — it just trusts what the poller wrote.
export const CHMI_INDEX_URL =
  'https://cdn.jsdelivr.net/gh/karel008-sudo/StormScope@chmi-data/index.json'

// Fallback when jsDelivr is having a bad day (it caches aggressively but
// occasionally lags by minutes after a force-push — direct GitHub raw is
// CORS-friendly too and always fresh).
export const CHMI_INDEX_URL_FALLBACK =
  'https://raw.githubusercontent.com/karel008-sudo/StormScope/chmi-data/index.json'

// Geographical bounds of the ČHMÚ data area (matches CHMI_DATA_BBOX in the
// poller). Used to (a) place the Leaflet ImageOverlay and (b) decide
// whether the user is "in coverage" so the provider badge can swap.
export const CHMI_DATA_BBOX = {
  west:  11.267,
  east:  19.624,
  south: 48.047,
  north: 51.458,
}

// Timeline player defaults
export const DEFAULT_PLAYBACK_INTERVAL_MS = 650
export const PLAYBACK_INTERVALS_MS = {
  slow:   1100,
  normal: 650,
  fast:   320,
}

// CARTO Dark Matter — free, dark base map ideal for storm overlays
export const BASEMAP_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
export const BASEMAP_ATTRIBUTION =
  '© OpenStreetMap contributors · © CARTO'

// Color tokens (mirror of index.css for JS-side use)
export const COLORS = {
  bg:        '#0b0b11',
  surface:   'rgba(255,255,255,0.04)',
  surface2:  'rgba(255,255,255,0.06)',
  border:    'rgba(255,255,255,0.08)',
  border2:   'rgba(255,255,255,0.10)',
  primary:   '#8b5cf6',
  storm:     '#22d3ee',
  lightning: '#fbbf24',
  danger:    '#f43f5e',
  success:   '#10b981',
  text1:     '#f8f8ff',
  text2:     '#d4d4d8',
  text3:     '#a1a1aa',
  text4:     '#71717a',
  text5:     '#52525b',
}

// Storm intensity legend bands (dBZ approx) for the legend display
export const INTENSITY_BANDS = [
  { label: 'Drizzle', range: '< 20 dBZ', color: '#3b82f6' },
  { label: 'Light',   range: '20–35',    color: '#22d3ee' },
  { label: 'Moderate',range: '35–45',    color: '#22c55e' },
  { label: 'Heavy',   range: '45–55',    color: '#f59e0b' },
  { label: 'Severe',  range: '> 55',     color: '#f43f5e' },
]
