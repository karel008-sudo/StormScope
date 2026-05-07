import { ShieldAlert, MapPinOff, WifiOff, Lock } from 'lucide-react'
import GlassCard from './GlassCard.jsx'

const PRESETS = {
  denied: {
    Icon: MapPinOff,
    title: 'Permission needed',
    desc: 'StormScope needs your location to center the radar around you. Allow location for this site, then try again.',
    cta: 'Try again',
    accent: '#f43f5e',
  },
  'os-blocked': {
    Icon: Lock,
    title: 'Location blocked',
    desc: "Location looks blocked at the OS or browser level. Re-prompting won't help until you change settings:\n• iOS: Settings → Privacy & Security → Location Services → Safari/StormScope → While Using\n• macOS: System Settings → Privacy & Security → Location Services → Safari → On\n• Desktop browsers: padlock in URL bar → Site settings → Location → Allow",
    cta: 'Got it',
    accent: '#f43f5e',
  },
  unsupported: {
    Icon: ShieldAlert,
    title: 'Geolocation unavailable',
    desc: 'Your browser does not provide a geolocation API. The map will stay on its default view.',
    cta: 'Got it',
    accent: '#fbbf24',
  },
  error: {
    Icon: ShieldAlert,
    title: "Couldn't get your location",
    desc: 'Something went wrong while reading your position. Try again, or move to an area with better signal.',
    cta: 'Try again',
    accent: '#fbbf24',
  },
  offline: {
    Icon: WifiOff,
    title: 'You are offline',
    desc: 'StormScope can still show the last cached radar metadata, but new frames will appear once you are back online.',
    cta: 'Dismiss',
    accent: '#fbbf24',
  },
}

export default function PermissionState({ kind = 'denied', onAction, onDismiss }) {
  const cfg = PRESETS[kind] || PRESETS.error
  const { Icon, title, desc, cta, accent } = cfg
  return (
    <GlassCard strong className="p-4 fade-in" role="alertdialog" aria-label={title}>
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `${accent}1f`,
            border: `1px solid ${accent}55`,
          }}
          aria-hidden="true"
        >
          <Icon size={20} style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <div style={{ color: '#f8f8ff', fontWeight: 700, fontSize: 14 }}>{title}</div>
          <p
            className="mt-1"
            style={{ color: '#a1a1aa', fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre-line' }}
          >
            {desc}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2 justify-end">
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full px-4 py-2 text-xs font-semibold"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#a1a1aa',
              minHeight: 36,
            }}
          >
            Close
          </button>
        )}
        {onAction && kind !== 'os-blocked' && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full px-4 py-2 text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(139,92,246,0.45)',
              minHeight: 36,
            }}
          >
            {cta}
          </button>
        )}
        {onAction && kind === 'os-blocked' && (
          <button
            type="button"
            onClick={onDismiss || onAction}
            className="rounded-full px-4 py-2 text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(139,92,246,0.45)',
              minHeight: 36,
            }}
          >
            {cta}
          </button>
        )}
      </div>
    </GlassCard>
  )
}
