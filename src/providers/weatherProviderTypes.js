// Provider abstraction. RainViewer is the MVP provider; more providers can be
// added later (e.g. CHMI/CZRAD via backend proxy, Blitzortung lightning).
//
// A provider exposes:
//   id              — short id (e.g. "rainviewer")
//   label           — display name (e.g. "RainViewer")
//   capabilities    — { past: bool, nowcast: bool, lightning: bool, satellite: bool }
//   fetchFrames()   — async ⇒ { frames, generatedAt, hasNowcast, attribution }
//   tileUrl(frame, opts) — string tile URL template
//   attribution     — required attribution string
//
// The `Frame` shape is normalized as:
//   { id, provider, type: 'past'|'nowcast', time, path, label, isNowCandidate }

export const PROVIDER_IDS = {
  RAINVIEWER: 'rainviewer',
  CHMI: 'chmi',           // future, via backend proxy
  BLITZORTUNG: 'blitzortung', // future, lightning overlay
}
