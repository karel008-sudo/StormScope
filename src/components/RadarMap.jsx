import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  BASEMAP_URL,
  BASEMAP_ATTRIBUTION,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from '../constants.js'
import { buildTileUrl, RAINVIEWER_PROVIDER } from '../providers/rainviewerProvider.js'
import { shimLeafletIcons } from '../utils/map.js'

shimLeafletIcons()

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
}) {
  const mapCenter = useMemo(() => center || DEFAULT_CENTER, [center])
  const tileUrl = useMemo(
    () =>
      host && selectedFrame
        ? buildTileUrl(host, selectedFrame, {
            color,
            smooth: smooth ? 1 : 0,
            snow: snow ? 1 : 0,
          })
        : null,
    [host, selectedFrame, color, smooth, snow],
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
    >
      <TileLayer
        url={BASEMAP_URL}
        attribution={`${BASEMAP_ATTRIBUTION} · ${RAINVIEWER_PROVIDER.attribution}`}
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
          maxNativeZoom={10}
          maxZoom={19}
        />
      )}

      <UserPulseMarker position={userPosition} />

      {followLocation && userPosition && <RecenterTo position={userPosition} />}

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

    const invalidate = () => {
      try { map.invalidateSize({ animate: false }) } catch {}
    }

    // initial settle (after first paint)
    const t1 = setTimeout(invalidate, 80)
    const t2 = setTimeout(invalidate, 320)

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => invalidate())
      : null
    if (ro && container) ro.observe(container)

    const onVis = () => {
      if (document.visibilityState === 'visible') invalidate()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('orientationchange', invalidate)
    window.addEventListener('resize', invalidate)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (ro) ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('orientationchange', invalidate)
      window.removeEventListener('resize', invalidate)
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
