import { describe, it, expect } from 'vitest'
import { fmtClock, fmtClockWithSec, relativePhrase, minutesBetween } from '../src/utils/time.js'
import { fmtCoords, clamp, pluralize } from '../src/utils/format.js'

describe('time formatters', () => {
  it('fmtClock returns em-dash for falsy', () => {
    expect(fmtClock(null)).toBe('—')
    expect(fmtClock(0)).toBe('—')
  })
  it('fmtClock returns HH:MM-ish string for valid timestamps', () => {
    const out = fmtClock(1700000000)
    expect(out).toMatch(/\d{2}:\d{2}/)
  })
  it('fmtClockWithSec includes seconds', () => {
    const out = fmtClockWithSec(1700000000)
    expect(out).toMatch(/\d{2}:\d{2}:\d{2}/)
  })
  it('relativePhrase says "just now" for tiny diffs', () => {
    const now = 1700000000
    expect(relativePhrase(now, now)).toBe('just now')
    expect(relativePhrase(now + 5, now)).toBe('just now')
  })
  it('relativePhrase formats minutes/hours/days correctly (past)', () => {
    const now = 1_700_000_000
    expect(relativePhrase(now - 600, now)).toBe('10 min ago')
    expect(relativePhrase(now - 7200, now)).toBe('2h ago')
    expect(relativePhrase(now - 86400 * 3, now)).toBe('3d ago')
  })
  it('relativePhrase formats future correctly', () => {
    const now = 1_700_000_000
    expect(relativePhrase(now + 600, now)).toBe('in 10 min')
    expect(relativePhrase(now + 7200, now)).toBe('in 2h')
  })
  it('minutesBetween rounds correctly', () => {
    expect(minutesBetween(0, 600)).toBe(10)
    expect(minutesBetween(0, 30)).toBe(1)  // rounds up from 0.5
    expect(minutesBetween(0, 29)).toBe(0)
  })
})

describe('format helpers', () => {
  it('fmtCoords formats lat/lng or em-dash', () => {
    expect(fmtCoords(50.1, 14.4)).toBe('50.100°, 14.400°')
    expect(fmtCoords(null, null)).toBe('—')
    expect(fmtCoords(undefined, 1)).toBe('—')
  })
  it('clamp clamps numbers', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })
  it('pluralize handles 1 vs n', () => {
    expect(pluralize(1, 'frame')).toBe('1 frame')
    expect(pluralize(2, 'frame')).toBe('2 frames')
    expect(pluralize(0, 'mile')).toBe('0 miles')
  })
})
