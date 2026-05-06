export function fmtCoords(lat, lng) {
  if (lat == null || lng == null) return '—'
  return `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}

export function pluralize(n, single, multi = `${single}s`) {
  return n === 1 ? `1 ${single}` : `${n} ${multi}`
}
