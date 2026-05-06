import { Satellite } from 'lucide-react'

export default function ProviderBadge({ name = 'RainViewer', live = true }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: '#d4d4d8',
        fontSize: 11,
        letterSpacing: 0.2,
      }}
    >
      <Satellite size={12} style={{ color: live ? '#22d3ee' : '#71717a' }} />
      <span style={{ fontWeight: 600 }}>{name}</span>
      {live && (
        <span
          className="glow-breath"
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: '#22d3ee',
            boxShadow: '0 0 8px rgba(34,211,238,0.8)',
          }}
        />
      )}
    </div>
  )
}
