import { LocateFixed, Loader2, MapPinOff } from 'lucide-react'
import { haptic } from '../haptic.js'

export default function LocationButton({ status, onClick }) {
  const isReq = status === 'requesting'
  const denied = status === 'denied' || status === 'unsupported' || status === 'error'
  return (
    <button
      onClick={() => {
        haptic.medium()
        onClick && onClick()
      }}
      className="inline-flex items-center gap-2 rounded-full transition-all active:scale-95"
      style={{
        background: denied ? 'rgba(244,63,94,0.18)' : 'rgba(139,92,246,0.22)',
        border: `1px solid ${denied ? 'rgba(244,63,94,0.45)' : 'rgba(139,92,246,0.55)'}`,
        color: denied ? '#fda4af' : '#ddd6fe',
        padding: '9px 14px',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
        boxShadow: denied
          ? '0 6px 20px rgba(244,63,94,0.18)'
          : '0 8px 24px rgba(139,92,246,0.28)',
      }}
      aria-label="Locate me"
    >
      {isReq ? (
        <Loader2 size={14} className="animate-spin" />
      ) : denied ? (
        <MapPinOff size={14} />
      ) : (
        <LocateFixed size={14} />
      )}
      {isReq ? 'Locating…' : denied ? 'Permission needed' : 'Locate me'}
    </button>
  )
}
