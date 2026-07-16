/**
 * Dependency-free icon generator for X Feed Filter.
 *
 * Produces blue disabled and green enabled variants with a white filter funnel.
 * Uses only node:zlib (no image libraries), which keeps the project
 * zero-runtime-dependency. Run with `npm run icons`.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'public/icons');
const SIZES = [16, 32, 48, 128, 256];

/* ----------------------------- PNG encoding ----------------------------- */

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------- geometry ------------------------------- */

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function distPtSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function inRoundedRect(nx, ny, x0, y0, x1, y1, r) {
  if (nx < x0 || nx > x1 || ny < y0 || ny > y1) return false;
  const cornerX = nx < x0 + r || nx > x1 - r;
  const cornerY = ny < y0 + r || ny > y1 - r;
  if (!(cornerX && cornerY)) return true;
  const ccx = nx < x0 + r ? x0 + r : x1 - r;
  const ccy = ny < y0 + r ? y0 + r : y1 - r;
  return (nx - ccx) ** 2 + (ny - ccy) ** 2 <= r * r;
}

// Filter-funnel outline, normalised 0..1, y down.
const FUNNEL = [
  [0.3, 0.34, 0.7, 0.34], // top rim
  [0.3, 0.34, 0.47, 0.58], // left slope
  [0.7, 0.34, 0.53, 0.58], // right slope
  [0.47, 0.58, 0.47, 0.74], // left neck
  [0.53, 0.58, 0.53, 0.74], // right neck
  [0.47, 0.74, 0.53, 0.74], // bottom cap
];

const BLUE = [29, 155, 240];
const GREEN = [0, 186, 124];
const FG = [255, 255, 255];
const PAD = 0.015;
const RR = 0.2;

/** Render at supersampled resolution (no AA logic — supersampling handles it). */
function renderSS(ss, background) {
  const buf = Buffer.alloc(ss * ss * 4);
  const half = 0.052; // half line thickness (normalised)
  for (let y = 0; y < ss; y++) {
    const ny = (y + 0.5) / ss;
    for (let x = 0; x < ss; x++) {
      const nx = (x + 0.5) / ss;
      const i = (y * ss + x) * 4;
      if (!inRoundedRect(nx, ny, PAD, PAD, 1 - PAD, 1 - PAD, RR)) {
        // transparent
        continue;
      }
      let [r, g, b] = background;
      let minD = Infinity;
      for (const [ax, ay, bx, by] of FUNNEL) {
        minD = Math.min(minD, distPtSeg(nx, ny, ax, ay, bx, by));
      }
      if (minD <= half) [r, g, b] = FG;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

/** Box-downsample an SS buffer to the target size. */
function downsample(ssBuf, ss, size) {
  const factor = ss / size;
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;
      const x0 = Math.floor(x * factor);
      const x1 = Math.floor((x + 1) * factor);
      const y0 = Math.floor(y * factor);
      const y1 = Math.floor((y + 1) * factor);
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * ss + xx) * 4;
          r += ssBuf[i];
          g += ssBuf[i + 1];
          b += ssBuf[i + 2];
          a += ssBuf[i + 3];
          count++;
        }
      }
      const o = (y * size + x) * 4;
      out[o] = count ? Math.round(r / count) : 0;
      out[o + 1] = count ? Math.round(g / count) : 0;
      out[o + 2] = count ? Math.round(b / count) : 0;
      out[o + 3] = count ? Math.round(a / count) : 0;
    }
  }
  return out;
}

function generate() {
  mkdirSync(outDir, { recursive: true });
  const max = SIZES[SIZES.length - 1];
  const ss = max * 4;
  const variants = [
    { name: 'enabled', background: GREEN },
    { name: 'disabled', background: BLUE },
  ];

  for (const variant of variants) {
    console.log(`[icons] rendering ${variant.name} supersample ${ss}x${ss}…`);
    const ssBuf = renderSS(ss, variant.background);
    for (const size of SIZES) {
      const rgba = size === ss ? ssBuf : downsample(ssBuf, ss, size);
      const png = encodePNG(size, size, rgba);
      const file = path.join(outDir, `icon-${variant.name}-${size}.png`);
      writeFileSync(file, png);
      console.log(`[icons] wrote ${path.relative(root, file)} (${png.length} bytes)`);
      // Keep the original blue filenames for repository/readme compatibility.
      if (variant.name === 'disabled') {
        writeFileSync(path.join(outDir, `icon-${size}.png`), png);
      }
    }
  }
}

generate();
