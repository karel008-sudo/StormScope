// time helpers — local-time formatting, relative phrases

export function fmtClock(ts) {
  if (!ts) return '—'
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function fmtClockWithSec(ts) {
  if (!ts) return '—'
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function fmtDateTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts * 1000)
  return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

export function relativePhrase(ts, now = Date.now() / 1000) {
  if (!ts) return '—'
  const diff = Math.round(ts - now) // seconds, signed
  const abs = Math.abs(diff)
  if (abs < 30) return 'just now'

  const mins = Math.round(abs / 60)
  if (mins < 60) {
    const label = mins === 1 ? 'min' : 'min'
    return diff < 0 ? `${mins} ${label} ago` : `in ${mins} ${label}`
  }

  const hrs = Math.round(abs / 3600)
  if (hrs < 24) {
    return diff < 0 ? `${hrs}h ago` : `in ${hrs}h`
  }

  const days = Math.round(abs / 86400)
  return diff < 0 ? `${days}d ago` : `in ${days}d`
}

export function minutesBetween(aTs, bTs) {
  return Math.round((bTs - aTs) / 60)
}
