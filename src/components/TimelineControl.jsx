import { Pause, Play, SkipBack, SkipForward, CircleDot } from 'lucide-react'
import GlassCard from './GlassCard.jsx'
import FrameBadge from './FrameBadge.jsx'
import { haptic } from '../haptic.js'

export default function TimelineControl({
  frames,
  index,
  isPlaying,
  nowIndex,
  selected,
  onTogglePlay,
  onScrub,
  onStepBack,
  onStepForward,
  onSnapNow,
}) {
  const total = frames?.length ?? 0
  const disabled = total === 0
  const value = Math.min(Math.max(index, 0), Math.max(0, total - 1))

  return (
    <GlassCard strong className="p-3 slide-up">
      <div className="flex items-center justify-between mb-2.5">
        <FrameBadge frame={selected} nowIndex={nowIndex} index={index} />
        <button
          onClick={onSnapNow}
          disabled={disabled || nowIndex < 0}
          className="inline-flex items-center gap-1.5 rounded-full transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: 'rgba(34,211,238,0.14)',
            border: '1px solid rgba(34,211,238,0.4)',
            color: '#22d3ee',
            padding: '8px 12px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            minHeight: 36,
          }}
          aria-label="Snap to current time (Now)"
        >
          <CircleDot size={12} />
          NOW
        </button>
      </div>

      <input
        type="range"
        className="timeline w-full"
        min={0}
        max={Math.max(0, total - 1)}
        value={value}
        disabled={disabled}
        onChange={(e) => onScrub(parseInt(e.target.value, 10))}
        onInput={(e) => onScrub(parseInt(e.target.value, 10))}
        aria-label="Radar timeline scrubber"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, total - 1)}
        aria-valuenow={value}
        aria-valuetext={selected ? `Frame ${value + 1} of ${total}, ${selected.label}` : ''}
      />

      <div
        className="flex justify-between text-[9px] uppercase tracking-widest mt-1"
        style={{ color: '#52525b' }}
      >
        <span>Past</span>
        <span style={{ color: '#22d3ee' }}>Now</span>
        <span style={{ color: nowIndex < total - 1 ? '#fbbf24' : '#3f3f46' }}>
          {nowIndex < total - 1 ? 'Forecast' : '—'}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <CtrlBtn
          onClick={() => { haptic.light(); onStepBack() }}
          disabled={disabled}
          aria-label="Previous frame"
        >
          <SkipBack size={18} />
        </CtrlBtn>
        <PlayBtn onClick={onTogglePlay} disabled={disabled} isPlaying={isPlaying} />
        <CtrlBtn
          onClick={() => { haptic.light(); onStepForward() }}
          disabled={disabled}
          aria-label="Next frame"
        >
          <SkipForward size={18} />
        </CtrlBtn>
      </div>
    </GlassCard>
  )
}

function CtrlBtn({ children, onClick, disabled, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full flex items-center justify-center active:scale-95 transition-all disabled:opacity-30"
      style={{
        width: 44, height: 44,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: '#d4d4d8',
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

function PlayBtn({ onClick, disabled, isPlaying }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full flex items-center justify-center active:scale-95 transition-all disabled:opacity-40"
      style={{
        width: 60, height: 60,
        background: isPlaying
          ? 'linear-gradient(135deg, #22d3ee, #0891b2)'
          : 'linear-gradient(135deg, #7c3aed, #9333ea)',
        boxShadow: isPlaying
          ? '0 10px 30px rgba(34,211,238,0.45)'
          : '0 10px 30px rgba(139,92,246,0.50)',
        color: '#0b0b11',
      }}
      aria-label={isPlaying ? 'Pause playback' : 'Play radar animation'}
      aria-pressed={isPlaying}
    >
      {isPlaying
        ? <Pause size={24} fill="#0b0b11" />
        : <Play size={24} fill="#0b0b11" style={{ marginLeft: 2 }} />}
    </button>
  )
}
