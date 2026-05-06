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
 * Notes:
 *   - We render a single TileLayer per frame keyed by frame.id; the previous
 *     layer remains in the DOM long enough for crossfade behavior to be subtle.
 *   - Opacity is controlled via prop and applied to the TileLayer.
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
}) {
  const mapCenter = useMemo(() => center || DEFAULT_CENTER, [center])

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

      {host && selectedFrame && (
        <TileLayer
          key={selectedFrame.id}
          url={buildTileUrl(host, selectedFrame, {
            color,
            smooth: smooth ? 1 : 0,
            snow: snow ? 1 : 0,
          })}
          opacity={opacity}
          // small zIndex so it sits above basemap but under markers
          zIndex={400}
          maxNativeZoom={10}
          maxZoom={19}
        />
      )}

      <UserPulseMarker position={userPosition} />

      {followLocation && userPosition && <RecenterTo position={userPosition} />}
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
