import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, ImageOverlay, useMap } from 'react-leaflet'
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
const CHMI_LEAFLET_BOUNDS = [
  [CHMI_DATA_BBOX.south, CHMI_DATA_BBOX.west],
  [CHMI_DATA_BBOX.north, CHMI_DATA_BBOX.east],
]

/**
 * RadarMap — Leaflet shell with:
 *   - dark Carto basemap
 *   - RainViewer radar tile overlay (current selected frame)
 *   - animated user-location pulse (custom DOM marker)
 *
 * Robustness:
 *   - invalidateSize() on container resize and visibility change
 *   - re-centering only when location moves meaningfully
 *   - tile layer keyed by frame id so React reuses underlying Leaflet object
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
  // ČHMÚ overlay: drawn ABOVE the RainViewer tile layer when a ČHMÚ frame
  // is selected. selectedFrame.provider distinguishes which one is active;
  // when chmi-active we still render the (lower-z) RainViewer base so areas
  // outside CZ stay populated.
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
      // Bound zoom: radar caps at z=7 native; allowing user past z=13 means
      // the radar tile is upscaled 64×+ and Leaflet's CSS transform can flake
      // out on iOS Safari standalone (visible as torn / blank tiles when
      // pinching in). Capping at z=13 keeps both layers stable and the radar
      // still readable.
      maxZoom={13}
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
      />

      {tileUrl && selectedFrame && (
        <TileLayer
          // Key includes every URL-affecting prop so a Settings change
          // (color, smooth, snow) actually rebuilds the layer instead of
          // calling Leaflet's setUrl, which does not redraw cached tiles.
          key={tileUrl}
          url={tileUrl}
          opacity={opacity}
          zIndex={400}
          // RainViewer's free tier returns real radar tiles only up to z=7
          // (verified empirically — z>=8 returns a "Zoom Level Not Supported"
          // placeholder PNG). With maxNativeZoom=7, Leaflet stops requesting
          // higher-z tiles and upscales the z=7 raster instead, so the user
          // sees a blurry-but-real overlay instead of a grey placeholder.
          maxNativeZoom={7}
          maxZoom={19}
        />
      )}

      {chmiUrl && (
        <ImageOverlay
          // Key on URL so React tears down + rebuilds the overlay on every
          // frame change. Leaflet's ImageOverlay has no setUrl analog that
          // forces a clean redraw; remounting is cheap here (~10 KB PNG).
          key={chmiUrl}
          url={chmiUrl}
          bounds={CHMI_LEAFLET_BOUNDS}
          opacity={opacity}
          // Above the RainViewer tile (zIndex=400) so when both happen to
          // be visible (e.g. mid-toggle) ČHMÚ wins inside CZ.
          zIndex={500}
          attribution={CHMI_PROVIDER.attribution}
          // crossOrigin=anonymous lets the browser cache the PNG without
          // tainting the canvas, which we may want later for crossfade.
          crossOrigin="anonymous"
        />
      )}

      <UserPulseMarker position={userPosition} />

      {followLocation && userPosition && <RecenterTo position={userPosition} />}
      {userPosition && recenterToken > 0 && (
        <ManualRecenter position={userPosition} token={recenterToken} />
      )}

      <SizeKeeper visible={visible} />
    </MapContainer>
  )
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
