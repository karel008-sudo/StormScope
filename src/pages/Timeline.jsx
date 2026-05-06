import { useMemo } from 'react'
import GlassCard from '../components/GlassCard.jsx'
import { fmtClock, relativePhrase } from '../utils/time.js'
import { Clock4, Zap, Radio } from 'lucide-react'
import { haptic } from '../haptic.js'

export default function Timeline({ frames, player, onJumpToRadar }) {
  const grouped = useMemo(() => groupFrames(frames, player.nowIndex), [frames, player.nowIndex])

  return (
    <div
      className="px-4 fade-in"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <PageHeader
        title="Replay"
        subtitle="Tap any frame to scrub the radar"
      />

      {frames.length === 0 ? (
        <GlassCard strong className="p-5 mt-3">
          <div style={{ color: '#a1a1aa', fontSize: 13 }}>
            No frames yet. The radar feed will appear here once data is available.
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-4 mt-3">
          {grouped.past.length > 0 && (
            <Section
              title="Past"
              icon={<Clock4 size={14} style={{ color: '#a78bfa' }} />}
              accent="#a78bfa"
              count={grouped.past.length}
            >
              {grouped.past.map((f) => (
                <FrameRow
                  key={f.id}
                  frame={f}
                  active={f.id === player.selected?.id}
                  isNow={f.absoluteIndex === player.nowIndex}
                  onClick={() => {
                    haptic.selection()
                    player.setIndex(f.absoluteIndex)
                    onJumpToRadar && onJumpToRadar()
                  }}
                />
              ))}
            </Section>
          )}

          {grouped.nowcast.length > 0 ? (
            <Section
              title="Forecast"
              icon={<Zap size={14} style={{ color: '#fbbf24' }} />}
              accent="#fbbf24"
              count={grouped.nowcast.length}
            >
              {grouped.nowcast.map((f) => (
                <FrameRow
                  key={f.id}
                  frame={f}
                  active={f.id === player.selected?.id}
                  isNow={false}
                  onClick={() => {
                    haptic.selection()
                    player.setIndex(f.absoluteIndex)
                    onJumpToRadar && onJumpToRadar()
                  }}
                />
              ))}
            </Section>
          ) : (
            <Section
              title="Forecast"
              icon={<Zap size={14} style={{ color: '#52525b' }} />}
              accent="#52525b"
              count={0}
            >
              <GlassCard className="p-3.5">
                <div style={{ color: '#a1a1aa', fontSize: 12.5 }}>
                  Forecast frames currently unavailable from this provider.
                </div>
              </GlassCard>
            </Section>
          )}
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2">
        <Radio size={16} style={{ color: '#22d3ee' }} />
        <h1 style={{ color: '#f8f8ff', fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>
          {title}
        </h1>
      </div>
      <p className="mt-0.5" style={{ color: '#71717a', fontSize: 12.5 }}>{subtitle}</p>
    </div>
  )
}

function Section({ title, icon, accent, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span
          className="text-[11px] uppercase tracking-widest font-bold"
          style={{ color: accent }}
        >
          {title}
        </span>
        <span className="text-[10px]" style={{ color: '#52525b' }}>· {count}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function FrameRow({ frame, active, isNow, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl px-3 py-2.5 transition-all active:scale-[0.99]"
      style={{
        background: active ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
        border: active
          ? '1px solid rgba(139,92,246,0.55)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: active ? '0 8px 24px rgba(139,92,246,0.25)' : 'none',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 8, height: 8, borderRadius: 999,
              background: isNow ? '#22d3ee' : (frame.type === 'nowcast' ? '#fbbf24' : '#a78bfa'),
              boxShadow: isNow
                ? '0 0 10px rgba(34,211,238,0.85)'
                : (frame.type === 'nowcast'
                  ? '0 0 8px rgba(251,191,36,0.7)'
                  : '0 0 6px rgba(167,139,250,0.5)'),
            }}
          />
          <div>
            <div className="font-mono" style={{ color: '#f8f8ff', fontSize: 14, fontWeight: 600 }}>
              {fmtClock(frame.time)}
            </div>
            <div style={{ color: '#71717a', fontSize: 11 }}>
              {isNow ? 'Latest sweep · now' : relativePhrase(frame.time)}
            </div>
          </div>
        </div>
        <div
          className="text-[10px] uppercase tracking-widest font-bold"
          style={{ color: active ? '#ddd6fe' : '#52525b' }}
        >
          {isNow ? 'Now' : frame.type === 'nowcast' ? 'Forecast' : 'Past'}
        </div>
      </div>
    </button>
  )
}

function groupFrames(frames, nowIndex) {
  const past = []
  const nowcast = []
  frames.forEach((f, i) => {
    const withIdx = { ...f, absoluteIndex: i }
    if (f.type === 'nowcast') nowcast.push(withIdx)
    else past.push(withIdx)
  })
  return { past, nowcast, nowIndex }
}
