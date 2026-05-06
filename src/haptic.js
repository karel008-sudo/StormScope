// StormScope haptic utility — narrow Web Vibration API wrapper.
// Each function checks support and respects an optional disabled flag
// passed via setHapticsEnabled().
//
// Patterns are intentionally short — Wingman convention.

let enabled = true

export function setHapticsEnabled(value) {
  enabled = !!value
}

function buzz(pattern) {
  if (!enabled) return
  if (typeof navigator === 'undefined') return
  if (typeof navigator.vibrate !== 'function') return
  try { navigator.vibrate(pattern) } catch {}
}

export const haptic = {
  light:      () => buzz(8),
  medium:     () => buzz(20),
  selection:  () => buzz(6),
  success:    () => buzz([10, 60, 20]),
  warning:    () => buzz([30, 80, 30]),
  error:      () => buzz([40, 60, 40, 60, 40]),
  stormPulse: () => buzz([14, 32, 14]),
}
