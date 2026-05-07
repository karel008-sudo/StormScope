import { lazy, Suspense, useEffect, useState } from 'react'
import AppShell from './components/AppShell.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import Radar from './pages/Radar.jsx'
import Timeline from './pages/Timeline.jsx'
import Settings from './pages/Settings.jsx'
import WhatsNewSheet from './components/WhatsNewSheet.jsx'
import Splash from './components/Splash.jsx'
import { usePersistentSettings } from './hooks/usePersistentSettings.js'
import { useGeolocation } from './hooks/useGeolocation.js'
import { useRainViewerFrames } from './hooks/useRainViewerFrames.js'
import { useTimelinePlayer } from './hooks/useTimelinePlayer.js'
import { useVersionGate } from './hooks/useVersionGate.js'
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
  const version = useVersionGate()

  // Splash dwell: minimum visible time so the intro feels intentional, not a
  // flicker. Cap with a hard ceiling in case settings hang. The splash dwell
  // dominates first paint (~1.6 s) — we wait for both timer AND settings.
  const [minDwellElapsed, setMinDwellElapsed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMinDwellElapsed(true), 1600)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (minDwellElapsed && settingsReady) setSplashDone(true)
  }, [minDwellElapsed, settingsReady])
  // Hard ceiling — never block more than 3 s
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 3000)
    return () => clearTimeout(t)
  }, [])

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

  return (
    <>
      {!splashDone && <Splash />}
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
            onShowReleaseNotes={version.showAgain}
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

      {version.shouldShowWhatsNew && (
        <WhatsNewSheet
          sinceVersion={version.lastSeen}
          onDismiss={version.dismiss}
          onClose={version.dismiss}
        />
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

