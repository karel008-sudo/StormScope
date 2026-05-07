import { useEffect, useState } from 'react'
import RadarMap from '../components/RadarMap.jsx'
import StatusCard from '../components/StatusCard.jsx'
import TimelineControl from '../components/TimelineControl.jsx'
import LocationButton from '../components/LocationButton.jsx'
import IntensityLegend from '../components/IntensityLegend.jsx'
import PermissionState from '../components/PermissionState.jsx'
import GlassCard from '../components/GlassCard.jsx'
import { OFFLINE_BANNER_HEIGHT } from '../components/OfflineBanner.jsx'
import { useOnline } from '../hooks/useOnline.js'
import { CloudOff, MapPin } from 'lucide-react'
import { DEFAULT_CENTER } from '../constants.js'

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

  const center = geo.position ? [geo.position.lat, geo.position.lng] : DEFAULT_CENTER

  return (
    <div className="relative" style={{ width: '100%', height: '100dvh' }}>
      {/* Map fills the screen */}
      <div className="absolute inset-0">
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
        />
      </div>

      {/* Top safe-area gradient + header */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: `calc(env(safe-area-inset-top, 0px) + ${110 + headerOffset}px)`,
          background:
            'linear-gradient(to bottom, rgba(11,11,17,0.92) 0%, rgba(11,11,17,0.55) 55%, rgba(11,11,17,0) 100%)',
        }}
      />
      <header
        className="absolute left-0 right-0 px-3 fade-in"
        style={{ top: `calc(env(safe-area-inset-top, 8px) + 8px + ${headerOffset}px)` }}
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
        style={{ top: `calc(env(safe-area-inset-top, 8px) + 130px + ${headerOffset}px)` }}
      >
        <IntensityLegend />
      </div>

      {/* Bottom action stack */}
      <div
        className="absolute left-0 right-0 px-3 flex flex-col gap-2.5"
        style={{
          bottom: 'calc(58px + env(safe-area-inset-bottom, 0px) + 12px)',
        }}
      >
        {/* First-run invitation: show when location is idle and we have no cached fix */}
        {geo.status === 'idle' && !geo.position && (
          <LocateInvitation onRequest={onRequestLocation} />
        )}

        {showPermission && (
          <PermissionState
            kind={
              geo.status === 'unsupported' ? 'unsupported'
              : geo.status === 'os-blocked' ? 'os-blocked'
              : geo.status === 'denied' ? 'denied'
              : 'error'
            }
            onAction={() => {
              setShowPermission(false)
              if (geo.status !== 'os-blocked') onRequestLocation()
            }}
            onDismiss={() => setShowPermission(false)}
          />
        )}

        <div className="flex justify-end pointer-events-none">
          <div className="pointer-events-auto">
            <LocationButton status={geo.status} onClick={onRequestLocation} />
          </div>
        </div>

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
            Tap <strong style={{ color: '#ddd6fe' }}>Locate me</strong> below. StormScope only uses
            your position locally — nothing leaves the device.
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
