import { Settings as SettingsIcon, Info, RotateCcw } from 'lucide-react'
import GlassCard from '../components/GlassCard.jsx'
import { haptic } from '../haptic.js'

export default function Settings({ settings, onUpdate, onReset }) {
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
          desc="Recenter when your position changes"
          value={settings.followLocation}
          onChange={(v) => onUpdate({ followLocation: v })}
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
      </GlassCard>

      <div className="h-3" />
      <SectionTitle>Data sources</SectionTitle>
      <GlassCard strong className="px-3.5 py-3 space-y-2">
        <Attribution
          name="RainViewer"
          desc="Global radar tiles. Free for personal & educational use."
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
          <div className="font-bold uppercase tracking-widest text-[9px] mb-0.5" style={{ color: '#a78bfa' }}>
            Coming soon
          </div>
          ČHMÚ / CZRAD provider planned via backend proxy — 5-min cadence, +60 min nowcast, ~7 days of history over Czech Republic.
        </div>
      </GlassCard>

      <div className="h-3" />
      <SectionTitle>About</SectionTitle>
      <GlassCard strong className="px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <Info size={16} style={{ color: '#a78bfa', marginTop: 2 }} />
          <div style={{ color: '#a1a1aa', fontSize: 12.5, lineHeight: 1.5 }}>
            <strong style={{ color: '#f8f8ff' }}>StormScope</strong> is a personal-use storm radar.
            Live rain, storm motion, and sky awareness around your location. No accounts, no servers,
            no data leaves your device.
          </div>
        </div>
      </GlassCard>

      <div className="h-3" />
      <button
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
        }}
      >
        <RotateCcw size={14} />
        Reset all settings
      </button>

      <div className="h-8 text-center" style={{ color: '#3f3f46', fontSize: 10 }}>
        StormScope · v0.1 · Made with care
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="text-[10px] uppercase tracking-widest font-bold mb-1.5 mt-1" style={{ color: '#71717a' }}>
      {children}
    </div>
  )
}

function SliderRow({ label, value, onChange, min, max, step, render }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ color: '#d4d4d8', fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span className="font-mono" style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700 }}>
          {render(value)}
        </span>
      </div>
      <input
        type="range"
        className="opacity"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
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
        onClick={() => {
          haptic.selection()
          onChange(!value)
        }}
        className="rounded-full transition-all shrink-0"
        style={{
          width: 46, height: 28,
          background: value ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.10)',
          padding: 2,
          position: 'relative',
        }}
        aria-pressed={value}
        aria-label={label}
      >
        <span
          className="block rounded-full transition-transform"
          style={{
            width: 22, height: 22,
            background: '#f8f8ff',
            transform: value ? 'translateX(18px)' : 'translateX(0)',
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
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const active = value === o.value
          return (
            <button
              key={o.value}
              onClick={() => {
                haptic.selection()
                onChange(o.value)
              }}
              className="rounded-xl px-2 py-2 text-xs font-bold transition-all"
              style={{
                background: active ? 'rgba(139,92,246,0.20)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.10)'}`,
                color: active ? '#ddd6fe' : '#a1a1aa',
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
    >
      <div style={{ color: '#f8f8ff', fontSize: 12.5, fontWeight: 700 }}>{name}</div>
      <div style={{ color: '#a1a1aa', fontSize: 11.5, marginTop: 1 }}>{desc}</div>
    </a>
  )
}
