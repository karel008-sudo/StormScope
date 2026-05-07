import { lazy, Suspense, useEffect, useState } from 'react'
import AppShell from './components/AppShell.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import Radar from './pages/Radar.jsx'
import Timeline from './pages/Timeline.jsx'
import Settings from './pages/Settings.jsx'
import { usePersistentSettings } from './hooks/usePersistentSettings.js'
import { useGeolocation } from './hooks/useGeolocation.js'
import { useRainViewerFrames } from './hooks/useRainViewerFrames.js'
import { useTimelinePlayer } from './hooks/useTimelinePlayer.js'
import { haptic } from './haptic.js'
import GlassCard from './components/GlassCard.jsx'

// Insights pulls in Recharts (~150 KB) — only load when user opens the tab.
const Insights = lazy(() => import('./pages/Insights.jsx'))
// LogViewer is admin-only; lazy-load so non-admin users never download it.
const LogViewer = lazy(() => import('./pages/LogViewer.jsx'))

const TABS = ['radar', 'timeline', 'insights', 'settings']

export default function App() {
  const [tab, setTab] = useState('radar')
  const [subView, setSubView] = useState(null) // null | 'logs'
  const [splashDone, setSplashDone] = useState(false)
  const { settings, update, reset, ready: settingsReady } = usePersistentSettings()
  const geo = useGeolocation()
  const {
    data, loading, refreshing, error, fromCache, stale, lastFetchAt,
  } = useRainViewerFrames()

  const frames = data?.frames ?? []
  const player = useTimelinePlayer(frames, { speed: settings.playbackSpeed })

  // Splash: settings ready OR safety timeout
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 800)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => { if (settingsReady) setSplashDone(true) }, [settingsReady])

  // Apply reduce-motion preference at body level when user toggles it
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('reduce-motion', !!settings.reduceMotion)
  }, [settings.reduceMotion])

  // Successful (live) location → small success buzz
  useEffect(() => {
    if (geo.status === 'granted' && geo.position && !geo.position.cached) {
      haptic.success()
    }
  }, [geo.status, geo.position])

  if (!splashDone) return <Splash />

  return (
    <>
      <OfflineBanner />
      <AppShell
        tab={tab}
        onTabChange={(t) => TABS.includes(t) && setTab(t)}
        fullBleed={tab === 'radar'}
      >
        {/* Keep Radar mounted across tabs for instant return + map context. */}
        <div style={{ display: tab === 'radar' ? 'block' : 'none' }}>
          <Radar
            frames={frames}
            data={data}
            loading={loading}
            refreshing={refreshing}
            fromCache={fromCache}
            stale={stale}
            error={error}
            player={player}
            geo={geo}
            settings={settings}
            visible={tab === 'radar'}
            onRequestLocation={() => geo.request()}
          />
        </div>

        {tab === 'timeline' && (
          <Timeline
            frames={frames}
            player={player}
            onJumpToRadar={() => setTab('radar')}
          />
        )}

        {tab === 'insights' && (
          <Suspense fallback={<TabLoading label="Loading insights…" />}>
            <Insights
              frames={frames}
              data={data}
              error={error}
              fromCache={fromCache}
              stale={stale}
              refreshing={refreshing}
              geo={geo}
              lastFetchAt={lastFetchAt}
            />
          </Suspense>
        )}

        {tab === 'settings' && (
          <Settings
            settings={settings}
            onUpdate={update}
            onReset={reset}
            onOpenLogs={() => setSubView('logs')}
          />
        )}
      </AppShell>

      {subView === 'logs' && (
        <div
          className="fixed inset-0 z-[1200] overflow-y-auto fade-in"
          style={{ background: '#0b0b11' }}
          role="dialog"
          aria-modal="true"
          aria-label="Dev logs"
        >
          <Suspense fallback={<TabLoading label="Opening dev logs…" />}>
            <LogViewer onBack={() => setSubView(null)} />
          </Suspense>
        </div>
      )}
    </>
  )
}

function TabLoading({ label }) {
  return (
    <div
      className="px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}
    >
      <GlassCard strong className="px-4 py-6 text-center" aria-busy="true" aria-live="polite">
        <div
          className="mx-auto mb-2 rounded-full"
          style={{
            width: 28, height: 28,
            border: '2px solid rgba(139,92,246,0.25)',
            borderTopColor: '#8b5cf6',
            animation: 'spin 0.9s linear infinite',
          }}
        />
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        <div style={{ color: '#a1a1aa', fontSize: 12 }}>{label}</div>
      </GlassCard>
    </div>
  )
}

function Splash() {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        minHeight: '100dvh',
        background: 'radial-gradient(ellipse at center, #1a0b2e 0%, #0b0b11 70%)',
      }}
      aria-label="StormScope loading"
    >
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.55) 0%, transparent 70%)',
            filter: 'blur(20px)',
            transform: 'scale(2.5)',
          }}
        />
        <div
          className="relative flex items-center justify-center rounded-3xl"
          style={{
            width: 96, height: 96,
            background: 'linear-gradient(135deg, #1a0b2e, #0b0b11)',
            border: '1px solid rgba(139,92,246,0.4)',
            boxShadow: '0 30px 60px rgba(139,92,246,0.25)',
          }}
        >
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="20" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
            <circle cx="32" cy="32" r="13" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            <circle cx="32" cy="32" r="6" stroke="rgba(255,255,255,0.30)" strokeWidth="1" />
            <line x1="32" y1="6" x2="32" y2="32" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M34 18 L26 36 L31 36 L28 50 L40 30 L34 30 Z" fill="#fbbf24" />
          </svg>
        </div>
      </div>
      <div className="mt-6" style={{ color: '#f8f8ff', fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>
        StormScope
      </div>
      <div className="mt-1" style={{ color: '#a1a1aa', fontSize: 12 }}>
        Live radar around you
      </div>
    </div>
  )
}
