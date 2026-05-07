import { Sparkles, Wrench, ArrowRightLeft, MinusCircle, Rocket } from 'lucide-react'
import GlassCard from './GlassCard.jsx'
import { haptic } from '../haptic.js'
import { notesSince, RELEASE_NOTES } from '../version.js'

const KIND_META = {
  new:    { Icon: Sparkles,       color: '#22d3ee', label: 'New' },
  fix:    { Icon: Wrench,         color: '#fbbf24', label: 'Fix' },
  change: { Icon: ArrowRightLeft, color: '#a78bfa', label: 'Changed' },
  remove: { Icon: MinusCircle,    color: '#f87171', label: 'Removed' },
}

/**
 * Modal-style "What's new" sheet. Shows release notes for every version
 * newer than `sinceVersion` (or just the latest, if sinceVersion is null).
 *
 * Design: glass card centered on a darkened backdrop, full-screen on small
 * viewports, with a single "Got it" primary action.
 */
export default function WhatsNewSheet({ sinceVersion, onDismiss, onClose }) {
  // notesSince() returns notes strictly newer than sinceVersion. When the user
  // explicitly opens the sheet from Settings (sinceVersion already === current
  // version), the diff is empty — fall back to showing the latest release so
  // there's always *something* to read.
  let releases = notesSince(sinceVersion)
  if (!releases.length) releases = RELEASE_NOTES.slice(0, 1)
  if (!releases.length) return null

  const handleDismiss = () => {
    haptic.success()
    onDismiss && onDismiss()
  }

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-end sm:items-center justify-center fade-in"
      style={{
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: '24px 16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="What's new"
      onClick={onClose}
    >
      <GlassCard
        strong
        className="slide-up w-full overflow-y-auto"
        style={{
          maxWidth: 460,
          maxHeight: '78vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 pt-4 pb-3 sticky top-0"
          style={{
            background: 'linear-gradient(180deg, rgba(11,11,17,0.95) 0%, rgba(11,11,17,0.85) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(139,92,246,0.20)',
                border: '1px solid rgba(139,92,246,0.45)',
              }}
              aria-hidden="true"
            >
              <Rocket size={18} style={{ color: '#a78bfa' }} />
            </div>
            <div className="min-w-0">
              <div style={{ color: '#f8f8ff', fontSize: 16, fontWeight: 800, letterSpacing: -0.2 }}>
                What&apos;s new
              </div>
              <div style={{ color: '#a1a1aa', fontSize: 11.5 }}>
                {releases.length === 1
                  ? `Version ${releases[0].version}`
                  : `${releases.length} updates since you last opened the app`}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 space-y-4">
          {releases.map((r) => (
            <ReleaseSection key={r.version} release={r} />
          ))}
        </div>

        <div
          className="px-4 py-3 sticky bottom-0"
          style={{
            background: 'linear-gradient(0deg, rgba(11,11,17,0.95) 0%, rgba(11,11,17,0.85) 100%)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
          }}
        >
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full rounded-2xl py-3 inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.2,
              boxShadow: '0 12px 32px rgba(139,92,246,0.4)',
              minHeight: 48,
            }}
            data-testid="whatsnew-dismiss"
            aria-label="Dismiss what's new"
          >
            Got it
          </button>
        </div>
      </GlassCard>
    </div>
  )
}

function ReleaseSection({ release }) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span
          style={{
            color: '#ddd6fe',
            fontSize: 13,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          v{release.version}
        </span>
        {release.date && (
          <span style={{ color: '#52525b', fontSize: 10.5 }}>· {release.date}</span>
        )}
        {release.title && (
          <span style={{ color: '#a1a1aa', fontSize: 11.5 }}>· {release.title}</span>
        )}
      </div>
      <ul className="space-y-1.5">
        {release.items.map((raw, idx) => {
          const item = typeof raw === 'string' ? { label: raw, kind: 'new' } : raw
          const meta = KIND_META[item.kind] || KIND_META.new
          const Icon = meta.Icon
          return (
            <li
              key={idx}
              className="rounded-xl px-3 py-2 flex items-start gap-2.5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${meta.color}22`,
              }}
            >
              <span
                className="rounded-md flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  width: 22, height: 22,
                  background: `${meta.color}1f`,
                  border: `1px solid ${meta.color}55`,
                }}
                aria-hidden="true"
              >
                <Icon size={12} style={{ color: meta.color }} />
              </span>
              <div className="min-w-0">
                <span
                  className="rounded-full text-[9px] font-bold uppercase tracking-widest mr-1.5"
                  style={{
                    color: meta.color,
                    background: `${meta.color}1a`,
                    padding: '1px 6px',
                  }}
                >
                  {meta.label}
                </span>
                <span style={{ color: '#f8f8ff', fontSize: 12.5, lineHeight: 1.45 }}>
                  {item.label}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
