/**
 * Cinematic intro shown the first time the React app paints.
 *
 * Composition (timing in ms from mount):
 *   0       — dark gradient background fades in
 *   60      — radar disc + concentric rings appear; sweep starts spinning
 *   180     — lightning bolt in the center fades in
 *   320     — app name "StormScope" slides up
 *   500     — tagline "Live radar around you" slides up
 *
 * Total dwell handled by the parent — this component simply renders the visual.
 * Background is a deep violet-to-black radial so it visually flows into the
 * dark Radar map even with no animation.
 *
 * Designed to feel like a 2-second cockpit power-on, not a noisy logo splash.
 */
export default function Splash() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, #1a0b2e 0%, #0b0b11 70%)',
        zIndex: 2000,
        overflow: 'hidden',
      }}
      aria-label="StormScope is starting"
      role="status"
      aria-live="polite"
    >
      {/* Outer ambient glow */}
      <div
        className="absolute"
        style={{
          width: 360,
          height: 360,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(34,211,238,0.18) 40%, transparent 75%)',
          filter: 'blur(40px)',
          animation: 'splashGlow 2.4s ease-in-out infinite',
        }}
        aria-hidden="true"
      />

      {/* Radar disc */}
      <div
        className="relative"
        style={{
          width: 168,
          height: 168,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at center, rgba(11,11,17,0.92) 0%, rgba(11,11,17,0.4) 60%, transparent 100%)',
          border: '1px solid rgba(139,92,246,0.45)',
          boxShadow: '0 30px 80px rgba(139,92,246,0.35), inset 0 0 30px rgba(139,92,246,0.18)',
          animation: 'splashRise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        }}
      >
        {/* Concentric rings */}
        <Ring size={150} delay={120} />
        <Ring size={108} delay={180} />
        <Ring size={66}  delay={240} />

        {/* Sweep — rotating gradient cone */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: '50%',
            background:
              'conic-gradient(from 270deg, rgba(139,92,246,0.55) 0deg, rgba(139,92,246,0.25) 25deg, transparent 90deg)',
            mask: 'radial-gradient(circle, black 0%, black 50%, transparent 51%)',
            WebkitMask: 'radial-gradient(circle, black 0%, black 50%, transparent 51%)',
            animation: 'splashSweep 2.2s linear infinite',
          }}
          aria-hidden="true"
        />

        {/* Lightning bolt — centerpiece */}
        <svg
          width="56"
          height="56"
          viewBox="0 0 64 64"
          fill="none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0,
            animation: 'splashBoltIn 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) 0.18s forwards',
            filter: 'drop-shadow(0 4px 12px rgba(251,191,36,0.65))',
          }}
          aria-hidden="true"
        >
          <path d="M34 10 L20 38 L29 38 L24 56 L46 26 L36 26 Z" fill="#fbbf24" />
          <path
            d="M34 10 L20 38 L29 38 L24 56 L46 26 L36 26 Z"
            fill="none"
            stroke="rgba(180,100,20,0.85)"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Wordmark */}
      <div
        className="mt-7 text-center"
        style={{
          opacity: 0,
          animation: 'splashTextIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.32s forwards',
        }}
      >
        <div
          style={{
            color: '#f8f8ff',
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: -0.5,
            lineHeight: 1.05,
          }}
        >
          StormScope
        </div>
      </div>

      {/* Tagline */}
      <div
        className="mt-1.5 text-center px-6"
        style={{
          opacity: 0,
          animation: 'splashTextIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s forwards',
        }}
      >
        <div
          style={{
            color: '#a1a1aa',
            fontSize: 12.5,
            fontWeight: 500,
            letterSpacing: 0.3,
          }}
        >
          Live radar around you
        </div>
      </div>

      {/* Bottom progress shimmer */}
      <div
        className="absolute"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 84,
          height: 3,
          borderRadius: 999,
          background:
            'linear-gradient(90deg, transparent, rgba(139,92,246,0.85), rgba(34,211,238,0.85), transparent)',
          backgroundSize: '200% 100%',
          animation: 'splashProgress 1.6s linear infinite',
          opacity: 0.85,
        }}
        aria-hidden="true"
      />

      {/* Local keyframes — declared inline so Splash is self-contained and
          renders correctly even if global CSS hasn't paint-flushed yet. */}
      <style>{`
        @keyframes splashRise {
          from { opacity: 0; transform: translateY(8px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes splashSweep {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes splashBoltIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes splashTextIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashRingIn {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splashGlow {
          0%, 100% { opacity: 0.55; transform: scale(0.92); }
          50%      { opacity: 0.95; transform: scale(1.05); }
        }
        @keyframes splashProgress {
          0%   { background-position:  100% 0; }
          100% { background-position: -100% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="StormScope is starting"] *,
          [aria-label="StormScope is starting"] *::before,
          [aria-label="StormScope is starting"] *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  )
}

function Ring({ size, delay }) {
  return (
    <div
      className="absolute"
      style={{
        top: '50%',
        left: '50%',
        width: size,
        height: size,
        marginTop: -size / 2,
        marginLeft: -size / 2,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.18)',
        opacity: 0,
        animation: `splashRingIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms forwards`,
      }}
      aria-hidden="true"
    />
  )
}
