import { Sparkles, CloudOff, AlertCircle } from 'lucide-react'
import GlassCard from './GlassCard.jsx'
import { intensityOf, INTENSITY_COLORS } from '../providers/openMeteoProvider.js'

/**
 * Point precipitation forecast for the user's location.
 *
 * Renders 8 vertical bars (15-min steps × 8 = next 2 hours). Each bar is
 * color-coded by intensity (matches the radar legend palette where possible)
 * with a height proportional to the precipitation amount on a log-ish scale.
 *
 * This is a NUMERIC point forecast (mm/h at the user's lat/lng), NOT a map
 * overlay — the radar map remains the RainViewer tile feed. Both kinds of
 * forecast are clearly labeled so the user knows what they're looking at.
 */
export default function ForecastStrip({
  data,           // from useOpenMeteoForecast
  loading,
  error,
  hasLocation,    // bool — affects copy ("at your location" vs "default Prague")
}) {
  if (!hasLocation && !data) {
    // Without geolocation we still try Prague default — if no data yet, show
    // a tiny placeholder rather than a noisy card.
    return null
  }

  if (loading && !data) {
    return (
      <GlassCard strong className="px-3 py-2.5" aria-busy="true">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={12} style={{ color: '#22d3ee' }} />
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#a1a1aa' }}>
            Forecast
          </span>
          <span style={{ color: '#52525b', fontSize: 10 }}>· Open-Meteo</span>
          <span style={{ color: '#52525b', fontSize: 10, marginLeft: 'auto' }}>loading…</span>
        </div>
        <div className="flex items-end gap-1" style={{ height: 36 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton flex-1 rounded-sm" style={{ height: 12 + (i % 4) * 5 }} />
          ))}
        </div>
      </GlassCard>
    )
  }

  if (error && !data) {
    return (
      <GlassCard strong className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <AlertCircle size={12} style={{ color: '#fbbf24' }} />
          <span style={{ color: '#fbbf24', fontSize: 11.5 }}>
            Forecast unavailable: {error}
          </span>
        </div>
      </GlassCard>
    )
  }

  const buckets = data?.buckets ?? []
  if (buckets.length === 0) {
    return (
      <GlassCard strong className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <CloudOff size={12} style={{ color: '#71717a' }} />
          <span style={{ color: '#a1a1aa', fontSize: 11.5 }}>
            Forecast not provided for this location
          </span>
        </div>
      </GlassCard>
    )
  }

  // Compute log-ish max for scaling: peak mm/15min in window
  const peak = Math.max(0.6, ...buckets.map((b) => b.precipMm ?? 0))
  const heightOf = (mm) => {
    if (mm == null || mm <= 0) return 4
    const ratio = Math.min(1, Math.log(1 + mm * 4) / Math.log(1 + peak * 4))
    return Math.max(4, Math.round(ratio * 36))
  }

  return (
    <GlassCard strong className="px-3 py-2.5 fade-in">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles size={12} style={{ color: '#22d3ee' }} />
        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#a1a1aa' }}>
          Next 2 h forecast
        </span>
        <span style={{ color: '#52525b', fontSize: 10 }}>· Open-Meteo</span>
        <span
          className="ml-auto"
          style={{
            color: data?.summary?.kind === 'dry' ? '#10b981' : data?.summary?.kind === 'now' ? '#fbbf24' : '#22d3ee',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
          data-testid="forecast-summary"
        >
          {data?.summary?.text}
        </span>
      </div>

      <div className="flex items-end gap-1" style={{ height: 40 }}>
        {buckets.map((b, i) => {
          const intensity = intensityOf(b.precipMm)
          const color = INTENSITY_COLORS[intensity] || INTENSITY_COLORS.none
          const h = heightOf(b.precipMm)
          const showLabel = i % 2 === 0 // every 30 min
          return (
            <div key={b.time} className="flex-1 flex flex-col items-center gap-1">
              <div
                title={`${(b.precipMm ?? 0).toFixed(1)} mm in 15 min · ${b.probability ?? 0}% chance`}
                style={{
                  width: '70%',
                  height: h,
                  background: color,
                  borderRadius: 2,
                  boxShadow: intensity === 'none'
                    ? 'none'
                    : `0 0 6px ${color}88`,
                  opacity: intensity === 'none' ? 0.5 : 1,
                  transition: 'height 0.3s ease',
                }}
                aria-label={`${b.minutesFromNow >= 0 ? 'in ' : ''}${Math.abs(b.minutesFromNow)} min: ${(b.precipMm ?? 0).toFixed(1)} mm`}
              />
              <span
                style={{
                  fontSize: 8.5,
                  color: showLabel ? '#71717a' : '#3f3f46',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {showLabel ? formatBucket(b) : ''}
              </span>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

function formatBucket(b) {
  const d = new Date(b.time)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
