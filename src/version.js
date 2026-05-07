// Single source of truth for the StormScope app version + structured release
// notes. Bumping APP_VERSION here is enough to (a) update every UI that
// shows the version and (b) trigger the "What's new" sheet on the user's
// next launch via useVersionGate.
//
// Format:
//   APP_VERSION    — semver-ish string, compared lexically by useVersionGate
//   RELEASE_NOTES  — newest first; each entry { version, date, title, items[] }
//                    items can be plain strings or { label, kind } where
//                    kind ∈ 'new' | 'fix' | 'change' | 'remove'

export const APP_VERSION = '0.4.0'

export const RELEASE_NOTES = [
  {
    version: '0.4.0',
    date: '2026-05-07',
    title: 'Real precipitation forecast — even when RainViewer is empty',
    items: [
      { kind: 'new', label: "New forecast strip on the Radar tab. 8 vertical bars showing the next 2 hours in 15-minute steps at your location, with intensity color-coded against the same legend as the radar overlay. Tap a bar for the exact mm value." },
      { kind: 'new', label: 'Headline summary above the bars: "No precipitation in the next 2 hours" / "Light rain in 30 min" / "Heavy rain now" — quick glance, actionable.' },
      { kind: 'new', label: 'Source: Open-Meteo (DWD ICON-D2 model in Europe, 15-min cadence). CORS-friendly, no API key, free for non-commercial use. Refreshes every 5 minutes when the app is visible; cached offline for 15 minutes.' },
      { kind: 'change', label: 'Why a separate forecast and not radar map frames? RainViewer\'s free public API only exposes nowcast tiles when there\'s active precipitation it can extrapolate — most of the time the array is empty. The new strip is honest about being a numeric point forecast at your location, not a map overlay.' },
    ],
  },
  {
    version: '0.3.3',
    date: '2026-05-07',
    title: 'Pinch-zoom stability on iOS PWA',
    items: [
      { kind: 'fix', label: 'Hard cap zoom at z=13 (was z=19). Past z=13 the RainViewer raster is upscaled 64×+ and Leaflet\'s CSS transform was flaking out on iOS Safari standalone — visible as glitched / blank tiles when pinching in. Capping keeps both layers stable.' },
      { kind: 'fix', label: 'SizeKeeper now suppresses invalidateSize() while a zoom gesture is in progress (zoomstart → zoomend) and debounces ResizeObserver bursts to one settle per 120 ms. Previously the map could shudder or render torn tiles mid-pinch on iOS.' },
      { kind: 'change', label: 'Tightened viewport meta (maximum-scale=1.0, minimum-scale=1.0) so the OS can never apply page-level zoom on top of the map\'s own zoom. Disabled Leaflet\'s "tap" handler that fights iOS PWA gestures, and turned off bouncy zoom overshoot.' },
    ],
  },
  {
    version: '0.3.2',
    date: '2026-05-07',
    title: 'No more "Zoom Level Not Supported" tiles',
    items: [
      { kind: 'fix', label: 'Set Leaflet maxNativeZoom=7 on the RainViewer radar layer. RainViewer\'s free public tile API only returns real radar tiles up to z=7 (verified empirically — at z≥8 it returns a grey "Zoom Level Not Supported" placeholder PNG). Leaflet now requests z=7 tiles at any user zoom and upscales them, so you see a blurry-but-real radar overlay instead of grey tiles when zoomed in to city / street level.' },
    ],
  },
  {
    version: '0.3.1',
    date: '2026-05-07',
    title: 'iOS PWA layout fix — full-screen map and visible overlays',
    items: [
      { kind: 'fix', label: 'Radar wrapper switched from `height: 100dvh` to `position: fixed; inset: 0` so the map and all overlays (status, intensity legend, locate FAB, timeline) reliably fill the viewport on iOS standalone PWA. Previously the map was confined to the middle of the screen with the bottom nav floating above the home indicator on some devices.' },
      { kind: 'fix', label: 'Explicit z-index on every Radar overlay (header, legend, bottom stack, locate FAB) so they always paint above Leaflet panes (z-400). Locate FAB and caption now show on top of the map regardless of stacking quirks.' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-05-07',
    title: 'Cinematic intro + unmissable Locate button',
    items: [
      { kind: 'new', label: 'New cinematic intro splash on app open: rotating radar sweep, animated rings, lightning bolt centerpiece, app name + tagline staggered reveal. Honors prefers-reduced-motion.' },
      { kind: 'change', label: 'Locate control made obvious: bigger 60 px FAB, animated pulse ring when no fix yet, and a permanent caption beneath ("Locate me" / "Locating…" / "Center on me" / "Permission needed") so it cannot be missed on a dark map.' },
      { kind: 'fix', label: 'Splash now waits ~1.6 s minimum so the intro feels intentional rather than a flicker, with a 3 s ceiling so it never blocks the app.' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-05-07',
    title: 'Locate FAB, in-app updates, release notes',
    items: [
      { kind: 'new', label: "Google-Maps-style Locate button on the Radar tab — taps always re-center on you, even after you've panned the map." },
      { kind: 'new', label: 'In-app version label and Force update moved out of Developer mode — always visible in Settings → Updates.' },
      { kind: 'new', label: "What's new sheet that shows release notes the first time you open a new version." },
      { kind: 'change', label: 'Dev logs remain admin-only (tap version 7× or use ?admin=1).' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-05-06',
    title: 'Initial public release',
    items: [
      { kind: 'new', label: 'Live RainViewer radar around your location.' },
      { kind: 'new', label: 'Timeline scrubber with play / pause / step / Now snap.' },
      { kind: 'new', label: 'Forecast frames when the provider returns them; honest fallback otherwise.' },
      { kind: 'new', label: 'Installable PWA: standalone mode, safe-area handling, offline shell, Dexie-backed settings.' },
      { kind: 'new', label: 'Dev mode: tap version 7× for logs and force-update tools.' },
    ],
  },
]

/**
 * Compare two version strings of the form "a.b.c". Returns:
 *   1   if a > b
 *  -1   if a < b
 *   0   if equal
 *
 * Treats missing components as 0.
 */
export function compareVersions(a, b) {
  if (a === b) return 0
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0
    const y = pb[i] || 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

/**
 * Returns the slice of RELEASE_NOTES strictly newer than `sinceVersion`.
 * If `sinceVersion` is null/undefined/empty, returns just the newest entry
 * (sensible default for first-ever launches and historical migrations).
 */
export function notesSince(sinceVersion) {
  if (!sinceVersion) return RELEASE_NOTES.slice(0, 1)
  return RELEASE_NOTES.filter((r) => compareVersions(r.version, sinceVersion) > 0)
}
