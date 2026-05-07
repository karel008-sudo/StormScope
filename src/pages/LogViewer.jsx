import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Trash2, Download, AlertCircle, Info, Bug, AlertTriangle } from 'lucide-react'
import { db } from '../db.js'
import GlassCard from '../components/GlassCard.jsx'
import { haptic } from '../haptic.js'

const LEVELS = [
  { value: 'all',   label: 'All',   color: '#a1a1aa' },
  { value: 'error', label: 'Errors',color: '#f43f5e', Icon: AlertCircle },
  { value: 'warn',  label: 'Warns', color: '#fbbf24', Icon: AlertTriangle },
  { value: 'info',  label: 'Info',  color: '#22d3ee', Icon: Info },
  { value: 'debug', label: 'Debug', color: '#8b5cf6', Icon: Bug },
]

export default function LogViewer({ onBack }) {
  const [filter, setFilter] = useState('all')
  const logs = useLiveQuery(
    () => db.logs.orderBy('timestamp').reverse().limit(300).toArray(),
    [],
    [],
  )

  const filtered = useMemo(
    () => (filter === 'all' ? logs : logs.filter((l) => l.level === filter)),
    [logs, filter],
  )

  const counts = useMemo(() => {
    const out = { all: logs.length, error: 0, warn: 0, info: 0, debug: 0 }
    for (const l of logs) if (out[l.level] != null) out[l.level]++
    return out
  }, [logs])

  const clearAll = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Clear all logs?')) return
    haptic.warning()
    try { await db.logs.clear() } catch {}
  }

  const exportJson = () => {
    haptic.selection()
    try {
      const data = JSON.stringify(logs, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stormscope-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {}
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#0b0b11',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: 'rgba(11,11,17,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between px-3 py-2.5">
          <button
            type="button"
            onClick={() => { haptic.light(); onBack() }}
            className="rounded-full inline-flex items-center justify-center"
            style={{
              width: 40, height: 40,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#d4d4d8',
            }}
            aria-label="Back to settings"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <div style={{ color: '#f8f8ff', fontSize: 15, fontWeight: 800, letterSpacing: -0.2 }}>
              Dev Logs
            </div>
            <div style={{ color: '#71717a', fontSize: 10 }}>
              {counts.all} entries · max 500
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportJson}
              className="rounded-full inline-flex items-center justify-center"
              style={{
                width: 40, height: 40,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#d4d4d8',
              }}
              aria-label="Export logs as JSON"
              disabled={!logs.length}
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full inline-flex items-center justify-center"
              style={{
                width: 40, height: 40,
                background: 'rgba(244,63,94,0.10)',
                border: '1px solid rgba(244,63,94,0.35)',
                color: '#f87171',
              }}
              aria-label="Clear all logs"
              disabled={!logs.length}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div
          className="px-3 pb-2 overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label="Filter logs by level"
        >
          <div className="flex gap-1.5">
            {LEVELS.map((l) => {
              const active = filter === l.value
              const count = counts[l.value]
              return (
                <button
                  key={l.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => { haptic.selection(); setFilter(l.value) }}
                  className="rounded-full inline-flex items-center gap-1.5 transition-all shrink-0"
                  style={{
                    padding: '6px 11px',
                    background: active ? `${l.color}22` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? `${l.color}66` : 'rgba(255,255,255,0.10)'}`,
                    color: active ? l.color : '#a1a1aa',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.2,
                    minHeight: 32,
                  }}
                >
                  {l.Icon && <l.Icon size={11} />}
                  {l.label}
                  <span
                    className="rounded-full px-1.5"
                    style={{
                      background: active ? `${l.color}33` : 'rgba(255,255,255,0.08)',
                      color: active ? l.color : '#71717a',
                      fontSize: 10, fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* List */}
      <div className="px-3 py-3 space-y-1.5">
        {filtered.length === 0 ? (
          <GlassCard strong className="px-4 py-6 text-center">
            <div style={{ color: '#a1a1aa', fontSize: 13 }}>
              {logs.length === 0
                ? 'No log entries yet — anything app does will land here.'
                : 'No entries match this filter.'}
            </div>
          </GlassCard>
        ) : (
          filtered.map((entry) => <LogRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}

function LogRow({ entry }) {
  const [open, setOpen] = useState(false)
  const meta = LEVELS.find((l) => l.value === entry.level) || LEVELS[3]
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  return (
    <button
      type="button"
      onClick={() => entry.data && setOpen((o) => !o)}
      className="w-full text-left rounded-xl px-3 py-2 transition-colors active:scale-[0.99]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${meta.color}33`,
        cursor: entry.data ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-start gap-2">
        <span
          className="rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0"
          style={{
            background: `${meta.color}1f`,
            color: meta.color,
            padding: '2px 7px',
            border: `1px solid ${meta.color}55`,
          }}
        >
          {entry.level}
        </span>
        <span
          className="font-mono shrink-0"
          style={{ color: '#71717a', fontSize: 11 }}
        >
          {time}
        </span>
        <span
          className="shrink-0 rounded px-1"
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#a1a1aa',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {entry.category}
        </span>
      </div>
      <div
        className="mt-1"
        style={{
          color: '#f8f8ff',
          fontSize: 12.5,
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}
      >
        {entry.message}
      </div>
      {entry.data && open && (
        <pre
          className="mt-1.5 rounded-md px-2 py-1.5 overflow-x-auto"
          style={{
            background: 'rgba(0,0,0,0.45)',
            color: '#a1a1aa',
            fontSize: 10.5,
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {entry.data}
        </pre>
      )}
    </button>
  )
}
