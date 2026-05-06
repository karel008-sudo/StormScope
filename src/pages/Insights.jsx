import { useMemo } from 'react'
import {
  BarChart, Bar, ResponsiveContainer, XAxis, Tooltip,
} from 'recharts'
import {
  Radio, MapPin, Smartphone, ShieldCheck, ShieldAlert, Zap,
} from 'lucide-react'
import GlassCard from '../components/GlassCard.jsx'
import { fmtClock, fmtDateTime, minutesBetween } from '../utils/time.js'
import { fmtCoords } from '../utils/format.js'

export default function Insights({ frames, data, error, fromCache, refreshing, geo, lastFetchAt }) {
  const meta = useMemo(() => deriveMeta(frames, data), [frames, data])

  const radarOk = !error && (data?.pastCount || 0) > 0
  const locOk = geo.status === 'granted'
  const installable = typeof window !== 'undefined' && 'serviceWorker' in navigator
  const offlineReady = !!fromCache || !!data

  return (
    <div
      className="px-4 fade-in"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Radio size={16} style={{ color: '#22d3ee' }} />
          <h1 style={{ color: '#f8f8ff', fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>
            Insights
          </h1>
        </div>
        <p className="mt-0.5" style={{ color: '#71717a', fontSize: 12.5 }}>
          Honest signals about the radar feed
        </p>
      </div>

      <SectionTitle>Feed metadata</SectionTitle>
      <GlassCard strong className="px-3.5 py-3 space-y-2">
        <Row label="Provider" value="RainViewer" />
        <Row label="Frames available" value={`${meta.total} (past ${meta.past} · forecast ${meta.nowcast})`} />
        <Row label="Oldest frame" value={meta.oldestStr} />
        <Row label="Latest sweep" value={meta.latestStr} />
        <Row label="Update cadence" value={meta.cadenceStr} />
        <Row label="Forecast availability" value={meta.nowcast > 0 ? `Yes · +${meta.forecastSpanMin} min` : 'Not provided right now'} />
        <Row label="Last network sync" value={lastFetchAt ? fmtDateTime(Math.floor(lastFetchAt / 1000)) : '—'} />
      </GlassCard>

      <div className="h-3" />
      <SectionTitle>Map context</SectionTitle>
      <GlassCard strong className="px-3.5 py-3 space-y-2">
        <Row label="Your location" value={geo.position ? fmtCoords(geo.position.lat, geo.position.lng) : 'Not available'} />
        <Row
          label="Position source"
          value={
            geo.position?.cached
              ? 'Cached (last known)'
              : geo.status === 'granted'
              ? 'Live geolocation'
              : 'Default (Prague)'
          }
        />
        {geo.position?.accuracy != null && (
          <Row label="GPS accuracy" value={`±${Math.round(geo.position.accuracy)} m`} />
        )}
      </GlassCard>

      <div className="h-3" />
      <SectionTitle>StormScope readiness</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <ReadinessCard
          icon={<Zap size={16} />}
          title="Radar feed"
          ok={radarOk}
          okLabel="Online"
          badLabel={refreshing ? 'Reconnecting…' : 'Unavailable'}
        />
        <ReadinessCard
          icon={<MapPin size={16} />}
          title="Location"
          ok={locOk}
          okLabel="Locked"
          badLabel={geo.status === 'denied' ? 'Permission denied' : 'Not granted'}
        />
        <ReadinessCard
          icon={<Smartphone size={16} />}
          title="PWA install"
          ok={installable}
          okLabel="Ready"
          badLabel="Not available"
        />
        <ReadinessCard
          icon={<ShieldCheck size={16} />}
          title="Offline shell"
          ok={offlineReady}
          okLabel="Ready"
          badLabel="Not yet"
        />
      </div>

      <div className="h-3" />
      <SectionTitle>Frame distribution</SectionTitle>
      <GlassCard strong className="px-3.5 py-3">
        {frames.length > 0 ? (
          <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer>
              <BarChart data={meta.chart}>
                <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                  contentStyle={{
                    background: 'rgba(11,11,17,0.92)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 10,
                    color: '#f8f8ff',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {meta.chart.map((c, i) => (
                    <CellGlow key={i} kind={c.kind} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ color: '#a1a1aa', fontSize: 13 }}>
            No frames to chart yet.
          </div>
        )}
      </GlassCard>

      {error && (
        <>
          <div className="h-3" />
          <SectionTitle accent="#f43f5e">Notes</SectionTitle>
          <GlassCard strong className="px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert size={16} style={{ color: '#f43f5e', marginTop: 2 }} />
              <div>
                <div style={{ color: '#f8f8ff', fontSize: 13, fontWeight: 600 }}>
                  Last fetch failed
                </div>
                <div style={{ color: '#a1a1aa', fontSize: 12 }}>{error}</div>
                {fromCache && (
                  <div className="mt-1" style={{ color: '#fbbf24', fontSize: 11 }}>
                    Cached metadata is being shown.
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </>
      )}

      <div className="h-6" />
    </div>
  )
}

function SectionTitle({ children, accent = '#71717a' }) {
  return (
    <div
      className="text-[10px] uppercase tracking-widest font-bold mb-1.5 mt-1"
      style={{ color: accent }}
    >
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span style={{ color: '#71717a', fontSize: 12 }}>{label}</span>
      <span
        className="text-right"
        style={{ color: '#f8f8ff', fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
      >
        {value || '—'}
      </span>
    </div>
  )
}

function ReadinessCard({ icon, title, ok, okLabel, badLabel }) {
  return (
    <GlassCard className="px-3 py-3">
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: ok ? 'rgba(34,211,238,0.14)' : 'rgba(244,63,94,0.14)',
            border: `1px solid ${ok ? 'rgba(34,211,238,0.4)' : 'rgba(244,63,94,0.4)'}`,
            color: ok ? '#22d3ee' : '#f43f5e',
          }}
        >
          {icon}
        </div>
        <div
          className="text-[10px] uppercase tracking-widest font-bold"
          style={{ color: ok ? '#22d3ee' : '#f43f5e' }}
        >
          {ok ? okLabel : badLabel}
        </div>
      </div>
      <div className="mt-2" style={{ color: '#f8f8ff', fontSize: 13, fontWeight: 700 }}>
        {title}
      </div>
    </GlassCard>
  )
}

function CellGlow({ kind }) {
  const fill = kind === 'nowcast' ? '#fbbf24' : '#8b5cf6'
  return <rect fill={fill} />
}

function deriveMeta(frames, data) {
  const past = frames.filter((f) => f.type === 'past')
  const nowcast = frames.filter((f) => f.type === 'nowcast')
  const oldest = past[0]
  const latest = past[past.length - 1]
  const cadenceMin =
    past.length >= 2 ? Math.round((past[past.length - 1].time - past[0].time) / 60 / (past.length - 1)) : null

  const forecastSpanMin =
    nowcast.length >= 1 ? Math.max(...nowcast.map((f) => Math.round((f.time - (data?.generatedAt || 0)) / 60))) : 0

  const chart = frames.map((f) => ({
    label: new Date(f.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: 1,
    kind: f.type,
  }))

  return {
    total: frames.length,
    past: past.length,
    nowcast: nowcast.length,
    oldestStr: oldest ? fmtDateTime(oldest.time) : '—',
    latestStr: latest ? `${fmtClock(latest.time)} · ${minutesBetween(latest.time, Date.now() / 1000)} min ago` : '—',
    cadenceStr: cadenceMin ? `≈ every ${cadenceMin} min` : '—',
    forecastSpanMin,
    chart,
  }
}
