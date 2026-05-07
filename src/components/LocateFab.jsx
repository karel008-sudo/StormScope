import { LocateFixed, Loader2, MapPinOff, Crosshair } from 'lucide-react'
import { haptic } from '../haptic.js'

/**
 * Google-Maps-style locate FAB.
 *
 * States:
 *   idle (no position)        — violet primary, prompt-style
 *   requesting                — spinner
 *   ready (have position)     — neutral glass, crosshair → "recenter on me"
 *   denied / os-blocked       — danger accent, opens permission state
 */
export default function LocateFab({ status, hasPosition, onClick, ariaExtra }) {
  const isReq = status === 'requesting'
  const denied =
    status === 'denied' ||
    status === 'os-blocked' ||
    status === 'unsupported' ||
    status === 'error'

  let bg, border, shadow, color, Icon, label
  if (denied) {
    bg = 'rgba(244,63,94,0.18)'
    border = 'rgba(244,63,94,0.55)'
    shadow = '0 10px 24px rgba(244,63,94,0.30)'
    color = '#fda4af'
    Icon = MapPinOff
    label = 'Permission needed for location'
  } else if (hasPosition) {
    bg = 'rgba(11,11,17,0.78)'
    border = 'rgba(255,255,255,0.18)'
    shadow = '0 10px 24px rgba(0,0,0,0.55)'
    color = '#22d3ee'
    Icon = Crosshair
    label = 'Re-center on my location'
  } else {
    bg = 'rgba(139,92,246,0.22)'
    border = 'rgba(139,92,246,0.55)'
    shadow = '0 10px 28px rgba(139,92,246,0.40)'
    color = '#ddd6fe'
    Icon = LocateFixed
    label = 'Locate me'
  }

  return (
    <button
      type="button"
      onClick={() => {
        haptic.medium()
        onClick && onClick()
      }}
      className="rounded-full flex items-center justify-center transition-all active:scale-95"
      style={{
        width: 52, height: 52,
        background: bg,
        border: `1px solid ${border}`,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: shadow,
        color,
      }}
      aria-label={ariaExtra ? `${label} — ${ariaExtra}` : label}
      data-testid="locate-fab"
    >
      {isReq ? <Loader2 size={22} className="animate-spin" /> : <Icon size={22} strokeWidth={2.2} />}
    </button>
  )
}
