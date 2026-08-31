// ICONSULTA brand assets — regenerates every derived icon from two source PNGs.
//
//   npm run brand-assets
//
// Sources of truth (committed, hand-authored):
//   public/favicon-512x512.png                      the square mark
//   src/assets/images/ICONSULTA-horizontal-logo.png the horizontal lockup
//
// Everything else is derived, so re-running after a re-export is enough. Safe to
// re-run: outputs are overwritten, never appended.
//
// The horizontal lockup ships with a defect — a stray navy bar welded across its
// top edge, above a blank row, separate from the artwork. cropToInk() detects a
// thin leading band like that, drops it, then trims the white margins.
//
// Deliberately dependency-free: PNG decode/encode runs on node's built-in zlib
// rather than sips, so this is reproducible off macOS and in CI.

import { readFileSync, writeFileSync } from 'node:fs'
import { inflateSync, deflateSync } from 'node:zlib'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const p = (...parts) => resolve(ROOT, ...parts)

const SRC_MARK = p('public/favicon-512x512.png')
const SRC_LOCKUP = p('src/assets/images/ICONSULTA-horizontal-logo.png')

/* --- PNG codec (8-bit RGBA only, which is what every source here is) ------- */

function decodePNG(path) {
  const buf = readFileSync(path)
  let off = 8
  let w, h, bitDepth, colorType
  const idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(
      `${relative(ROOT, path)}: need 8-bit RGBA, got bitDepth=${bitDepth} colorType=${colorType}`,
    )
  }

  // Undo per-scanline filtering (PNG spec §9.2) into a flat RGBA buffer.
  const raw = inflateSync(Buffer.concat(idat))
  const bpp = 4
  const stride = w * bpp
  const data = Buffer.alloc(h * stride)
  let r = 0
  for (let y = 0; y < h; y++) {
    const filter = raw[r++]
    for (let x = 0; x < stride; x++) {
      const cur = raw[r + x]
      const a = x >= bpp ? data[y * stride + x - bpp] : 0
      const b = y > 0 ? data[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? data[(y - 1) * stride + x - bpp] : 0
      let v
      switch (filter) {
        case 0: v = cur; break
        case 1: v = cur + a; break
        case 2: v = cur + b; break
        case 3: v = cur + ((a + b) >> 1); break
        case 4: {
          const pred = a + b - c
          const pa = Math.abs(pred - a)
          const pb = Math.abs(pred - b)
          const pc = Math.abs(pred - c)
          v = cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
          break
        }
        default:
          throw new Error(`unknown PNG filter ${filter} on row ${y}`)
      }
      data[y * stride + x] = v & 0xff
    }
    r += stride
  }
  return { w, h, data }
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (~c) >>> 0
}

function chunk(type, body) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(body.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0)
  return Buffer.concat([head, body, crc])
}

function encodePNG({ w, h, data }) {
  const stride = w * 4
  // Filter type 0 (None) on every row — deflate does the real work, and these
  // are small icons where a filter search would not pay for itself.
  const rows = Buffer.alloc(h * (stride + 1))
  for (let y = 0; y < h; y++) {
    rows[y * (stride + 1)] = 0
    data.copy(rows, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: truecolour + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* --- geometry -------------------------------------------------------------- */

// Everything below treats "ink" as any pixel darker than near-white. The sources
// are opaque with a white ground (0% transparent pixels), so alpha tells us
// nothing about where the artwork actually is — luminance does.
const INK_CUTOFF = 240

function inkScanner({ w, data }) {
  const stride = w * 4
  return (x, y) => {
    const i = y * stride + x * 4
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < INK_CUTOFF
  }
}

function crop(img, x0, y0, w, h) {
  const stride = img.w * 4
  const out = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    img.data.copy(out, y * w * 4, (y0 + y) * stride + x0 * 4, (y0 + y) * stride + (x0 + w) * 4)
  }
  return { w, h, data: out }
}

// Trims to the artwork's bounding box, first discarding a thin band of ink welded
// to the top edge and separated from the artwork by blank rows. The 15% ceiling
// keeps this from eating a legitimately top-aligned logo.
function cropToInk(img, { pad = 0, label = '' } = {}) {
  const isInk = inkScanner(img)
  const rowInk = (y) => {
    for (let x = 0; x < img.w; x++) if (isInk(x, y)) return true
    return false
  }

  let skip = 0
  if (rowInk(0)) {
    let band = 0
    while (band < img.h && rowInk(band)) band++
    let gap = band
    while (gap < img.h && !rowInk(gap)) gap++
    if (band < img.h * 0.15 && gap > band) {
      skip = band
      console.log(`  ${label}: dropped ${band}px artifact band at the top edge`)
    }
  }

  let minX = img.w, minY = img.h, maxX = -1, maxY = -1
  for (let y = skip; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (!isInk(x, y)) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) throw new Error(`${label}: no artwork found`)

  // pad recovers anti-aliased edge pixels sitting just above INK_CUTOFF.
  const x0 = Math.max(0, minX - pad)
  const y0 = Math.max(skip, minY - pad)
  return crop(img, x0, y0, Math.min(img.w, maxX + 1 + pad) - x0, Math.min(img.h, maxY + 1 + pad) - y0)
}

// Box filter: averages every source pixel landing in a destination pixel. Right
// choice here because every resize in this script is a downscale.
function resize(img, w, h) {
  const out = Buffer.alloc(w * h * 4)
  const sx = img.w / w
  const sy = img.h / h
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy)
    const y1 = Math.max(y0 + 1, Math.ceil((y + 1) * sy))
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx)
      const x1 = Math.max(x0 + 1, Math.ceil((x + 1) * sx))
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let yy = y0; yy < Math.min(y1, img.h); yy++) {
        for (let xx = x0; xx < Math.min(x1, img.w); xx++) {
          const i = (yy * img.w + xx) * 4
          r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; a += img.data[i + 3]
          n++
        }
      }
      const o = (y * w + x) * 4
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n
    }
  }
  return { w, h, data: out }
}

function scaleToFit(img, maxW, maxH) {
  const k = Math.min(maxW / img.w, maxH / img.h, 1)
  return k === 1 ? img : resize(img, Math.round(img.w * k), Math.round(img.h * k))
}

// Centres img on a solid ground. The sources are opaque white-backed, so a white
// ground is what makes the seam invisible.
function padTo(img, w, h, [br, bg, bb] = [255, 255, 255]) {
  const out = Buffer.alloc(w * h * 4)
  for (let i = 0; i < out.length; i += 4) {
    out[i] = br; out[i + 1] = bg; out[i + 2] = bb; out[i + 3] = 255
  }
  const ox = Math.round((w - img.w) / 2)
  const oy = Math.round((h - img.h) / 2)
  for (let y = 0; y < img.h; y++) {
    img.data.copy(out, ((oy + y) * w + ox) * 4, y * img.w * 4, (y + 1) * img.w * 4)
  }
  return { w, h, data: out }
}

function write(path, img) {
  const buf = encodePNG(img)
  writeFileSync(path, buf)
  console.log(
    `  ${relative(ROOT, path).padEnd(44)} ${String(img.w).padStart(4)}x${String(img.h).padEnd(4)} ${(buf.length / 1024).toFixed(1)} KB`,
  )
}

/* --- outputs --------------------------------------------------------------- */

console.log('Repairing the horizontal lockup in place')
const lockup = cropToInk(decodePNG(SRC_LOCKUP), { pad: 3, label: 'ICONSULTA-horizontal-logo.png' })
write(SRC_LOCKUP, lockup)

console.log('\nDeriving icons from favicon-512x512.png')
const mark = decodePNG(SRC_MARK)
// The React-side badge. A derived copy of public/favicon-128x128.png on purpose:
// bundled imports get Vite's content hashing, browser icons need stable root URLs.
write(p('src/assets/images/logo-mark.png'), resize(mark, 128, 128))
write(p('public/apple-touch-icon.png'), resize(mark, 180, 180))
write(p('public/favicon-192x192.png'), resize(mark, 192, 192))

console.log('\nBuilding the social card')
write(p('public/og-image.png'), padTo(scaleToFit(lockup, 900, 400), 1200, 630))
