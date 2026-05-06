import { useEffect, useState } from 'react'
import AppShell from './components/AppShell.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import Radar from './pages/Radar.jsx'
import Timeline from './pages/Timeline.jsx'
import Insights from './pages/Insights.jsx'
import Settings from './pages/Settings.jsx'
import { usePersistentSettings } from './hooks/usePersistentSettings.js'
import { useGeolocation } from './hooks/useGeolocation.js'
import { useRainViewerFrames } from './hooks/useRainViewerFrames.js'
import { useTimelinePlayer } from './hooks/useTimelinePlayer.js'
import { haptic } from './haptic.js'

const TABS = ['radar', 'timeline', 'insights', 'settings']

export default function App() {
  const [tab, setTab] = useState('radar')
  const [splashDone, setSplashDone] = useState(false)
  const { settings, update, reset, ready: settingsReady } = usePersistentSettings()
  const geo = useGeolocation()
  const {
    data, loading, refreshing, error, fromCache, lastFetchAt,
  } = useRainViewerFrames()

  const frames = data?.frames ?? []
  const player = useTimelinePlayer(frames, { speed: settings.playbackSpeed })

  // First-paint splash — wait for either settings ready or 800ms safety timeout
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 800)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => { if (settingsReady) setSplashDone(true) }, [settingsReady])

  // Auto-request location on first launch (lazy — wait for splash)
  useEffect(() => {
    if (!splashDone) return
    if (geo.status === 'idle') {
      // Slight delay so the user sees the map first
      const t = setTimeout(() => geo.request(), 600)
      return () => clearTimeout(t)
    }
  }, [splashDone, geo.status, geo])

  // When user grants location, give a happy buzz
  useEffect(() => {
    if (geo.status === 'granted' && geo.position && !geo.position.cached) {
      haptic.success()
    }
  }, [geo.status, geo.position])

  if (!splashDone) {
    return <Splash />
  }

  return (
    <>
      <OfflineBanner />
      <AppShell tab={tab} onTabChange={(t) => TABS.includes(t) && setTab(t)} fullBleed={tab === 'radar'}>
        {tab === 'radar' && (
          <Radar
            frames={frames}
            data={data}
            loading={loading}
            refreshing={refreshing}
            fromCache={fromCache}
            error={error}
            player={player}
            geo={geo}
            settings={settings}
            onRequestLocation={() => geo.request()}
          />
        )}
        {tab === 'timeline' && (
          <Timeline
            frames={frames}
            player={player}
            onJumpToRadar={() => setTab('radar')}
          />
        )}
        {tab === 'insights' && (
          <Insights
            frames={frames}
            data={data}
            error={error}
            fromCache={fromCache}
            refreshing={refreshing}
            geo={geo}
            lastFetchAt={lastFetchAt}
          />
        )}
        {tab === 'settings' && (
          <Settings
            settings={settings}
            onUpdate={update}
            onReset={reset}
          />
        )}
      </AppShell>
    </>
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
          {/* SVG mark — concentric rings + bolt */}
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
