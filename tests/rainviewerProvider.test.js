import { describe, it, expect } from 'vitest'
import {
  normalize,
  buildTileUrl,
  isStale,
  RAINVIEWER_COLOR_SCHEMES,
} from '../src/providers/rainviewerProvider.js'

describe('normalize()', () => {
  it('normalizes a typical past+nowcast payload', () => {
    const raw = {
      version: '2.0',
      generated: 1700000000,
      host: 'https://tilecache.rainviewer.com',
      radar: {
        past: [
          { time: 1699999000, path: '/v2/radar/aaa' },
          { time: 1699999600, path: '/v2/radar/bbb' },
        ],
        nowcast: [
          { time: 1700000600, path: '/v2/radar/ccc' },
        ],
      },
    }
    const m = normalize(raw)
    expect(m.host).toBe('https://tilecache.rainviewer.com')
    expect(m.generatedAt).toBe(1700000000)
    expect(m.pastCount).toBe(2)
    expect(m.nowcastCount).toBe(1)
    expect(m.hasNowcast).toBe(true)
    expect(m.frames).toHaveLength(3)
    expect(m.frames[1].isNowCandidate).toBe(true) // last past
    expect(m.frames[2].type).toBe('nowcast')
    expect(m.frames[2].label).toBe('+10 min')
  })

  it('handles missing nowcast gracefully', () => {
    const raw = {
      generated: 1700000000,
      host: 'https://tilecache.rainviewer.com',
      radar: { past: [{ time: 1699999000, path: '/v2/radar/aaa' }] },
    }
    const m = normalize(raw)
    expect(m.nowcastCount).toBe(0)
    expect(m.hasNowcast).toBe(false)
    expect(m.frames).toHaveLength(1)
  })

  it('survives a completely empty body', () => {
    const m = normalize({})
    expect(m.frames).toHaveLength(0)
    expect(m.pastCount).toBe(0)
    expect(m.nowcastCount).toBe(0)
    expect(m.hasNowcast).toBe(false)
    expect(m.host).toBe('https://tilecache.rainviewer.com')
    expect(typeof m.generatedAt).toBe('number')
  })

  it('survives null / undefined / wrong types', () => {
    expect(() => normalize(null)).not.toThrow()
    expect(() => normalize(undefined)).not.toThrow()
    expect(() => normalize('weather')).not.toThrow()
    expect(() => normalize({ radar: 'broken' })).not.toThrow()
    expect(() => normalize({ radar: { past: 'broken' } })).not.toThrow()
  })

  it('drops frames with invalid time or missing path', () => {
    const raw = {
      generated: 1700000000,
      host: 'https://tilecache.rainviewer.com',
      radar: {
        past: [
          { time: 0, path: '/v2/radar/zero' },              // invalid time
          { time: -10, path: '/v2/radar/neg' },             // invalid time
          { time: 'abc', path: '/v2/radar/nan' },           // NaN
          { time: 1699999000 },                              // missing path
          { time: 1699999000, path: 123 },                   // path wrong type
          { time: 1699999000, path: '/v2/radar/ok' },        // valid
        ],
      },
    }
    const m = normalize(raw)
    expect(m.pastCount).toBe(1)
    expect(m.frames[0].path).toBe('/v2/radar/ok')
  })

  it('deduplicates identical (time, path) pairs', () => {
    const raw = {
      radar: {
        past: [
          { time: 1, path: '/x' },
          { time: 1, path: '/x' },
          { time: 1, path: '/y' },
        ],
      },
    }
    const m = normalize(raw)
    expect(m.pastCount).toBe(2)
  })

  it('sorts frames ascending by time', () => {
    const raw = {
      radar: {
        past: [
          { time: 30, path: '/c' },
          { time: 10, path: '/a' },
          { time: 20, path: '/b' },
        ],
      },
    }
    const m = normalize(raw)
    expect(m.frames.map((f) => f.time)).toEqual([10, 20, 30])
  })

  it('strips trailing slashes from host', () => {
    const m = normalize({ host: 'https://tilecache.rainviewer.com///', radar: {} })
    expect(m.host).toBe('https://tilecache.rainviewer.com')
  })
})

describe('buildTileUrl()', () => {
  const frame = { id: 'f1', path: '/v2/radar/abc' }
  it('builds the canonical RainViewer tile URL', () => {
    const url = buildTileUrl('https://tilecache.rainviewer.com', frame, {
      size: 256, color: 2, smooth: 1, snow: 1,
    })
    expect(url).toBe('https://tilecache.rainviewer.com/v2/radar/abc/256/{z}/{x}/{y}/2/1_1.png')
  })

  it('honors smooth=0 and snow=0', () => {
    const url = buildTileUrl('https://tilecache.rainviewer.com', frame, {
      size: 512, color: 4, smooth: 0, snow: 0,
    })
    expect(url).toBe('https://tilecache.rainviewer.com/v2/radar/abc/512/{z}/{x}/{y}/4/0_0.png')
  })

  it('returns null on missing host or frame', () => {
    expect(buildTileUrl(null, frame)).toBeNull()
    expect(buildTileUrl('https://x', null)).toBeNull()
    expect(buildTileUrl('https://x', { id: 'no-path' })).toBeNull()
  })

  it('falls back to defaults when opts are partial', () => {
    const url = buildTileUrl('https://h', { path: '/p' })
    expect(url).toMatch(/^https:\/\/h\/p\/256\/\{z\}\/\{x\}\/\{y\}\/2\/1_1\.png$/)
  })
})

describe('isStale()', () => {
  it('flags very old metadata', () => {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600
    expect(isStale(oneHourAgo)).toBe(true)
  })
  it('does not flag fresh metadata', () => {
    const justNow = Math.floor(Date.now() / 1000)
    expect(isStale(justNow)).toBe(false)
  })
  it('treats invalid input as stale', () => {
    expect(isStale(NaN)).toBe(true)
    expect(isStale(undefined)).toBe(true)
    expect(isStale(null)).toBe(true)
  })
})

describe('color schemes', () => {
  it('exposes all 9 RainViewer color schemes (0..8)', () => {
    expect(RAINVIEWER_COLOR_SCHEMES).toHaveLength(9)
    expect(RAINVIEWER_COLOR_SCHEMES.map((c) => c.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })
})
