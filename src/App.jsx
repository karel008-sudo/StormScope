import { lazy, Suspense, useEffect, useState } from 'react'
import AppShell from './components/AppShell.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import Radar from './pages/Radar.jsx'
import Timeline from './pages/Timeline.jsx'
import Settings from './pages/Settings.jsx'
import WhatsNewSheet from './components/WhatsNewSheet.jsx'
import { usePersistentSettings } from './hooks/usePersistentSettings.js'
import { useGeolocation } from './hooks/useGeolocation.js'
import { useRainViewerFrames } from './hooks/useRainViewerFrames.js'
import { useChmiFrames } from './hooks/useChmiFrames.js'
import { useTimelinePlayer } from './hooks/useTimelinePlayer.js'
import { useVersionGate } from './hooks/useVersionGate.js'
import { haptic } from './haptic.js'
import { isInsideChmiCoverage } from './providers/chmiProvider.js'
import { DEFAULT_CENTER } from './constants.js'
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

  const rv = useRainViewerFrames()

  // ČHMÚ wins over RainViewer when (a) the user opted in via Settings AND
  // (b) they're physically inside the CZ data bbox (or no fix yet, in which
  // case we tentatively enable since DEFAULT_CENTER = Prague).
  const userPos = geo.position
    ? { lat: geo.position.lat, lng: geo.position.lng }
    : { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }
  const userInCz = isInsideChmiCoverage(userPos)
  const chmiActive = !!settings.chmiEnabled && userInCz
  const chmi = useChmiFrames({ enabled: chmiActive })

  // If ČHMÚ is the active source AND it actually delivered frames, use it.
  // Otherwise fall back to RainViewer (which is always running). The fallback
  // is silent — the user just sees RainViewer with a hint in StatusCard.
  const useChmi = chmiActive && chmi.data && chmi.data.frames.length > 0
  const data       = useChmi ? chmi.data        : rv.data
  const loading    = useChmi ? chmi.loading     : rv.loading
  const refreshing = useChmi ? chmi.refreshing  : rv.refreshing
  const error      = useChmi ? chmi.error       : rv.error
  const fromCache  = useChmi ? chmi.fromCache   : rv.fromCache
  const stale      = useChmi ? chmi.stale       : rv.stale
  const lastFetchAt = useChmi ? chmi.lastFetchAt : rv.lastFetchAt

  const frames = data?.frames ?? []
  const player = useTimelinePlayer(frames, { speed: settings.playbackSpeed })
  const providerLabel = useChmi ? 'ČHMÚ (CZRAD)' : 'RainViewer'
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

  // Splash teardown: the splash is the inline #boot-splash <div> in
  // index.html — it's been animating since HTML parse, before React even
  // mounted. Once we're ready, fade it out smoothly and remove it from the
  // DOM. Doing it this way (instead of mounting a React <Splash /> on top)
  // avoids the visual jump that comes from two independent CSS animation
  // timelines running side-by-side for a frame.
  useEffect(() => {
    if (!splashDone) return
    const boot = document.getElementById('boot-splash')
    if (!boot) return
    boot.classList.add('is-fading')
    const t = setTimeout(() => {
      boot.parentNode && boot.parentNode.removeChild(boot)
    }, 360)
    return () => clearTimeout(t)
  }, [splashDone])

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
            providerLabel={providerLabel}
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

