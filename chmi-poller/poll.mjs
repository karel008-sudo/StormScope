#!/usr/bin/env node
// chmi-poller/poll.mjs — runs in GitHub Actions on a 10-minute cron.
//
// What it does:
//   1. List the latest 144 past radar PNGs from ČHMÚ pseudoCAPPI2km
//   2. List the latest forecast TAR from fct_pseudoCAPPI2km
//   3. Compare against the existing frames in `chmi-data` branch (passed in
//      via --existing-dir); skip downloads for already-known sourceNames
//   4. Download new PNGs, run them through processChmiPng() (cropped +
//      transparent-background overlay aligned to CHMI_DATA_BBOX)
//   5. Write the deduped set into <out>/frames/<sha8>.png + <out>/index.json
//
// CLI:
//   --out <dir>          where to write the chmi-data tree (required)
//   --existing-dir <dir> existing chmi-data tree to dedup against (optional)
//   --pages-base <url>   used only to build the public absolute URL written
//                        into index.json (default: jsDelivr URL)
//   --max-past <n>       cap on past frames (default 144 = 12 h at 5 min)
//   --no-write           dry-run; print plan, don't write files
//   --quiet              less console output

import { mkdir, writeFile, readFile, copyFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import {
  CHMI_DATA_BBOX,
  listPastFrames,
  findLatestForecastTar,
  fetchPastPng,
  fetchForecastFrames,
} from './chmi.mjs'
import { processChmiPng } from './png.mjs'

const args = parseArgs(process.argv.slice(2))
const OUT = args.out
const EXISTING_DIR = args['existing-dir'] || null
const PAGES_BASE = args['pages-base'] || 'https://cdn.jsdelivr.net/gh/karel008-sudo/StormScope@chmi-data/'
const MAX_PAST = parseInt(args['max-past'] || '144', 10)
const DRY = args['no-write'] === true
const QUIET = args.quiet === true

if (!OUT) {
  console.error('USAGE: poll.mjs --out <dir> [--existing-dir <dir>] [--no-write] [--quiet]')
  process.exit(2)
}

function log(...a) { if (!QUIET) console.log(...a) }
function err(...a) { console.error(...a) }

async function main() {
  const startedAt = Date.now()
  log(`▶ chmi-poller start · max-past=${MAX_PAST} dry=${DRY}`)

  // 1. Discover what's available upstream.
  const pastList = await listPastFrames({ limit: MAX_PAST })
  log(`  past listing: ${pastList.length} frames (${dt(pastList[0]?.time)} → ${dt(pastList[pastList.length - 1]?.time)})`)

  const fctTar = await findLatestForecastTar()
  log(`  forecast TAR: ${fctTar ? fctTar.name + ' (' + dt(fctTar.time) + ')' : 'none'}`)

  // 2. Index existing chmi-data so we can skip work.
  const existing = EXISTING_DIR ? await loadExistingIndex(EXISTING_DIR) : { byName: new Map(), files: new Set() }
  log(`  existing: ${existing.byName.size} known frames in chmi-data`)

  // 3. Plan downloads
  const pastNeedFetch = pastList.filter((f) => !existing.byName.has(f.name))
  log(`  past to fetch: ${pastNeedFetch.length}/${pastList.length}`)

  // 4. Process past
  const pastFrames = []
  for (const f of pastList) {
    const known = existing.byName.get(f.name)
    if (known) {
      pastFrames.push({
        sourceName: f.name,
        sha: known.sha,
        time: known.time,
        type: 'past',
        sizeBytes: known.sizeBytes || 0,
        // no `png` field → poll will copy from existing-dir below
      })
      continue
    }
    try {
      const raw = await fetchPastPng(f.name)
      const processed = await processChmiPng(raw)
      const sha = sha8(processed)
      pastFrames.push({
        sourceName: f.name,
        sha,
        time: f.time,
        type: 'past',
        sizeBytes: processed.length,
        png: processed,
      })
      log(`    + past ${f.name} → ${sha} (${processed.length}B)`)
    } catch (e) {
      err(`    ! past ${f.name}: ${e.message}`)
    }
  }

  // 5. Process forecast — always re-process (TAR is small, content changes
  //    every cycle, dedup by name-only would miss intensity updates).
  const forecastFrames = []
  if (fctTar) {
    try {
      const items = await fetchForecastFrames(fctTar.name)
      log(`    forecast: ${items.length} frames in TAR`)
      for (const it of items) {
        try {
          const processed = await processChmiPng(it.png)
          const sha = sha8(processed)
          forecastFrames.push({
            sourceName: it.name,
            sha,
            time: it.time,
            leadMin: it.leadMin,
            type: 'nowcast',
            sizeBytes: processed.length,
            png: processed,
          })
          log(`    + fct ${it.name} (+${it.leadMin}m) → ${sha}`)
        } catch (e) {
          err(`    ! fct ${it.name}: ${e.message}`)
        }
      }
    } catch (e) {
      err(`    ! forecast TAR fetch failed: ${e.message}`)
    }
  }

  // 6. Build index.json (sourceName included so dedup works on next run)
  const allFrames = [...pastFrames, ...forecastFrames]
  const indexFrames = allFrames.map((f) => ({
    sourceName: f.sourceName,
    type: f.type,
    time: f.time,
    leadMin: f.leadMin || 0,
    sha: f.sha,
    sizeBytes: f.sizeBytes,
    url: `${PAGES_BASE}frames/${f.sha}.png`,
  }))
  const index = {
    schema: 2,
    generatedAt: Math.floor(Date.now() / 1000),
    bbox: [CHMI_DATA_BBOX.west, CHMI_DATA_BBOX.south, CHMI_DATA_BBOX.east, CHMI_DATA_BBOX.north],
    pixel: { width: CHMI_DATA_BBOX.pixelW, height: CHMI_DATA_BBOX.pixelH },
    pastCount: pastFrames.length,
    nowcastCount: forecastFrames.length,
    frames: indexFrames,
    source: {
      pseudocappi: 'https://opendata.chmi.cz/meteorology/weather/radar/composite/pseudocappi2km/',
      forecast:    'https://opendata.chmi.cz/meteorology/weather/radar/composite/fct_pseudocappi2km/',
      attribution: '© ČHMÚ',
      license:     'Czech Hydrometeorological Institute open data (https://opendata.chmi.cz/)',
    },
    poller: {
      version: '1.0.0',
      startedAt: Math.floor(startedAt / 1000),
      durationSeconds: Math.round((Date.now() - startedAt) / 1000),
    },
  }

  if (DRY) {
    log(`▶ DRY RUN — would write ${allFrames.length} frames to ${OUT}/`)
    log(JSON.stringify({ pastCount: pastFrames.length, nowcastCount: forecastFrames.length, bbox: index.bbox, pixel: index.pixel }, null, 2))
    return
  }

  // 7. Write to disk: frames/<sha>.png + index.json + STATUS.txt
  await mkdir(join(OUT, 'frames'), { recursive: true })

  let written = 0, copied = 0, missing = 0
  for (const f of allFrames) {
    const path = join(OUT, 'frames', `${f.sha}.png`)
    if (f.png) {
      await writeFile(path, f.png)
      written++
    } else if (existing.files.has(`${f.sha}.png`)) {
      await copyFile(join(EXISTING_DIR, 'frames', `${f.sha}.png`), path)
      copied++
    } else {
      missing++
      err(`    ! missing PNG for ${f.sourceName} (sha ${f.sha})`)
    }
  }
  await writeFile(join(OUT, 'index.json'), JSON.stringify(index, null, 2))
  await writeFile(
    join(OUT, 'STATUS.txt'),
    [
      `StormScope ČHMÚ poller`,
      `runAt:        ${new Date().toISOString()}`,
      `pastCount:    ${pastFrames.length}`,
      `nowcastCount: ${forecastFrames.length}`,
      `oldestPast:   ${pastFrames[0] ? new Date(pastFrames[0].time * 1000).toISOString() : '—'}`,
      `latestPast:   ${pastFrames[pastFrames.length - 1] ? new Date(pastFrames[pastFrames.length - 1].time * 1000).toISOString() : '—'}`,
      `framesWritten: ${written}`,
      `framesCopied:  ${copied}`,
      `framesMissing: ${missing}`,
      `bbox:         ${JSON.stringify(index.bbox)}`,
      `pixel:        ${JSON.stringify(index.pixel)}`,
      `source:       https://opendata.chmi.cz/`,
    ].join('\n') + '\n',
  )
  log(`▶ wrote ${allFrames.length} frames (${written} new, ${copied} reused, ${missing} missing) + index.json + STATUS.txt to ${OUT}/`)
}

function sha8(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 12)
}

function dt(ts) {
  return ts ? new Date(ts * 1000).toISOString() : '—'
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      const next = argv[i + 1]
      if (next == null || next.startsWith('--')) { out[k] = true }
      else { out[k] = next; i++ }
    }
  }
  return out
}

/**
 * Read an existing chmi-data tree and return a map of known sourceName → entry
 * (so we can skip re-downloading frames we already processed).
 */
async function loadExistingIndex(dir) {
  const idxPath = join(dir, 'index.json')
  const out = { byName: new Map(), files: new Set() }
  try {
    if (existsSync(idxPath)) {
      const idx = JSON.parse(await readFile(idxPath, 'utf8'))
      for (const f of idx.frames || []) {
        if (f.sourceName) out.byName.set(f.sourceName, f)
      }
    }
    const framesDir = join(dir, 'frames')
    if (existsSync(framesDir)) {
      for (const name of await readdir(framesDir)) {
        out.files.add(name)
      }
    }
  } catch (e) {
    err(`! failed to load existing index from ${dir}: ${e.message}`)
  }
  return out
}

main().catch((e) => {
  err('chmi-poller fatal:', e?.stack || e?.message || e)
  process.exit(1)
})
