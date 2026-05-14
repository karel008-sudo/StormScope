// PNG processing: turn the ČHMÚ raw 680×460 PNG (with label band, legend
// strip, dimming border) into a 598×381 transparent overlay aligned exactly
// to CHMI_DATA_BBOX, so the frontend can drop it onto a Leaflet map without
// any further trimming or geo correction.
//
// Pipeline:
//   1. Sanity-check upstream dimensions (680×460, declared in §24)
//   2. sharp.extract({left:0, top:79, width:598, height:381}) → cut off
//      the legend strip (right) and bottom border row
//   3. Decode to RGBA, set alpha=0 for near-white pixels (no rain)
//   4. Scrub the top label band: pixels in cropped y<36 that look grayscale
//      (R≈G≈B) are the "CZRAD - Z: CAPPI 2.0km - DD.MM.YYYY HH:MM UT" label
//      overlaid on top of the geometric data area. Wipe them, keep radar
//      colours (saturated R/G/B differ by >=30).
//   5. Re-encode as palette+tRNS PNG (stays under ~10 KB)

import sharp from 'sharp'
import { CHMI_WHOLE_IMAGE_BBOX, CHMI_DATA_BBOX, CHMI_DATA_CROP } from './chmi.mjs'

// Pixels where R, G, B all >= this threshold are "no rain" white background.
const WHITE_THRESHOLD = 245

// Top of the cropped image (= original y=79..138) is where the ČHMÚ label
// "CZRAD - Z: CAPPI 2.0km - DD.MM.YYYY HH:MM UT" sits + the small gray
// "clipping triangle" in the top-right corner. Both are drawn on top of
// the declared data area. Anything inside this band that looks grayscale
// (label text + gray triangle, R≈G≈B) is decoration to be wiped.
// Anything that is a real radar colour (saturated blue/green/yellow/red)
// has channel range ≥ 30 and gets preserved.
const LABEL_OVERLAY_ROWS = 60
const GRAYSCALE_TOLERANCE = 30 // |max(R,G,B) - min(R,G,B)| < this == decoration

/**
 * Convert one raw ČHMÚ PNG buffer into a cropped, transparent-background
 * PNG buffer (CHMI_DATA_BBOX-aligned).
 *
 * @param {Buffer} input — raw PNG bytes from ČHMÚ
 * @returns {Promise<Buffer>} processed PNG bytes (CHMI_DATA_BBOX dimensions)
 */
export async function processChmiPng(input) {
  const meta = await sharp(input).metadata()
  if (meta.width !== CHMI_WHOLE_IMAGE_BBOX.pixelW || meta.height !== CHMI_WHOLE_IMAGE_BBOX.pixelH) {
    throw new Error(
      `unexpected ČHMÚ frame dimensions ${meta.width}x${meta.height} ` +
      `(expected ${CHMI_WHOLE_IMAGE_BBOX.pixelW}x${CHMI_WHOLE_IMAGE_BBOX.pixelH})`,
    )
  }

  const { data, info } = await sharp(input)
    .extract({
      left:   CHMI_DATA_CROP.x,
      top:    CHMI_DATA_CROP.y,
      width:  CHMI_DATA_CROP.width,
      height: CHMI_DATA_CROP.height,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  if (w !== CHMI_DATA_BBOX.pixelW || h !== CHMI_DATA_BBOX.pixelH) {
    throw new Error(
      `crop produced ${w}x${h}, expected ${CHMI_DATA_BBOX.pixelW}x${CHMI_DATA_BBOX.pixelH}`,
    )
  }

  // Pass 1: wipe near-white (no-rain) pixels everywhere.
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] >= WHITE_THRESHOLD && data[i + 1] >= WHITE_THRESHOLD && data[i + 2] >= WHITE_THRESHOLD) {
      data[i + 3] = 0
    }
  }

  // Pass 2: scrub label band — anything grayscale-looking is decoration.
  // Saturated radar colours (blue ≥ #0000ff, green ≥ #00ff00, etc.) have a
  // large channel range and are kept.
  const scrubBytes = LABEL_OVERLAY_ROWS * w * 4
  for (let i = 0; i < scrubBytes; i += 4) {
    if (data[i + 3] === 0) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const range = Math.max(r, g, b) - Math.min(r, g, b)
    if (range < GRAYSCALE_TOLERANCE) data[i + 3] = 0
  }

  return await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png({ palette: true, quality: 90, compressionLevel: 9, effort: 8 })
    .toBuffer()
}
