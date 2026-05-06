import { CloudRain, CircleAlert, RefreshCw } from 'lucide-react'
import GlassCard from './GlassCard.jsx'
import ProviderBadge from './ProviderBadge.jsx'
import { fmtClockWithSec, relativePhrase } from '../utils/time.js'

export default function StatusCard({
  provider = 'RainViewer',
  pastCount = 0,
  nowcastCount = 0,
  generatedAt = null,
  refreshing = false,
  fromCache = false,
  error = null,
}) {
  const noData = pastCount === 0 && nowcastCount === 0

  return (
    <GlassCard strong className="px-3.5 py-3 fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: noData ? 'rgba(244,63,94,0.12)' : 'rgba(139,92,246,0.16)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {noData ? (
              <CircleAlert size={18} style={{ color: '#f43f5e' }} />
            ) : (
              <CloudRain size={18} style={{ color: '#a78bfa' }} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: '#71717a' }}>
              Status
            </div>
            <div className="truncate font-semibold" style={{ color: '#f8f8ff', fontSize: 14 }}>
              {error
                ? 'Feed temporarily unavailable'
                : noData
                ? 'No frames available'
                : 'Radar feed online'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {refreshing && <RefreshCw size={14} className="animate-spin" style={{ color: '#a1a1aa' }} />}
          <ProviderBadge name={provider} live={!error && !noData} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Cell label="Past" value={pastCount} accent="#a78bfa" />
        <Cell label="Forecast" value={nowcastCount} accent="#fbbf24" empty={nowcastCount === 0} />
        <Cell
          label="Latest sweep"
          value={fmtClockWithSec(generatedAt)}
          sub={generatedAt ? relativePhrase(generatedAt) : ''}
          accent="#22d3ee"
          isText
        />
      </div>

      {fromCache && (
        <div
          className="mt-2.5 text-[11px] flex items-center gap-1.5"
          style={{ color: '#fbbf24' }}
        >
          <CircleAlert size={12} />
          Showing cached metadata · offline shell active
        </div>
      )}
      {error && !fromCache && (
        <div
          className="mt-2.5 text-[11px]"
          style={{ color: '#f43f5e' }}
        >
          {error}
        </div>
      )}
    </GlassCard>
  )
}

function Cell({ label, value, sub, accent = '#f8f8ff', empty = false, isText = false }) {
  return (
    <div
      className="rounded-xl px-2.5 py-2"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="text-[9px] uppercase tracking-widest" style={{ color: '#71717a' }}>
        {label}
      </div>
      <div
        className="mt-0.5"
        style={{
          color: empty ? '#52525b' : accent,
          fontSize: isText ? 13 : 18,
          fontWeight: isText ? 600 : 700,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value || '—'}
      </div>
      {sub && (
        <div className="text-[10px] mt-0.5" style={{ color: '#71717a' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
