import { Check } from 'lucide-react'
import { RAINVIEWER_COLOR_SCHEMES } from '../providers/rainviewerProvider.js'
import { haptic } from '../haptic.js'

// Approximate color stops for each RainViewer color scheme so users can
// preview the palette without loading a tile. Order matches scheme value.
const SCHEME_GRADIENTS = {
  0: 'linear-gradient(90deg, #1f1f1f, #cdcdcd)',                                      // BW
  1: 'linear-gradient(90deg, #053061, #4393c3, #fee090, #d6604d, #67001f)',           // Original
  2: 'linear-gradient(90deg, #1d2f6f, #2a9df4, #34d399, #fbbf24, #ef4444, #ec4899)',  // Universal Blue
  3: 'linear-gradient(90deg, #053061, #1d4ed8, #16a34a, #f59e0b, #ef4444)',           // TITAN
  4: 'linear-gradient(90deg, #022b6b, #0ea5e9, #14b8a6, #fde68a, #db2777, #b91c1c)',  // Weather Channel
  5: 'linear-gradient(90deg, #0ea5e9, #22d3ee, #22c55e, #facc15, #ef4444)',           // Meteored
  6: 'linear-gradient(90deg, #06b6d4, #16a34a, #fde047, #ef4444, #ec4899)',           // NEXRAD III
  7: 'linear-gradient(90deg, #1d4ed8, #06b6d4, #16a34a, #facc15, #f97316, #ef4444, #db2777)', // Rainbow
  8: 'linear-gradient(90deg, #1e3a8a, #7c3aed, #db2777, #ef4444)',                    // Dark Sky
}

/**
 * Premium glass color scheme picker.
 * Horizontal scrollable chip rail; each chip shows the palette as a
 * short gradient bar plus the scheme name. Selected chip glows violet
 * and shows a check.
 */
export default function ColorSchemePicker({ value, onChange, label = 'Color scheme', desc }) {
  return (
    <div>
      <div style={{ color: '#d4d4d8', fontSize: 13, fontWeight: 600 }}>{label}</div>
      {desc && <div style={{ color: '#71717a', fontSize: 11.5, marginTop: 1 }}>{desc}</div>}
      <div
        className="mt-2 -mx-3.5 px-3.5 overflow-x-auto no-scrollbar"
        role="radiogroup"
        aria-label={label}
      >
        <div className="flex gap-2" style={{ paddingBottom: 4 }}>
          {RAINVIEWER_COLOR_SCHEMES.map((s) => {
            const active = value === s.value
            const gradient = SCHEME_GRADIENTS[s.value] || SCHEME_GRADIENTS[2]
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  if (!active) {
                    haptic.selection()
                    onChange(s.value)
                  }
                }}
                className="rounded-2xl shrink-0 transition-all active:scale-[0.98]"
                style={{
                  width: 132,
                  padding: '8px 10px 10px',
                  background: active ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.10)'}`,
                  boxShadow: active ? '0 8px 24px rgba(139,92,246,0.28)' : 'none',
                  textAlign: 'left',
                }}
              >
                <div
                  className="rounded-md"
                  style={{
                    height: 14,
                    background: gradient,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                  }}
                  aria-hidden="true"
                />
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span
                    className="truncate"
                    style={{
                      color: active ? '#ddd6fe' : '#d4d4d8',
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: 0.1,
                    }}
                  >
                    {s.label}
                  </span>
                  {active && (
                    <Check size={12} style={{ color: '#a78bfa', flexShrink: 0 }} aria-hidden="true" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
