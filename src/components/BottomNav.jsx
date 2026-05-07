import { Radar, Clock4, Activity, Settings as SettingsIcon } from 'lucide-react'
import { haptic } from '../haptic.js'

const TABS = [
  { id: 'radar',    label: 'Radar',    Icon: Radar },
  { id: 'timeline', label: 'Timeline', Icon: Clock4 },
  { id: 'insights', label: 'Insights', Icon: Activity },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]

export default function BottomNav({ tab, onChange }) {
  return (
    <nav
      className="fixed left-0 right-0"
      style={{
        bottom: 0,
        // Leaflet's default control z-index is 800. Sit above it so the
        // bottom-right attribution can't intercept taps on the Settings tab.
        zIndex: 1100,
        background: 'rgba(0,0,0,0.78)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex" style={{ height: 58 }}>
        {TABS.map((t) => {
          const active = tab === t.id
          const { Icon } = t
          return (
            <button
              key={t.id}
              onClick={() => {
                if (!active) haptic.selection()
                onChange(t.id)
              }}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
              style={{
                color: active ? '#8b5cf6' : '#71717a',
                minWidth: 0,
              }}
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.3 }}>
                {t.label}
              </span>
              <span
                className="rounded-full transition-all duration-200"
                style={{
                  width: active ? 18 : 4,
                  height: 2,
                  marginTop: -2,
                  background: active ? '#8b5cf6' : 'transparent',
                  boxShadow: active ? '0 0 8px rgba(139,92,246,0.7)' : 'none',
                }}
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
