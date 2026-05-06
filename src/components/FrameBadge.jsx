import { fmtClock, relativePhrase } from '../utils/time.js'

/**
 * FrameBadge shows the selected frame's timestamp and a Past/Now/Forecast tag.
 */
export default function FrameBadge({ frame, nowIndex, index }) {
  if (!frame) {
    return (
      <div className="text-xs uppercase tracking-widest" style={{ color: '#52525b' }}>
        No data
      </div>
    )
  }

  let kind = 'Past'
  let kindColor = '#a78bfa'
  if (frame.type === 'nowcast') {
    kind = 'Forecast'
    kindColor = '#fbbf24'
  } else if (index === nowIndex) {
    kind = 'Now'
    kindColor = '#22d3ee'
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold"
        style={{
          color: kindColor,
          background: `${kindColor}1f`,
          border: `1px solid ${kindColor}40`,
        }}
      >
        {kind}
      </span>
      <span className="font-mono" style={{ color: '#f8f8ff', fontSize: 13, fontWeight: 600 }}>
        {fmtClock(frame.time)}
      </span>
      <span style={{ color: '#71717a', fontSize: 11 }}>· {relativePhrase(frame.time)}</span>
    </div>
  )
}
