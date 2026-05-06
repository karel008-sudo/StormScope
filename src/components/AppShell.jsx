import BottomNav from './BottomNav.jsx'

/**
 * AppShell wraps every page with safe-area padding and the bottom nav.
 * Pages decide whether they want full-bleed (Radar) or padded (Settings).
 */
export default function AppShell({ tab, onTabChange, children, fullBleed = false }) {
  return (
    <div
      className="relative"
      style={{
        minHeight: '100dvh',
        background: '#0b0b11',
        // bottom padding = nav height (58) + safe-area
        paddingBottom: fullBleed ? 0 : 'calc(58px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {children}
      <BottomNav tab={tab} onChange={onTabChange} />
    </div>
  )
}
