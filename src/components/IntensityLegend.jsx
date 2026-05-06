import { INTENSITY_BANDS } from '../constants.js'

export default function IntensityLegend({ compact = false }) {
  return (
    <div
      className="rounded-xl px-2.5 py-2 inline-flex flex-col gap-1.5"
      style={{
        background: 'rgba(11,11,17,0.7)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="text-[9px] uppercase tracking-widest" style={{ color: '#71717a' }}>
        Intensity
      </div>
      <div className="flex items-center gap-1.5">
        {INTENSITY_BANDS.map((b) => (
          <div key={b.label} className="flex flex-col items-center" title={`${b.label} · ${b.range}`}>
            <div
              style={{
                width: compact ? 14 : 20,
                height: 6,
                borderRadius: 2,
                background: b.color,
                boxShadow: `0 0 6px ${b.color}88`,
              }}
            />
            {!compact && (
              <div className="mt-0.5 text-[8px]" style={{ color: '#a1a1aa' }}>
                {b.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
