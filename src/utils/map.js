// Map helpers — Leaflet icon shimming + tile URL builders

import L from 'leaflet'

// Leaflet's default marker icon refers to assets that Vite cannot resolve.
// Replace the default icon with inline SVG-based image refs from leaflet's CDN
// to avoid bundling broken paths. We don't actually use the default icon
// (we use a custom DOM marker for user location), but this keeps Leaflet quiet.
let _shimmed = false
export function shimLeafletIcons() {
  if (_shimmed) return
  _shimmed = true
  const proto = L.Icon.Default.prototype
  if (proto && proto._getIconUrl) {
    delete proto._getIconUrl
  }
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}
