/**
 * Generates assets/icon.png and assets/splash.png with no external dependencies.
 * Run: node scripts/gen-assets.js
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG builder ───────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const lenBuf  = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal  = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf  = Buffer.alloc(4); crcBuf.writeUInt32BE(crcVal);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePNG(width, height, getPixel) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit depth, RGB

  // Build raw scanlines (filter byte 0 + RGB per pixel)
  const stride = 1 + width * 3;
  const raw    = Buffer.alloc(stride * height, 0);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixel(x, y, width, height);
      const off = y * stride + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Simple 5×7 bitmap font for capital letters ───────────────────────────────
const GLYPHS = {
  Q: ['01110','10001','10001','10001','10101','01110','00010'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  u: ['00000','00000','10001','10001','10001','10011','01101'],
  i: ['00100','00000','01100','00100','00100','00100','01110'],
  z: ['00000','00000','11111','00010','00100','01000','11111'],
  S: ['00000','01110','10000','01110','00001','10001','01110'],
  t: ['01000','01000','11110','01000','01000','01001','00110'],
  r: ['00000','00000','10110','11001','10000','10000','10000'],
  e: ['00000','00000','01110','10001','11111','10000','01110'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'],
  G: ['01110','10001','10000','10111','10001','10001','01110'],
};

function drawGlyph(pixels, glyph, startX, startY, scale, r, g, b) {
  const rows = GLYPHS[glyph] ?? GLYPHS[' '];
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      if (rows[row][col] === '1') {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = startX + col * scale + dx;
            const py = startY + row  * scale + dy;
            if (px >= 0 && py >= 0 && px < pixels.width && py < pixels.height) {
              pixels.set(px, py, r, g, b);
            }
          }
        }
      }
    }
  }
}

// ── Icon: 1024×1024, green bg, "QN" in white ─────────────────────────────────
function makeIcon() {
  const W = 1024, H = 1024;
  const buf = new Uint8Array(W * H * 3);
  const pixels = {
    width: W, height: H,
    set(x, y, r, g, b) { const i = (y * W + x) * 3; buf[i]=r; buf[i+1]=g; buf[i+2]=b; },
    get(x, y) { const i = (y * W + x) * 3; return [buf[i], buf[i+1], buf[i+2]]; },
  };

  // Fill green
  buf.fill(0);
  for (let i = 0; i < buf.length; i += 3) { buf[i] = 0x00; buf[i+1] = 0xC8; buf[i+2] = 0x53; }

  // Draw "QN" centred — glyph is 5×7, scale=80 → 400×560 per char, gap=40
  const scale = 80, gap = 60;
  const charW = 5 * scale, charH = 7 * scale;
  const totalW = charW * 2 + gap;
  const startX = Math.floor((W - totalW) / 2);
  const startY = Math.floor((H - charH) / 2);

  drawGlyph(pixels, 'Q', startX,            startY, scale, 255, 255, 255);
  drawGlyph(pixels, 'N', startX + charW + gap, startY, scale, 255, 255, 255);

  return makePNG(W, H, (x, y) => pixels.get(x, y));
}

// ── Splash: 1284×2778, black bg (image not strictly needed — app.json color covers it)
function makeSplash() {
  const W = 512, H = 512;
  return makePNG(W, H, () => [0x0A, 0x0A, 0x0A]);
}

// ── Write files ───────────────────────────────────────────────────────────────
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

console.log('Generating assets/icon.png (1024×1024)…');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), makeIcon());
console.log('Done: assets/icon.png');

console.log('Generating assets/splash.png (512×512 black)…');
fs.writeFileSync(path.join(assetsDir, 'splash.png'), makeSplash());
console.log('Done: assets/splash.png');
console.log('Assets generated. The splash background colour is set via app.json.');
