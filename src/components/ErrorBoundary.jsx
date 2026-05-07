import { Component } from 'react'
import { ShieldAlert, RotateCw } from 'lucide-react'

/**
 * Catches render errors anywhere below and shows a premium fallback instead
 * of a white screen. Lets the user reload without leaving the PWA shell.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: null }
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || String(err) }
  }

  componentDidCatch(error, info) {
    // Best-effort log — do not block on missing console.
    try { console.error('[StormScope] render error', error, info) } catch {}
  }

  handleReload = () => {
    try { window.location.reload() } catch {}
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        className="flex items-center justify-center px-5"
        style={{
          minHeight: '100dvh',
          background:
            'radial-gradient(ellipse at center, #1a0b2e 0%, #0b0b11 70%)',
          color: '#f8f8ff',
        }}
        role="alert"
      >
        <div
          className="rounded-2xl p-5 fade-in"
          style={{
            maxWidth: 380,
            background: 'rgba(11,11,17,0.85)',
            border: '1px solid rgba(244,63,94,0.35)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(244,63,94,0.16)',
                border: '1px solid rgba(244,63,94,0.4)',
              }}
            >
              <ShieldAlert size={20} style={{ color: '#f43f5e' }} />
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 15, fontWeight: 800 }}>Something went wrong</div>
              <p className="mt-1" style={{ color: '#a1a1aa', fontSize: 12.5, lineHeight: 1.5 }}>
                StormScope hit an unexpected error. Your settings are safe. Try reloading; if the
                problem persists, check your network and try again.
              </p>
              {this.state.message && (
                <pre
                  className="mt-2 rounded-lg px-2 py-1.5 overflow-x-auto"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#fda4af',
                    fontSize: 11,
                    lineHeight: 1.4,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.message}
                </pre>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                boxShadow: '0 8px 20px rgba(139,92,246,0.45)',
                minHeight: 40,
              }}
              aria-label="Reload the app"
            >
              <RotateCw size={14} />
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
