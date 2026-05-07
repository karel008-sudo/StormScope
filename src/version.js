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

export const APP_VERSION = '0.2.0'

export const RELEASE_NOTES = [
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
