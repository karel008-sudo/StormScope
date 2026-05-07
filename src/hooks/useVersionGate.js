import { useCallback, useEffect, useState } from 'react'
import { APP_VERSION, compareVersions } from '../version.js'

const STORAGE_KEY = 'stormscope:lastSeenVersion'

function readLastSeen() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

function writeLastSeen(v) {
  try { window.localStorage.setItem(STORAGE_KEY, v) } catch {}
}

/**
 * useVersionGate
 *
 * On mount, reads the last-seen version from localStorage. If the running
 * APP_VERSION is newer (or no version was ever seen), exposes
 * `shouldShowWhatsNew = true` so a What's-new sheet can mount.
 *
 * dismiss() writes APP_VERSION into localStorage so the gate stays closed
 * until the next bump.
 *
 * showAgain() is for the Settings link "Show release notes" that lets the
 * user re-open the sheet without bumping the gate.
 */
export function useVersionGate() {
  const [lastSeen, setLastSeen] = useState(() => readLastSeen())
  const [forceShow, setForceShow] = useState(false)

  // Decide once on mount whether the gate should fire automatically.
  const naturallyShow = lastSeen == null || compareVersions(APP_VERSION, lastSeen) > 0
  const shouldShowWhatsNew = naturallyShow || forceShow

  useEffect(() => {
    // Defensive: if storage was empty AND there are no notes (shouldn't
    // happen), still mark current as seen so we never spam.
    if (lastSeen == null && !shouldShowWhatsNew) {
      writeLastSeen(APP_VERSION)
      setLastSeen(APP_VERSION)
    }
  }, [lastSeen, shouldShowWhatsNew])

  const dismiss = useCallback(() => {
    writeLastSeen(APP_VERSION)
    setLastSeen(APP_VERSION)
    setForceShow(false)
  }, [])

  const showAgain = useCallback(() => {
    setForceShow(true)
  }, [])

  return {
    appVersion: APP_VERSION,
    lastSeen,
    shouldShowWhatsNew,
    dismiss,
    showAgain,
  }
}
