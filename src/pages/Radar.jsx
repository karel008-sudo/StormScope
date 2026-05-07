import { useEffect, useMemo, useRef, useState } from 'react'
import RadarMap from '../components/RadarMap.jsx'
import StatusCard from '../components/StatusCard.jsx'
import TimelineControl from '../components/TimelineControl.jsx'
import LocateFab from '../components/LocateFab.jsx'
import IntensityLegend from '../components/IntensityLegend.jsx'
import PermissionState from '../components/PermissionState.jsx'
import GlassCard from '../components/GlassCard.jsx'
import ForecastStrip from '../components/ForecastStrip.jsx'
import { OFFLINE_BANNER_HEIGHT } from '../components/OfflineBanner.jsx'
import { useOnline } from '../hooks/useOnline.js'
import { useOpenMeteoForecast } from '../hooks/useOpenMeteoForecast.js'
import { CloudOff, MapPin } from 'lucide-react'
import { DEFAULT_CENTER } from '../constants.js'

const FRESH_FIX_MS = 30_000

export default function Radar({
  frames,
  data,
  loading,
  refreshing,
  fromCache,
  stale,
  error,
  player,
  geo,
  settings,
  visible,
  onRequestLocation,
}) {
  const [showPermission, setShowPermission] = useState(false)
  const [recenterToken, setRecenterToken] = useState(0)
  const wantRecenterAfterFix = useRef(false)
  const lastFixTsRef = useRef(0)
  const online = useOnline()
  const headerOffset = online ? 0 : OFFLINE_BANNER_HEIGHT

  useEffect(() => {
    if (
      geo.status === 'denied' ||
      geo.status === 'os-blocked' ||
      geo.status === 'error' ||
      geo.status === 'unsupported'
    ) {
      setShowPermission(true)
    } else if (geo.status === 'granted') {
      setShowPermission(false)
    }
  }, [geo.status])

  // When a freshly-acquired position arrives after an explicit Locate tap,
  // fire the recenter token regardless of the followLocation setting.
  useEffect(() => {
    if (!geo.position) return
    if (geo.position.ts === lastFixTsRef.current) return
    lastFixTsRef.current = geo.position.ts
    if (wantRecenterAfterFix.current && !geo.position.cached) {
      wantRecenterAfterFix.current = false
      setRecenterToken((t) => t + 1)
    }
  }, [geo.position])

  const center = geo.position ? [geo.position.lat, geo.position.lng] : DEFAULT_CENTER

  // Open-Meteo point forecast at the user's position (or default if denied).
  // Provides 15-min precipitation buckets for the next 2 hours, refreshed
  // every 5 min — fills the "no forecast frames" gap when RainViewer's
  // tile-based nowcast is empty (which is most of the time).
  const forecastPosition = useMemo(
    () => (geo.position
      ? { lat: geo.position.lat, lng: geo.position.lng }
      : { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }),
    [geo.position],
  )
  const forecast = useOpenMeteoForecast(forecastPosition)

  const handleLocateFab = () => {
    if (
      geo.status === 'denied' ||
      geo.status === 'os-blocked' ||
      geo.status === 'unsupported' ||
      geo.status === 'error'
    ) {
      // Reveal the PermissionState card so the user gets concrete guidance.
      setShowPermission(true)
      return
    }
    if (geo.position) {
      // Always re-center on tap. If the fix is fresh enough, just fly to it;
      // otherwise also kick a refresh request in the background.
      setRecenterToken((t) => t + 1)
      const age = geo.position.ts ? Date.now() - geo.position.ts : Infinity
      if (geo.position.cached || age > FRESH_FIX_MS) {
        wantRecenterAfterFix.current = true
        onRequestLocation()
      }
    } else {
      // No position yet — request it and queue a recenter for when it arrives.
      wantRecenterAfterFix.current = true
      onRequestLocation()
    }
  }

  return (
    // position:fixed inset:0 guarantees the radar fills the viewport on iOS
    // standalone PWA, where `height: 100dvh` inside a normal-flow wrapper has
    // been observed to under-resolve and leave the map confined to the middle
    // of the screen with the bottom nav floating mid-viewport. Bottom nav
    // (z=1100) still wins z-order, so it sits above this layer.
    <div
      className="fixed inset-0"
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {/* Map fills the screen — explicit z-index so the map's leaflet panes
          (z-400+) stay below the overlay UI. */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <RadarMap
          center={center}
          zoom={settings.defaultZoom || 7}
          userPosition={geo.position}
          host={data?.host}
          selectedFrame={player.selected}
          opacity={settings.radarOpacity}
          followLocation={settings.followLocation}
          smooth={settings.smoothRadar}
          snow={settings.showSnowLayer}
          color={settings.preferredColor}
          visible={visible}
          recenterToken={recenterToken}
        />
      </div>

      {/* Top safe-area gradient + header */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          zIndex: 5,
          height: `calc(env(safe-area-inset-top, 0px) + ${110 + headerOffset}px)`,
          background:
            'linear-gradient(to bottom, rgba(11,11,17,0.92) 0%, rgba(11,11,17,0.55) 55%, rgba(11,11,17,0) 100%)',
        }}
      />
      <header
        className="absolute left-0 right-0 px-3 fade-in"
        style={{
          zIndex: 10,
          top: `calc(env(safe-area-inset-top, 8px) + 8px + ${headerOffset}px)`,
        }}
      >
        <StatusCard
          provider="RainViewer"
          pastCount={data?.pastCount || 0}
          nowcastCount={data?.nowcastCount || 0}
          generatedAt={data?.generatedAt}
          refreshing={refreshing}
          fromCache={fromCache}
          stale={stale}
          error={error}
        />
      </header>

      {/* Right-side toolset (legend) */}
      <div
        className="absolute right-3 pointer-events-none"
        style={{
          zIndex: 10,
          top: `calc(env(safe-area-inset-top, 8px) + 130px + ${headerOffset}px)`,
        }}
      >
        <IntensityLegend />
      </div>

      {/* Bottom action stack — outer is click-through so the FAB above it
          stays tappable; each child opts into pointer events. */}
      <div
        className="absolute left-0 right-0 px-3 flex flex-col gap-2.5 pointer-events-none"
        style={{
          zIndex: 20,
          bottom: 'calc(58px + env(safe-area-inset-bottom, 0px) + 12px)',
        }}
      >
        {geo.status === 'idle' && !geo.position && (
          <div className="pointer-events-auto">
            <LocateInvitation onRequest={handleLocateFab} />
          </div>
        )}

        {showPermission && (
          <div className="pointer-events-auto">
            <PermissionState
              kind={
                geo.status === 'unsupported' ? 'unsupported'
                : geo.status === 'os-blocked' ? 'os-blocked'
                : geo.status === 'denied' ? 'denied'
                : 'error'
              }
              onAction={() => {
                setShowPermission(false)
                if (geo.status !== 'os-blocked') {
                  wantRecenterAfterFix.current = true
                  onRequestLocation()
                }
              }}
              onDismiss={() => setShowPermission(false)}
            />
          </div>
        )}

        {/* Real point-forecast strip — shows up even if RainViewer's
            nowcast is empty. Lives ABOVE the timeline because forecast is
            the user's primary "what comes next" signal. */}
        <div className="pointer-events-auto">
          <ForecastStrip
            data={forecast.data}
            loading={forecast.loading}
            error={forecast.error}
            hasLocation={!!geo.position}
          />
        </div>

        <div className="pointer-events-auto">
          {loading ? (
            <SkeletonTimeline />
          ) : frames.length === 0 ? (
            <NoFramesCard />
          ) : (
            <TimelineControl
              frames={frames}
              index={player.index}
              selected={player.selected}
              isPlaying={player.isPlaying}
              nowIndex={player.nowIndex}
              onTogglePlay={player.toggle}
              onScrub={player.setIndex}
              onStepBack={player.stepBack}
              onStepForward={player.stepForward}
              onSnapNow={player.snapToNow}
            />
          )}
        </div>
      </div>

      {/* Locate FAB (Google-Maps style, with caption) — highest z so it sits
          above any overlapping cards in the bottom stack. The caption beneath
          the icon makes the control unmissable on a dark map. Offset clears
          the timeline (~150 px) + the new ForecastStrip (~95 px) + gaps. */}
      <div
        className="absolute right-3"
        style={{
          zIndex: 40,
          bottom: 'calc(58px + env(safe-area-inset-bottom, 0px) + 12px + 310px)',
        }}
      >
        <LocateFab
          status={geo.status}
          hasPosition={!!geo.position}
          onClick={handleLocateFab}
        />
      </div>
    </div>
  )
}

function LocateInvitation({ onRequest }) {
  return (
    <GlassCard strong className="p-3.5 fade-in">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(34,211,238,0.16)',
            border: '1px solid rgba(34,211,238,0.4)',
          }}
        >
          <MapPin size={18} style={{ color: '#22d3ee' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div style={{ color: '#f8f8ff', fontWeight: 700, fontSize: 14 }}>
            Center the radar on you?
          </div>
          <p className="mt-1" style={{ color: '#a1a1aa', fontSize: 12.5, lineHeight: 1.45 }}>
            Tap the crosshair button on the right. StormScope only uses your
            position locally — nothing leaves the device.
          </p>
        </div>
        <button
          onClick={onRequest}
          className="rounded-full font-bold shrink-0"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
            color: '#fff',
            padding: '8px 14px',
            fontSize: 12,
            boxShadow: '0 8px 20px rgba(139,92,246,0.4)',
            minHeight: 36,
          }}
          aria-label="Use my location"
        >
          Locate
        </button>
      </div>
    </GlassCard>
  )
}

function SkeletonTimeline() {
  return (
    <GlassCard strong className="p-3" aria-busy="true" aria-live="polite">
      <div className="skeleton h-4 w-32 rounded mb-3" />
      <div className="skeleton h-2 w-full rounded mb-2" />
      <div className="flex justify-center gap-2 mt-4">
        <div className="skeleton w-11 h-11 rounded-full" />
        <div className="skeleton w-14 h-14 rounded-full" />
        <div className="skeleton w-11 h-11 rounded-full" />
      </div>
    </GlassCard>
  )
}

function NoFramesCard() {
  return (
    <GlassCard strong className="p-4 fade-in">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(244,63,94,0.16)',
            border: '1px solid rgba(244,63,94,0.4)',
          }}
        >
          <CloudOff size={20} style={{ color: '#f43f5e' }} />
        </div>
        <div>
          <div style={{ color: '#f8f8ff', fontWeight: 700, fontSize: 14 }}>
            No radar frames available
          </div>
          <p className="mt-1" style={{ color: '#a1a1aa', fontSize: 12.5, lineHeight: 1.45 }}>
            The provider returned an empty frame list. We will keep checking in the background.
          </p>
        </div>
      </div>
    </GlassCard>
  )
}
