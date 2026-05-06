import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const onUp = () => setOnline(true)
    const onDown = () => setOnline(false)
    window.addEventListener('online', onUp)
    window.addEventListener('offline', onDown)
    return () => {
      window.removeEventListener('online', onUp)
      window.removeEventListener('offline', onDown)
    }
  }, [])
  if (online) return null
  return (
    <div
      className="fixed left-0 right-0 z-50 fade-in"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px))',
        background: 'rgba(245,158,11,0.16)',
        borderBottom: '1px solid rgba(245,158,11,0.3)',
        color: '#fbbf24',
        padding: '8px 14px',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
        backdropFilter: 'blur(14px)',
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
