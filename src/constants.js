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
