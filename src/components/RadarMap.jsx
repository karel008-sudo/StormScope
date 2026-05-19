import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  BASEMAP_URL,
  BASEMAP_ATTRIBUTION,
  CHMI_DATA_BBOX,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from '../constants.js'
import { buildTileUrl, RAINVIEWER_PROVIDER } from '../providers/rainviewerProvider.js'
import { CHMI_PROVIDER } from '../providers/chmiProvider.js'
import { shimLeafletIcons } from '../utils/map.js'

shimLeafletIcons()

// Leaflet bounds for the ČHMÚ ImageOverlay. Computed once outside the
// component so React doesn't reallocate on every render (which would force
// Leaflet to tear down + rebuild the overlay).
const CHMI_LEAFLET_BOUNDS = L.latLngBounds(
  [CHMI_DATA_BBOX.south, CHMI_DATA_BBOX.west],
  [CHMI_DATA_BBOX.north, CHMI_DATA_BBOX.east],
)

/**
 * RadarMap — Leaflet shell with:
 *   - dark Carto basemap
 *   - RainViewer radar tile overlay OR ČHMÚ ImageOverlay (active provider)
 *   - animated user-location pulse (custom DOM marker)
 *
 * Performance notes:
 *   - Frame changes call `layer.setUrl(...)` instead of remounting the React
 *     element. Remount used to trigger a full Leaflet teardown + retile on
 *     every timeline tick (~650 ms during playback), which (a) discarded
 *     all cached tiles and (b) made zoom-during-playback feel awful because
 *     the network was constantly re-fetching the same tiles for a new URL.
 *   - The active player is auto-paused while the user is mid-zoom-gesture,
 *     so the browser has the whole frame budget for tile loading + smooth
 *     zoom animation. It resumes on zoomend if the user was playing before.
 *   - The next ČHMÚ frame is preloaded into the browser cache so the
 *     visible swap is instant.
 */
export default function RadarMap({
  center,
  zoom = DEFAULT_ZOOM,
  userPosition,
  host,
  selectedFrame,
  opacity = 0.75,
  followLocation = true,
  smooth = true,
  snow = true,
  color = 2,
  visible = true,
  recenterToken = 0,
  // The full player object from useTimelinePlayer; used so the map can
  // auto-pause playback when the user starts a zoom gesture. May be null.
  player = null,
  // All ČHMÚ frames currently in the timeline; the map preloads the next
  // one into the browser cache for instant crossfade. Pass null/empty to
  // skip preloading.
  chmiFrames = null,
}) {
  const mapCenter = useMemo(() => center || DEFAULT_CENTER, [center])

  const isChmi = selectedFrame?.provider === 'chmi'
  const chmiUrl = isChmi && selectedFrame?.url ? selectedFrame.url : null

  // RainViewer tile URL. Skip when the active frame is a ČHMÚ one — there's
  // nothing meaningful to compose against, and RainViewer would just show a
  // mismatched timestamp under the ČHMÚ overlay.
  const tileUrl = useMemo(
    () =>
      !isChmi && host && selectedFrame
        ? buildTileUrl(host, selectedFrame, {
            color,
            smooth: smooth ? 1 : 0,
            snow: snow ? 1 : 0,
          })
        : null,
    [isChmi, host, selectedFrame, color, smooth, snow],
  )

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      scrollWheelZoom
      zoomControl={false}
      style={{ width: '100%', height: '100%', background: '#0b0b11' }}
      worldCopyJump
      attributionControl
      // Cap at 18 (street level) — CARTO basemap stays crisp, while both
      // radar layers (RainViewer maxNative=7, ČHMÚ ~1 km/px) are
      // necessarily upscaled and blurry beyond ~z=10. Past z=18, Leaflet's
      // CSS transform on upscaled radars can flake on iOS Safari standalone.
      maxZoom={18}
      minZoom={3}
      bounceAtZoomLimits={false}
      // iOS double-tap-to-zoom-out (Leaflet's default 'tap' handler) can
      // fight iOS PWA gestures — disable it; pinch + buttons cover the use case.
      tap={false}
    >
      <TileLayer
        url={BASEMAP_URL}
        attribution={`${BASEMAP_ATTRIBUTION} · ${
          isChmi ? CHMI_PROVIDER.attribution : RAINVIEWER_PROVIDER.attribution
        }`}
        subdomains={['a', 'b', 'c', 'd']}
        maxZoom={19}
        // Cache more tiles outside the viewport so panning + zooming is
        // smoother (default keepBuffer=2 is conservative).
        keepBuffer={4}
      />

      <RainViewerLayer
        url={tileUrl}
        opacity={opacity}
        active={!isChmi}
      />

      <ChmiOverlay
        url={chmiUrl}
        opacity={opacity}
        frames={chmiFrames}
      />

      <UserPulseMarker position={userPosition} />

      {followLocation && userPosition && <RecenterTo position={userPosition} />}
      {userPosition && recenterToken > 0 && (
        <ManualRecenter position={userPosition} token={recenterToken} />
      )}

      <SizeKeeper visible={visible} />
      <PlayerZoomGate player={player} />
    </MapContainer>
  )
}

/**
 * RainViewer tile layer that updates URL in-place via `layer.setUrl(...)`
 * instead of remounting. This keeps Leaflet's internal tile cache alive
 * across timeline ticks, so playback doesn't thrash the network.
 *
 * The layer is hidden (removed from the map) when `active=false` instead of
 * unmounted — switching between providers is then a single `addLayer` call.
 */
function RainViewerLayer({ url, opacity, active }) {
  const map = useMap()
  const layerRef = useRef(null)

  // Create the Leaflet layer exactly once. Re-using the same layer across
  // URL changes is the whole point.
  useEffect(() => {
    const layer = L.tileLayer('', {
      opacity,
      zIndex: 400,
      // RainViewer's free tier returns real radar tiles only up to z=7
      // (verified empirically — z>=8 returns a "Zoom Level Not Supported"
      // placeholder PNG). With maxNativeZoom=7, Leaflet stops requesting
      // higher-z tiles and upscales the z=7 raster instead.
      maxNativeZoom: 7,
      maxZoom: 19,
      keepBuffer: 4,
      // Only fetch new tiles after the user lets go — no flicker mid-pinch
      // (Leaflet keeps showing the previous zoom-level tiles, scaled,
      // until the gesture settles).
      updateWhenIdle: true,
      updateWhenZooming: false,
      // Smooth fade-in for newly-loaded tiles (Leaflet default; explicit
      // here so we don't accidentally turn it off elsewhere).
      fadeAnimation: true,
    })
    layerRef.current = layer
    return () => {
      try {
        if (map.hasLayer(layer)) map.removeLayer(layer)
      } catch {}
      layerRef.current = null
    }
    // opacity is read here only as the initial value; live updates handled
    // by the setOpacity effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Add / remove on the map as `active` flips.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    if (active && url) {
      if (!map.hasLayer(layer)) map.addLayer(layer)
    } else if (map.hasLayer(layer)) {
      map.removeLayer(layer)
    }
  }, [active, url, map])

  // Push new URL into the existing layer — Leaflet re-tiles for the new URL
  // but keeps its tile container, fade animation, and DOM nodes alive.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer || !url) return
    try { layer.setUrl(url) } catch {}
  }, [url])

  // Push opacity changes without rebuilding.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    try { layer.setOpacity(opacity) } catch {}
  }, [opacity])

  return null
}

/**
 * ČHMÚ image overlay with the same in-place update pattern + N+1 preload.
 *
 * Why preload: switching ImageOverlay URLs replaces the underlying <img>
 * src, which triggers a network fetch even for jsDelivr-cached files.
 * Preloading the next frame's URL into the browser cache (via a hidden
 * `new Image()`) means the swap is served from the disk cache and feels
 * instant, even at the start of playback.
 */
function ChmiOverlay({ url, opacity, frames }) {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    // Empty 1×1 transparent gif until a real URL arrives — Leaflet refuses
    // to construct an ImageOverlay without a src.
    const layer = L.imageOverlay(
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      CHMI_LEAFLET_BOUNDS,
      {
        opacity,
        zIndex: 500,
        attribution: CHMI_PROVIDER.attribution,
        crossOrigin: 'anonymous',
        // Hide the placeholder gif until we set a real URL.
        className: 'chmi-image-overlay',
      },
    )
    layerRef.current = layer
    return () => {
      try { if (map.hasLayer(layer)) map.removeLayer(layer) } catch {}
      layerRef.current = null
    }
    // opacity is initial-only; updates handled by setOpacity effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    if (url) {
      if (!map.hasLayer(layer)) map.addLayer(layer)
    } else if (map.hasLayer(layer)) {
      map.removeLayer(layer)
    }
  }, [url, map])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer || !url) return
    try { layer.setUrl(url) } catch {}
  }, [url])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    try { layer.setOpacity(opacity) } catch {}
  }, [opacity])

  // Preload the NEXT frame so the swap on next tick is cache-hit instant.
  // Triggered any time the active URL changes (i.e. on every tick).
  useEffect(() => {
    if (!Array.isArray(frames) || frames.length === 0 || !url) return
    const idx = frames.findIndex((f) => f && f.url === url)
    if (idx < 0) return
    const next = frames[(idx + 1) % frames.length]
    if (!next || !next.url || next.url === url) return
    const img = new Image()
    img.decoding = 'async'
    img.src = next.url
    // No cleanup needed — once the browser starts the request, the cache
    // fill happens regardless of whether we hold the Image object.
  }, [url, frames])

  return null
}

/**
 * Auto-pause the timeline player while the user is mid-zoom-gesture so the
 * browser has the whole frame budget for tile loading + smooth zoom
 * animation. Resumes on zoomend ONLY if the user had it playing before.
 */
function PlayerZoomGate({ player }) {
  const map = useMap()
  const wasPlayingRef = useRef(false)

  useEffect(() => {
    if (!map || !player) return
    const onZoomStart = () => {
      wasPlayingRef.current = !!player.isPlaying
      if (player.isPlaying) {
        try { player.pause() } catch {}
      }
    }
    const onZoomEnd = () => {
      if (wasPlayingRef.current) {
        wasPlayingRef.current = false
        try { player.play() } catch {}
      }
    }
    map.on('zoomstart', onZoomStart)
    map.on('zoomend',   onZoomEnd)
    return () => {
      map.off('zoomstart', onZoomStart)
      map.off('zoomend',   onZoomEnd)
    }
  }, [map, player])

  return null
}

function UserPulseMarker({ position }) {
  const map = useMap()
  const markerRef = useRef(null)

  useEffect(() => {
    if (!position) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
        markerRef.current = null
      }
      return
    }
    if (markerRef.current) map.removeLayer(markerRef.current)
    const html = `
      <div style="position:relative;width:24px;height:24px;">
        <div style="
          position:absolute;inset:0;border-radius:9999px;
          background:rgba(139,92,246,0.4);
          animation:locationPulse 2s ease-out infinite;
        "></div>
        <div style="
          position:absolute;inset:7px;border-radius:9999px;
          background:#8b5cf6;
          box-shadow:0 0 10px rgba(139,92,246,0.9), 0 0 24px rgba(139,92,246,0.5);
          border:2px solid #f8f8ff;
        "></div>
      </div>
    `
    const icon = L.divIcon({
      html,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
    const m = L.marker([position.lat, position.lng], { icon, interactive: false })
    m.addTo(map)
    markerRef.current = m
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
        markerRef.current = null
      }
    }
  }, [position, map])

  return null
}

function RecenterTo({ position }) {
  const map = useMap()
  const lastRef = useRef(null)
  useEffect(() => {
    if (!position) return
    const sig = `${position.lat.toFixed(3)},${position.lng.toFixed(3)}`
    if (lastRef.current === sig) return
    lastRef.current = sig
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 8), {
      duration: 0.9,
      easeLinearity: 0.25,
    })
  }, [position, map])
  return null
}

/**
 * Triggered explicitly via the LocateFab. Flies on every token change so the
 * user can always re-center after panning, regardless of followLocation.
 */
function ManualRecenter({ position, token }) {
  const map = useMap()
  // Intentionally only react to token; position is read at fire time.
  useEffect(() => {
    if (!position) return
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 9), {
      duration: 0.7,
      easeLinearity: 0.25,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
  return null
}

/**
 * SizeKeeper invalidates Leaflet sizing when:
 *   - the map container resizes (ResizeObserver)
 *   - the document becomes visible (tab switch / app foreground)
 *   - the `visible` prop flips from false→true (parent tab change)
 *
 * This prevents the "gray map" bug after splash/tab transitions and on iOS
 * Safari when the URL bar collapses.
 */
function SizeKeeper({ visible }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    const container = map.getContainer()

    // Suppress invalidateSize while Leaflet itself is zooming/panning — firing
    // it mid-gesture on iOS causes the map to shudder or render torn tiles.
    let zooming = false
    const onZoomStart = () => { zooming = true }
    const onZoomEnd   = () => { zooming = false }
    map.on('zoomstart', onZoomStart)
    map.on('zoomend',   onZoomEnd)

    let pendingTimer = null
    const invalidate = () => {
      if (zooming) return
      try { map.invalidateSize({ animate: false }) } catch {}
    }
    // Coalesce bursts (ResizeObserver can fire many times in one frame on iOS
    // when the URL chrome animates). One settle per ~120 ms is enough.
    const debouncedInvalidate = () => {
      if (pendingTimer) return
      pendingTimer = setTimeout(() => {
        pendingTimer = null
        invalidate()
      }, 120)
    }

    // initial settle (after first paint)
    const t1 = setTimeout(invalidate, 80)
    const t2 = setTimeout(invalidate, 320)

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => debouncedInvalidate())
      : null
    if (ro && container) ro.observe(container)

    const onVis = () => {
      if (document.visibilityState === 'visible') debouncedInvalidate()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('orientationchange', debouncedInvalidate)
    window.addEventListener('resize', debouncedInvalidate)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (pendingTimer) clearTimeout(pendingTimer)
      if (ro) ro.disconnect()
      map.off('zoomstart', onZoomStart)
      map.off('zoomend',   onZoomEnd)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('orientationchange', debouncedInvalidate)
      window.removeEventListener('resize', debouncedInvalidate)
    }
  }, [map])

  // Also invalidate when parent flips us back on
  useEffect(() => {
    if (visible && map) {
      const t = setTimeout(() => {
        try { map.invalidateSize({ animate: false }) } catch {}
      }, 80)
      return () => clearTimeout(t)
    }
  }, [visible, map])

  return null
}
