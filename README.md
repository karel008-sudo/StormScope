# StormScope

> Your personal storm radar. Live rain, storm motion, and sky awareness around your location.

A premium mobile-first PWA built as a sibling to [Wingman](https://github.com/karel008-sudo/wingman). Dark cinematic UI, smooth radar animation, glass-card information density, no accounts, no servers, no data leaves your device.

![StormScope](public/pwa-512.png)

## Features

- 🌩️ **Live radar overlay** — RainViewer global radar tiles centered on your location
- ⏱️ **Timeline scrubber** — replay storm motion across the available history with play / pause / step / "Now" snap
- 📡 **Forecast frames** — when the provider exposes nowcast (typically the next ~30 min), they appear after "Now" in the timeline
- 📍 **Geolocation** — animated pulse marker, optional auto-follow, last-known position cached locally
- 📱 **Real PWA** — installable, standalone mode, viewport-fit cover, safe-area handling, dark theme color
- 💾 **Local-first** — settings persist via IndexedDB (Dexie); last RainViewer metadata cached for offline shell
- 🔌 **Offline-aware** — service worker runtime caching for tiles and metadata; visible offline banner
- ✨ **Haptic feedback** — Web Vibration API for tactile interactions (configurable)
- 🎨 **Premium UI** — glassmorphism, glow accents, motion easing, custom scrubber, intensity legend

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview  # preview production build
```

Requires Node 18+ (tested on 20+).

## Data sources

| Layer | Source | Notes |
|---|---|---|
| Radar tiles | [RainViewer](https://www.rainviewer.com/) Public Weather Maps API | Free for personal & educational use; ~2 h history at 10-min cadence; nowcast availability varies |
| Base map | OpenStreetMap raster via [CARTO Dark Matter](https://carto.com/) | Attribution required |
| Geolocation | Browser Geolocation API | High-accuracy mode; last position cached locally |

**Honesty notes (intentional):**

- The provider currently exposes about **2 hours of past frames** at ~10-min intervals — not 12 hours. The UI says *"Available radar history"*, never overclaims.
- **Nowcast frames are only shown when RainViewer actually returns them.** If empty, the UI shows *"Forecast frames currently unavailable from this provider"*.
- **No lightning data** is implemented yet (Blitzortung does not provide a free public API for raw strikes).
- **No precise distance/intensity readings around your location** are computed from tile pixels — that would require pixel sampling against a known colormap, which is fragile. We expose only honest metadata.

## Provider abstraction (planned)

The `src/providers/` layer is designed so future providers can drop in:

- 🇨🇿 **ČHMÚ / CZRAD** via a tiny backend proxy — 5-min cadence, +60-min nowcast, ~7 days of history over Czech Republic. (Backend needed because `opendata.chmi.cz` does not send CORS headers.)
- ⚡ **Blitzortung lightning overlay** via a backend proxy of their archive map renderer.
- 🛰️ Geostationary satellite cloud cover via EUMETSAT / ČHMÚ feed.

## Project structure

```
src/
  App.jsx                  — tab shell, splash screen
  main.jsx                 — entry, manual SW registration
  index.css                — design tokens, animations, custom controls
  db.js                    — Dexie schema (settings, metadata cache, last location)
  haptic.js                — Web Vibration API wrapper
  constants.js             — provider config, colors, defaults
  providers/
    rainviewerProvider.js  — fetch + normalize + tile URL builder
    weatherProviderTypes.js
  hooks/
    useGeolocation.js
    useRainViewerFrames.js
    useTimelinePlayer.js
    usePersistentSettings.js
  components/
    AppShell.jsx           — page wrapper with bottom nav
    BottomNav.jsx          — tab bar (animated underline)
    GlassCard.jsx
    StatusCard.jsx         — top-of-screen feed status
    TimelineControl.jsx    — scrubber + play/pause + Now snap
    RadarMap.jsx           — Leaflet map + radar overlay + user pulse
    LocationButton.jsx
    FrameBadge.jsx
    ProviderBadge.jsx
    IntensityLegend.jsx
    PermissionState.jsx    — denied/error/offline panels
    OfflineBanner.jsx
    UpdatePrompt.jsx
  pages/
    Radar.jsx              — hero screen
    Timeline.jsx           — frame replay log (Past / Now / Forecast)
    Insights.jsx           — feed metadata + readiness cards + chart
    Settings.jsx           — opacity, speed, zoom, toggles, attribution, reset
  utils/
    time.js
    format.js
    map.js                 — Leaflet icon shim
public/
  favicon.svg
  pwa-192.png  pwa-512.png  pwa-maskable-512.png  apple-touch-icon.png
```

## Design DNA (mirror of Wingman)

| Token | Value |
|---|---|
| Background | `#0b0b11` |
| Surface | `rgba(255,255,255,0.04)` |
| Border | `rgba(255,255,255,0.08)` |
| Primary | `#8b5cf6` (violet) |
| Storm accent | `#22d3ee` (electric cyan) |
| Lightning accent | `#fbbf24` (amber) |
| Danger | `#f43f5e` (rose) |
| Text-1 / 2 / 3 | `#f8f8ff` / `#d4d4d8` / `#71717a` |

Cards use `backdrop-filter: blur()`, hairline borders, no solid backgrounds. Bottom nav has an animated underline indicator. iOS safe-area is handled with `env(safe-area-inset-*)` everywhere it matters.

## Deployment (Netlify)

`netlify.toml` is included. Drop the repo into Netlify, build command `npm run build`, publish directory `dist`. SPA fallback redirect to `/index.html` is configured. Service-worker file is sent with `no-cache` so updates ship reliably (especially on iOS).

## Roadmap

- [ ] ČHMÚ/CZRAD provider via backend proxy (CORS + PNG cropping/transparent overlay)
- [ ] +60-min nowcast from ČHMÚ FCT_PseudoCAPPI_2km
- [ ] Blitzortung lightning archive overlay via backend proxy
- [ ] 12-hour radar archive (server-side ring buffer)
- [ ] Distance-to-nearest-storm proxy when reliable colormap is locked
- [ ] iOS PWA install hint flow
- [ ] Settings sync via QR (cross-device, no account)

## License

MIT
