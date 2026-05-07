import { LocateFixed, Loader2, MapPinOff, Crosshair } from 'lucide-react'
import { haptic } from '../haptic.js'

/**
 * Google-Maps-style locate FAB with a permanent text caption beneath so it
 * cannot be mistaken for decoration. When there's no fix yet the FAB also
 * pulses a faint ring to draw attention.
 *
 * States:
 *   idle (no position)        — violet primary, animated pulse, "Locate me"
 *   requesting                — spinner, "Locating…"
 *   ready (have position)     — neutral glass, crosshair, "Center on me"
 *   denied / os-blocked       — danger accent, "Permission needed"
 */
export default function LocateFab({ status, hasPosition, onClick, ariaExtra }) {
  const isReq = status === 'requesting'
  const denied =
    status === 'denied' ||
    status === 'os-blocked' ||
    status === 'unsupported' ||
    status === 'error'

  let bg, border, shadow, color, Icon, label, pulse
  if (denied) {
    bg = 'rgba(244,63,94,0.20)'
    border = 'rgba(244,63,94,0.60)'
    shadow = '0 12px 28px rgba(244,63,94,0.35)'
    color = '#fda4af'
    Icon = MapPinOff
    label = 'Permission needed'
    pulse = false
  } else if (isReq) {
    bg = 'rgba(139,92,246,0.22)'
    border = 'rgba(139,92,246,0.55)'
    shadow = '0 12px 28px rgba(139,92,246,0.45)'
    color = '#ddd6fe'
    Icon = Loader2
    label = 'Locating…'
    pulse = false
  } else if (hasPosition) {
    bg = 'rgba(11,11,17,0.82)'
    border = 'rgba(255,255,255,0.22)'
    shadow = '0 12px 28px rgba(0,0,0,0.55)'
    color = '#22d3ee'
    Icon = Crosshair
    label = 'Center on me'
    pulse = false
  } else {
    bg = 'rgba(139,92,246,0.24)'
    border = 'rgba(139,92,246,0.65)'
    shadow = '0 14px 32px rgba(139,92,246,0.50)'
    color = '#ddd6fe'
    Icon = LocateFixed
    label = 'Locate me'
    pulse = true
  }

  return (
    <div
      className="flex flex-col items-center gap-1.5"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="relative">
        {pulse && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{
              background: 'rgba(139,92,246,0.55)',
              animation: 'locateFabPulse 1.6s ease-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}
        <button
          type="button"
          onClick={() => {
            haptic.medium()
            onClick && onClick()
          }}
          className="relative rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{
            width: 60, height: 60,
            background: bg,
            border: `1.5px solid ${border}`,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: shadow,
            color,
          }}
          aria-label={ariaExtra ? `${label} — ${ariaExtra}` : label}
          data-testid="locate-fab"
        >
          <Icon
            size={24}
            strokeWidth={2.2}
            className={isReq ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {/* Always-visible caption — guarantees the user spots the control even
          if the icon alone would blend into the dark map. */}
      <span
        className="rounded-full px-2.5 py-0.5 font-bold uppercase tracking-widest"
        style={{
          fontSize: 9.5,
          color: denied ? '#fda4af' : hasPosition ? '#a1a1aa' : '#ddd6fe',
          background: denied
            ? 'rgba(244,63,94,0.18)'
            : hasPosition
            ? 'rgba(11,11,17,0.78)'
            : 'rgba(139,92,246,0.20)',
          border: `1px solid ${denied
            ? 'rgba(244,63,94,0.45)'
            : hasPosition
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(139,92,246,0.45)'}`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          letterSpacing: 0.6,
        }}
      >
        {label}
      </span>

      <style>{`
        @keyframes locateFabPulse {
          0%   { transform: scale(0.95); opacity: 0.7; }
          80%  { transform: scale(1.6);  opacity: 0;   }
          100% { transform: scale(1.6);  opacity: 0;   }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="locate-fab"] + span,
          [data-testid="locate-fab"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
