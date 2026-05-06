import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PLAYBACK_INTERVALS_MS, DEFAULT_PLAYBACK_INTERVAL_MS } from '../constants.js'
import { haptic } from '../haptic.js'

/**
 * Timeline player for a list of normalized frames.
 *
 * Returns:
 *   index           — currently selected frame index
 *   selected        — the frame at `index`, or null
 *   nowIndex        — index of the latest "past" frame (Now anchor)
 *   isPlaying       — bool
 *   play(), pause(), toggle()
 *   stepForward(), stepBack()
 *   snapToNow()
 *   setIndex(i)
 */
export function useTimelinePlayer(frames, { speed = 'normal' } = {}) {
  const [index, setIndexState] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const lastTickedTypeRef = useRef(null)

  const interval = PLAYBACK_INTERVALS_MS[speed] || DEFAULT_PLAYBACK_INTERVAL_MS

  const nowIndex = useMemo(() => {
    if (!Array.isArray(frames) || frames.length === 0) return -1
    // last frame of type 'past'
    let i = -1
    for (let k = 0; k < frames.length; k++) {
      if (frames[k].type === 'past') i = k
    }
    return i
  }, [frames])

  // When the frame list changes, snap to the latest "now" index unless we're
  // mid-playback. Avoid jumping to index 0 on every refresh.
  const prevSigRef = useRef(null)
  useEffect(() => {
    const sig = frames.map((f) => f.id).join('|')
    if (sig === prevSigRef.current) return
    prevSigRef.current = sig
    if (frames.length === 0) {
      setIndexState(0)
    } else if (nowIndex >= 0) {
      setIndexState((prev) => (isPlaying ? Math.min(prev, frames.length - 1) : nowIndex))
    } else {
      setIndexState(0)
    }
  }, [frames, nowIndex, isPlaying])

  const setIndex = useCallback((i) => {
    if (!frames || frames.length === 0) return
    const clamped = Math.max(0, Math.min(frames.length - 1, i | 0))
    setIndexState(clamped)
  }, [frames])

  const stepForward = useCallback(() => {
    if (!frames || frames.length === 0) return
    setIndexState((i) => (i + 1) % frames.length)
  }, [frames])

  const stepBack = useCallback(() => {
    if (!frames || frames.length === 0) return
    setIndexState((i) => (i - 1 + frames.length) % frames.length)
  }, [frames])

  const snapToNow = useCallback(() => {
    if (nowIndex < 0) return
    setIndexState(nowIndex)
    haptic.light()
  }, [nowIndex])

  const play = useCallback(() => {
    if (!frames || frames.length === 0) return
    setIsPlaying(true)
    haptic.selection()
  }, [frames])

  const pause = useCallback(() => {
    setIsPlaying(false)
    haptic.selection()
  }, [])

  const toggle = useCallback(() => {
    if (!frames || frames.length === 0) return
    setIsPlaying((p) => {
      haptic.selection()
      return !p
    })
  }, [frames])

  // Playback engine
  useEffect(() => {
    if (!isPlaying) return
    if (!frames || frames.length === 0) return
    const id = setInterval(() => {
      setIndexState((i) => {
        const next = (i + 1) % frames.length
        const nextFrame = frames[next]
        // Subtle haptic when crossing past→nowcast boundary
        if (nextFrame && nextFrame.type !== lastTickedTypeRef.current) {
          if (nextFrame.type === 'nowcast') haptic.stormPulse()
          lastTickedTypeRef.current = nextFrame.type
        }
        return next
      })
    }, interval)
    return () => clearInterval(id)
  }, [isPlaying, frames, interval])

  const selected = frames && frames.length > 0 ? frames[Math.min(index, frames.length - 1)] : null

  return {
    index,
    selected,
    nowIndex,
    isPlaying,
    play,
    pause,
    toggle,
    stepForward,
    stepBack,
    snapToNow,
    setIndex,
  }
}
