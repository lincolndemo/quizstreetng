/**
 * Generates assets/icon.png and assets/splash.png
 * Matches the QuizStreet NG logo: cream bg, QUIZ (black), STREET (orange), NG badge
 * Run: node scripts/gen-assets.js
 * No external dependencies.
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const CRC = (() => {
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
  for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG encoder ────────────────────────────────────────────────────────────────
function chunk(type, data) {
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const tb = Buffer.from(type, 'ascii');
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}
function buildPNG(W, H, getPixel) {
  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
  ihdr[8]=8; ihdr[9]=2; // 8-bit RGB
  const stride = 1 + W * 3;
  const raw = Buffer.alloc(stride * H, 0);
  for (let y = 0; y < H; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < W; x++) {
      const [r,g,b] = getPixel(x,y);
      const o = y * stride + 1 + x * 3;
      raw[o]=r; raw[o+1]=g; raw[o+2]=b;
    }
  }
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',zlib.deflateSync(raw,{level:6})), chunk('IEND',Buffer.alloc(0))]);
}

// ── Pixel canvas ───────────────────────────────────────────────────────────────
function makeCanvas(W, H, fill) {
  const buf = new Uint8Array(W * H * 3);
  const [fr,fg,fb] = fill;
  for (let i = 0; i < buf.length; i += 3) { buf[i]=fr; buf[i+1]=fg; buf[i+2]=fb; }
  return {
    W, H, buf,
    set(x, y, r, g, b) {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i=(y*W+x)*3; buf[i]=r; buf[i+1]=g; buf[i+2]=b;
    },
    get(x, y) { const i=(y*W+x)*3; return [buf[i],buf[i+1],buf[i+2]]; },
  };
}

// ── 5×7 bold bitmap font ───────────────────────────────────────────────────────
const G = {
  Q:['01110','11011','10001','10101','11011','01110','00011'],
  U:['10001','10001','10001','10001','10001','11011','01110'],
  I:['11111','00100','00100','00100','00100','00100','11111'],
  Z:['11111','00011','00110','01100','11000','11000','11111'],
  S:['01111','11000','11000','01110','00011','00011','11110'],
  T:['11111','11111','00100','00100','00100','00100','00100'],
  R:['11110','11011','11011','11110','11100','11010','11001'],
  E:['11111','11000','11000','11110','11000','11000','11111'],
  N:['10001','11001','11001','10101','10011','10011','10001'],
  G:['01111','11000','11000','10011','10011','11011','01111'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'],
};

function drawText(c, str, startX, startY, scale, r, g, b) {
  const gap = Math.max(1, Math.floor(scale * 0.28));
  let x = startX;
  for (const ch of str.toUpperCase()) {
    const rows = G[ch] ?? G[' '];
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < 5; col++) {
        if (rows[row][col] === '1') {
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++)
              c.set(x + col*scale + dx, startY + row*scale + dy, r, g, b);
        }
      }
    }
    x += 5*scale + gap;
  }
  return x - startX - gap; // actual width drawn
}

function textW(str, scale) {
  const gap = Math.max(1, Math.floor(scale * 0.28));
  return str.length * 5 * scale + (str.length - 1) * gap;
}

// Filled rounded rectangle
function fillRRect(c, x, y, w, h, r, R, Gv, B) {
  for (let py = y; py < y+h; py++) {
    for (let px = x; px < x+w; px++) {
      const inX = px >= x+r && px < x+w-r;
      const inY = py >= y+r && py < y+h-r;
      if (inX || inY) { c.set(px, py, R, Gv, B); continue; }
      // corner check
      const cx = px < x+r ? x+r : x+w-r;
      const cy = py < y+r ? y+r : y+h-r;
      if ((px-cx)**2 + (py-cy)**2 <= r*r) c.set(px, py, R, Gv, B);
    }
  }
}

// ── Icon: 1024×1024 ────────────────────────────────────────────────────────────
function makeIcon() {
  const W=1024, H=1024;
  const c = makeCanvas(W, H, [0xED,0xE0,0xC4]); // warm cream

  // ── QUIZ (black, scale 40) ─────────────────────────────
  const qs=40;
  const qx = Math.floor((W - textW('QUIZ',qs)) / 2);
  drawText(c, 'QUIZ', qx, 110, qs, 0x18,0x18,0x18);

  // ── STREET (deep orange, scale 28) ────────────────────
  const ss=28;
  const sx = Math.floor((W - textW('STREET',ss)) / 2);
  drawText(c, 'STREET', sx, 110 + 7*qs + 44, ss, 0xCC,0x55,0x22);

  // ── NG badge ────────────────────────────────────────────
  const ns=24, padX=28, padY=16;
  const nw = textW('NG',ns);
  const badgeW = nw + 2*padX, badgeH = 7*ns + 2*padY;
  const bx = Math.floor((W - badgeW) / 2);
  const by = 110 + 7*qs + 44 + 7*ss + 60;
  fillRRect(c, bx, by, badgeW, badgeH, 16, 0x18,0x12,0x0C);
  drawText(c, 'NG', bx+padX, by+padY, ns, 0xED,0xE0,0xC4);

  return buildPNG(W, H, (x,y) => c.get(x,y));
}

// ── Splash: 1024×1024, black bg, centred logo ─────────────────────────────────
function makeSplash() {
  const W=1024, H=1024;
  const c = makeCanvas(W, H, [0x0A,0x0A,0x0A]);

  // Gold "QuizStreet" + "NG" text centred on black
  const qs=34;
  const qx = Math.floor((W - textW('QUIZ',qs)) / 2);
  const startY = Math.floor(H/2) - (7*qs + 30 + 7*20) / 2;
  drawText(c, 'QUIZ', qx, startY, qs, 0xFF,0xD7,0x00);

  const ss=22;
  const sx = Math.floor((W - textW('STREET',ss)) / 2);
  drawText(c, 'STREET', sx, startY + 7*qs + 24, ss, 0xFF,0xD7,0x00);

  const ns=16, padX=20, padY=12;
  const nw = textW('NG',ns);
  const bW = nw + 2*padX, bH = 7*ns + 2*padY;
  const bx = Math.floor((W - bW) / 2);
  const by = startY + 7*qs + 24 + 7*ss + 36;
  fillRRect(c, bx, by, bW, bH, 10, 0xFF,0xD7,0x00);
  drawText(c, 'NG', bx+padX, by+padY, ns, 0x0A,0x0A,0x0A);

  return buildPNG(W, H, (x,y) => c.get(x,y));
}

// ── Write ──────────────────────────────────────────────────────────────────────
const out = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
console.log('Generating icon.png…');
fs.writeFileSync(path.join(out,'icon.png'), makeIcon());
console.log('Generating splash.png…');
fs.writeFileSync(path.join(out,'splash.png'), makeSplash());
console.log('Done.');
