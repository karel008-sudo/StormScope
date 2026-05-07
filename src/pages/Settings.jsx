import { useState } from 'react'
import {
  Settings as SettingsIcon, Info, RotateCcw, Terminal, RefreshCw,
  ShieldCheck, Sparkles, Rocket,
} from 'lucide-react'
import GlassCard from '../components/GlassCard.jsx'
import ColorSchemePicker from '../components/ColorSchemePicker.jsx'
import { haptic } from '../haptic.js'
import { RAINVIEWER_PROVIDER } from '../providers/rainviewerProvider.js'
import { useAdmin } from '../hooks/useAdmin.js'
import { logger } from '../logger.js'
import { forceUpdateApp } from '../utils/forceUpdate.js'
import { APP_VERSION } from '../version.js'

const BUILD_INFO = `Build ${import.meta.env.MODE}`

export default function Settings({
  settings,
  onUpdate,
  onReset,
  onOpenLogs,
  onShowReleaseNotes,
}) {
  const { admin, register: registerVersionTap, tapsRequired } = useAdmin()
  const [tapHint, setTapHint] = useState(null)
  const [updating, setUpdating] = useState(false)

  const handleVersionTap = () => {
    const result = registerVersionTap()
    if (result === 'enabled') {
      haptic.success()
      setTapHint('enabled')
      logger.info('admin', 'Developer mode enabled')
      setTimeout(() => setTapHint(null), 1800)
    } else if (result === 'disabled') {
      haptic.warning()
      setTapHint('disabled')
      logger.info('admin', 'Developer mode disabled')
      setTimeout(() => setTapHint(null), 1800)
    } else {
      haptic.selection()
    }
  }

  const handleForceUpdate = async () => {
    if (updating) return
    setUpdating(true)
    haptic.warning()
    logger.warn('updates', 'Force update requested by user')
    await forceUpdateApp({ logger })
    // page reload happens inside forceUpdateApp
  }

  return (
    <div
      className="px-4 fade-in"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <SettingsIcon size={16} style={{ color: '#a78bfa' }} />
          <h1 style={{ color: '#f8f8ff', fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>
            Settings
          </h1>
        </div>
        <p className="mt-0.5" style={{ color: '#71717a', fontSize: 12.5 }}>
          Tune the radar feel — saved locally on this device
        </p>
      </div>

      <SectionTitle>Display</SectionTitle>
      <GlassCard strong className="px-3.5 py-3 space-y-3.5">
        <SliderRow
          label="Radar opacity"
          value={settings.radarOpacity}
          min={0.2} max={1} step={0.05}
          onChange={(v) => onUpdate({ radarOpacity: v })}
          render={(v) => `${Math.round(v * 100)}%`}
        />
        <SelectRow
          label="Animation speed"
          value={settings.playbackSpeed}
          options={[
            { value: 'slow', label: 'Slow' },
            { value: 'normal', label: 'Normal' },
            { value: 'fast', label: 'Fast' },
          ]}
          onChange={(v) => onUpdate({ playbackSpeed: v })}
        />
        <SelectRow
          label="Default zoom"
          value={String(settings.defaultZoom)}
          options={[
            { value: '5', label: 'Wide' },
            { value: '7', label: 'Country' },
            { value: '9', label: 'Region' },
            { value: '11', label: 'City' },
          ]}
          onChange={(v) => onUpdate({ defaultZoom: parseInt(v, 10) })}
        />
      </GlassCard>

      <div className="h-3" />
      <SectionTitle>Layers</SectionTitle>
      <GlassCard strong className="px-3.5 py-3 space-y-3">
        <ToggleRow
          label="Smooth radar"
          desc="Anti-aliased tiles for cleaner motion"
          value={settings.smoothRadar}
          onChange={(v) => onUpdate({ smoothRadar: v })}
        />
        <ToggleRow
          label="Show snow layer"
          desc="Color snowfall separately when available"
          value={settings.showSnowLayer}
          onChange={(v) => onUpdate({ showSnowLayer: v })}
        />
        <ToggleRow
          label="Map follows location"
          desc="Auto-recenter when your position changes"
          value={settings.followLocation}
          onChange={(v) => onUpdate({ followLocation: v })}
        />
        <ColorSchemePicker
          label="Color scheme"
          desc="RainViewer palette for storm intensity"
          value={settings.preferredColor}
          onChange={(v) => onUpdate({ preferredColor: v })}
        />
      </GlassCard>

      <div className="h-3" />
      <SectionTitle>Feel</SectionTitle>
      <GlassCard strong className="px-3.5 py-3 space-y-3">
        <ToggleRow
          label="Haptics"
          desc="Subtle vibration on key actions"
          value={settings.hapticsEnabled}
          onChange={(v) => onUpdate({ hapticsEnabled: v })}
        />
        <ToggleRow
          label="Reduce motion"
          desc="Disable non-essential animations and transitions"
          value={settings.reduceMotion}
          onChange={(v) => onUpdate({ reduceMotion: v })}
        />
      </GlassCard>

      <div className="h-3" />
      <SectionTitle accent="#22d3ee">Updates</SectionTitle>
      <GlassCard strong className="px-3.5 py-3 space-y-2">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="min-w-0">
            <div style={{ color: '#d4d4d8', fontSize: 13, fontWeight: 600 }}>
              StormScope
            </div>
            <div style={{ color: '#71717a', fontSize: 11.5 }}>
              Installed version
            </div>
          </div>
          <span
            className="font-mono"
            style={{
              color: '#a78bfa',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.4,
              background: 'rgba(139,92,246,0.10)',
              border: '1px solid rgba(139,92,246,0.30)',
              borderRadius: 999,
              padding: '4px 10px',
            }}
            data-testid="installed-version"
          >
            v{APP_VERSION}
          </span>
        </div>

        <button
          type="button"
          onClick={() => { haptic.selection(); onShowReleaseNotes && onShowReleaseNotes() }}
          className="w-full rounded-xl px-3 py-2.5 inline-flex items-center justify-between transition-all active:scale-[0.99]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#f8f8ff',
            fontSize: 13,
            fontWeight: 600,
            minHeight: 44,
          }}
          data-testid="open-release-notes"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles size={14} style={{ color: '#22d3ee' }} />
            What&apos;s new
          </span>
          <span style={{ color: '#71717a', fontSize: 11 }}>release notes</span>
        </button>

        <button
          type="button"
          onClick={handleForceUpdate}
          disabled={updating}
          className="w-full rounded-xl px-3 py-2.5 inline-flex items-center justify-between transition-all active:scale-[0.99] disabled:opacity-60"
          style={{
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.35)',
            color: '#fbbf24',
            fontSize: 13,
            fontWeight: 700,
            minHeight: 44,
          }}
          data-testid="force-update"
          aria-label="Force update — clears caches and reloads"
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw size={14} className={updating ? 'animate-spin' : ''} />
            {updating ? 'Updating…' : 'Force update'}
          </span>
          <span style={{ color: '#a1a1aa', fontSize: 10.5, fontWeight: 500 }}>
            clears caches + SW
          </span>
        </button>

        <div
          className="rounded-xl px-3 py-2 text-[11px]"
          style={{
            background: 'rgba(0,0,0,0.30)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#a1a1aa',
            lineHeight: 1.45,
          }}
        >
          New deploys propagate within ~30 s. If something looks off, try
          <strong style={{ color: '#fbbf24' }}> Force update</strong> — it nukes
          every cache and re-downloads the latest build.
        </div>
      </GlassCard>

      <div className="h-3" />
      <SectionTitle>Data sources</SectionTitle>
      <GlassCard strong className="px-3.5 py-3 space-y-2">
        <Attribution
          name="RainViewer"
          desc={RAINVIEWER_PROVIDER.limitations}
          link="https://www.rainviewer.com/"
        />
        <Attribution
          name="OpenStreetMap"
          desc="Base map data — © OpenStreetMap contributors."
          link="https://www.openstreetmap.org/copyright"
        />
        <Attribution
          name="CARTO"
          desc="Dark Matter tile style — © CARTO."
          link="https://carto.com/attributions"
        />
        <div
          className="rounded-xl px-3 py-2 mt-1"
          style={{
            background: 'rgba(139,92,246,0.10)',
            border: '1px dashed rgba(139,92,246,0.35)',
            color: '#c4b5fd',
            fontSize: 11.5,
            lineHeight: 1.4,
          }}
        >
          <div
            className="font-bold uppercase tracking-widest text-[9px] mb-0.5"
            style={{ color: '#a78bfa' }}
          >
            Coming soon
          </div>
          ČHMÚ / CZRAD provider planned via backend proxy — 5-min cadence,
          +60 min nowcast, ~7 days of history over Czech Republic. Blitzortung
          lightning archive overlay also planned.
        </div>
      </GlassCard>

      <div className="h-3" />
      <SectionTitle>About</SectionTitle>
      <GlassCard strong className="px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <Info size={16} style={{ color: '#a78bfa', marginTop: 2 }} />
          <div style={{ color: '#a1a1aa', fontSize: 12.5, lineHeight: 1.5 }}>
            <strong style={{ color: '#f8f8ff' }}>StormScope</strong> is a personal-use storm
            radar. Live rain, storm motion, and sky awareness around your location. No accounts,
            no servers, no data leaves your device.
          </div>
        </div>
      </GlassCard>

      <div className="h-3" />
      <button
        type="button"
        onClick={() => {
          haptic.warning()
          onReset()
        }}
        className="w-full rounded-2xl py-3 inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
        style={{
          background: 'rgba(244,63,94,0.10)',
          border: '1px solid rgba(244,63,94,0.35)',
          color: '#f87171',
          fontSize: 13,
          fontWeight: 700,
          minHeight: 48,
        }}
        aria-label="Reset all settings to defaults"
      >
        <RotateCcw size={14} />
        Reset all settings
      </button>

      {admin && (
        <>
          <div className="h-3" />
          <SectionTitle accent="#a78bfa">Developer</SectionTitle>
          <GlassCard
            strong
            className="px-3.5 py-3 space-y-2"
            data-testid="developer-section"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck size={14} style={{ color: '#a78bfa' }} />
              <div style={{ color: '#ddd6fe', fontSize: 12, fontWeight: 700, letterSpacing: 0.2 }}>
                Admin mode active
              </div>
            </div>
            <button
              type="button"
              onClick={() => { haptic.selection(); onOpenLogs && onOpenLogs() }}
              className="w-full rounded-xl px-3 py-2.5 inline-flex items-center justify-between transition-all active:scale-[0.99]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#f8f8ff',
                fontSize: 13,
                fontWeight: 600,
                minHeight: 44,
              }}
              data-testid="open-dev-logs"
            >
              <span className="inline-flex items-center gap-2">
                <Terminal size={14} style={{ color: '#22d3ee' }} />
                Dev logs
              </span>
              <span style={{ color: '#71717a', fontSize: 11 }}>captured locally</span>
            </button>
            <div
              className="rounded-xl px-3 py-2 text-[11px]"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#a1a1aa',
                lineHeight: 1.45,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1" style={{ color: '#71717a' }}>
                <Rocket size={11} />
                <span className="uppercase tracking-widest font-bold" style={{ fontSize: 9 }}>
                  Build info
                </span>
              </div>
              <div className="font-mono">version: {APP_VERSION} · {BUILD_INFO}</div>
              <div className="font-mono">user-agent: {typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 40) + '…' : '—'}</div>
              <div className="mt-1" style={{ color: '#52525b' }}>
                Tap version below {tapsRequired}× to disable Developer mode.
              </div>
            </div>
          </GlassCard>
        </>
      )}

      <button
        type="button"
        onClick={handleVersionTap}
        className="block mx-auto mt-8 mb-4"
        style={{
          color: tapHint === 'enabled' ? '#a78bfa' : tapHint === 'disabled' ? '#fbbf24' : '#3f3f46',
          fontSize: 10,
          letterSpacing: 0.6,
          background: 'transparent',
          padding: '6px 12px',
          transition: 'color 0.2s',
        }}
        aria-label={admin ? 'Tap to toggle Developer mode' : 'Tap 7 times to enable Developer mode'}
      >
        StormScope · v{APP_VERSION}
        {tapHint === 'enabled' && ' · developer mode on'}
        {tapHint === 'disabled' && ' · developer mode off'}
      </button>
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

function SliderRow({ label, value, onChange, min, max, step, render }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ color: '#d4d4d8', fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span
          className="font-mono"
          style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700 }}
          aria-live="polite"
        >
          {render(value)}
        </span>
      </div>
      <input
        type="range"
        className="opacity"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onInput={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
      />
    </div>
  )
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div style={{ color: '#d4d4d8', fontSize: 13, fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ color: '#71717a', fontSize: 11.5, marginTop: 1 }}>{desc}</div>}
      </div>
      <button
        type="button"
        onClick={() => {
          haptic.selection()
          onChange(!value)
        }}
        className="rounded-full transition-all shrink-0"
        style={{
          width: 50, height: 30,
          background: value ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.10)',
          padding: 2,
          position: 'relative',
        }}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span
          className="block rounded-full transition-transform"
          style={{
            width: 24, height: 24,
            background: '#f8f8ff',
            transform: value ? 'translateX(20px)' : 'translateX(0)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}
        />
      </button>
    </div>
  )
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div>
      <div className="mb-1.5" style={{ color: '#d4d4d8', fontSize: 13, fontWeight: 600 }}>
        {label}
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((o) => {
          const active = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                haptic.selection()
                onChange(o.value)
              }}
              className="rounded-xl px-2 text-xs font-bold transition-all"
              style={{
                background: active ? 'rgba(139,92,246,0.20)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.10)'}`,
                color: active ? '#ddd6fe' : '#a1a1aa',
                minHeight: 40,
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Attribution({ name, desc, link }) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl px-3 py-2 transition-colors"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
      aria-label={`${name} — open in new tab`}
    >
      <div style={{ color: '#f8f8ff', fontSize: 12.5, fontWeight: 700 }}>{name}</div>
      <div style={{ color: '#a1a1aa', fontSize: 11.5, marginTop: 1, lineHeight: 1.4 }}>{desc}</div>
    </a>
  )
}
