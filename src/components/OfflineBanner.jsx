import { WifiOff } from 'lucide-react'
import { useOnline } from '../hooks/useOnline.js'

export const OFFLINE_BANNER_HEIGHT = 32

export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      className="fixed left-0 right-0 z-50 fade-in"
      role="status"
      aria-live="polite"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        height: OFFLINE_BANNER_HEIGHT,
        background: 'rgba(245,158,11,0.18)',
        borderBottom: '1px solid rgba(245,158,11,0.3)',
        color: '#fbbf24',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
      }}
    >
      <WifiOff size={14} />
      Offline shell active — using cached radar data
    </div>
  )
}
