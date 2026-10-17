/**
 * Generates the placeholder sprite sheets.
 *
 * These exist so the avatar has something to animate before the real
 * hand-cleaned pixel art arrives. They deliberately follow the contract in
 * CONTENT.md exactly, so replacing them is a file swap:
 *
 *   site/public/sprites/<variant>/idle.png   horizontal strip, N frames
 *   site/public/sprites/<variant>/walk.png   horizontal strip, N frames
 *
 * Frame size and counts come from site/src/config/avatar.json, so changing
 * the contract means editing that file and re-running this - no code changes.
 *
 * Run with:  npm run sprites
 *
 * PNG is written directly (zlib is in Node's standard library) rather than
 * pulling in an image dependency for eleven small files.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const config = JSON.parse(readFileSync(join(root, 'site/src/config/avatar.json'), 'utf8'));

// ---------------------------------------------------------------- PNG writer

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** RGBA pixel buffer -> PNG (colour type 6, 8-bit, no interlace). */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // 10..12 stay 0: deflate, adaptive filtering, no interlace.

  // One filter byte (0 = None) per scanline, as the format requires.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- drawing

/** Per-variant colours. The real art replaces these entirely. */
const VARIANTS = {
  default: { top: '#4FE39C', legs: '#2A332E', accent: '#2BA873' },
  student: { top: '#4FE39C', legs: '#2A332E', accent: '#E8EFE9' },
  engineer: { top: '#A3B0A8', legs: '#1B211D', accent: '#4FE39C' },
};

const STAND = { near: 1, far: -1 };

const SKIN = '#D8A87B';
const HAIR = '#2A2420';
const OUTLINE = '#0B0D0C';

const hex = (s) => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
  255,
];

function makeFrame(w, h) {
  return { w, h, px: Buffer.alloc(w * h * 4) }; // transparent
}

function set(f, x, y, color) {
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return;
  const [r, g, b, a] = hex(color);
  const i = (y * f.w + x) * 4;
  f.px[i] = r;
  f.px[i + 1] = g;
  f.px[i + 2] = b;
  f.px[i + 3] = a;
}

function rect(f, x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(f, x, y, color);
}

/**
 * A blocky side-view character facing RIGHT. The code mirrors the sprite for
 * leftward movement, so no left-facing variant is drawn.
 *
 * `bob` lifts the whole body a pixel; `legs` is a {near, far} stride pose.
 */
function drawCharacter(f, colors, { bob = 0, legs = STAND, armSwing = 0 }) {
  const cx = Math.floor(f.w / 2) - 2; // torso left edge
  const top = 5 - bob;

  // head
  rect(f, cx + 1, top, cx + 6, top + 6, SKIN);
  rect(f, cx + 1, top, cx + 6, top + 1, HAIR); // fringe
  rect(f, cx, top + 1, cx, top + 5, HAIR); // back of head
  set(f, cx + 5, top + 4, OUTLINE); // eye, on the facing side

  // torso
  rect(f, cx, top + 7, cx + 5, top + 14, colors.top);
  rect(f, cx + 1, top + 8, cx + 2, top + 9, colors.accent); // a marking

  // arm, swinging opposite the lead leg
  const armY = top + 8 + Math.max(0, armSwing);
  rect(f, cx + 6, armY, cx + 6, armY + 4, colors.top);
  set(f, cx + 6, armY + 5, SKIN); // hand

  // legs
  //
  // Drawn as a near leg and a far leg with separate offsets, the far one in a
  // darker shade and painted first so the near one overlaps it. Without that
  // distinction a side-view stride looks identical whichever leg leads, and
  // the cycle collapses into a two-frame shuffle.
  const hip = top + 15;
  const farShade = shade(colors.legs, -0.35);

  const leg = (dx, color, footColor) => {
    rect(f, cx + 2 + dx, hip, cx + 3 + dx, hip + 5, color);
    rect(f, cx + 2 + dx, hip + 6, cx + 4 + dx, hip + 6, footColor);
  };

  leg(legs.far, farShade, shade(OUTLINE, 0.25));
  leg(legs.near, color_or(colors.legs), OUTLINE);
}

/** Lighten (t > 0) or darken (t < 0) a hex colour. */
function shade(hexColor, t) {
  const [r, g, b] = hex(hexColor);
  const mix = (c) =>
    Math.max(0, Math.min(255, Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t)));
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

const color_or = (c) => c;

/** Compose frames left-to-right into one horizontal strip. */
function strip(frames, w, h) {
  const out = Buffer.alloc(frames.length * w * h * 4);
  const stride = frames.length * w * 4;
  frames.forEach((f, i) => {
    for (let y = 0; y < h; y++) {
      f.px.copy(out, y * stride + i * w * 4, y * w * 4, (y + 1) * w * 4);
    }
  });
  return encodePng(frames.length * w, h, out);
}

// ---------------------------------------------------------------------- main

const { frameWidth: W, frameHeight: H, animations } = config;
const idleCount = animations.idle.frames;
const walkCount = animations.walk.frames;

// Idle: a slow two-pixel breath, held at each extreme.
const idleBob = (i, n) => (i < n / 2 ? 0 : 1);

/*
 * A six-pose stride cycle. The near and far legs swap which one leads across
 * the cycle, and the body sits lowest at full stride and highest as the legs
 * pass under it - the usual contact/passing rhythm that makes a walk read as
 * a walk rather than a shuffle.
 */
const WALK_CYCLE = [
  { near: 3, far: -2, bob: 0 }, // contact, near leg leading
  { near: 1, far: 0, bob: 1 },
  { near: -1, far: 1, bob: 1 }, // passing
  { near: -2, far: 3, bob: 0 }, // contact, far leg leading
  { near: 0, far: 1, bob: 1 },
  { near: 1, far: -1, bob: 1 }, // passing
];

let written = 0;
for (const [variant, colors] of Object.entries(VARIANTS)) {
  const dir = join(root, 'site/public/sprites', variant);
  mkdirSync(dir, { recursive: true });

  const idle = Array.from({ length: idleCount }, (_, i) => {
    const f = makeFrame(W, H);
    drawCharacter(f, colors, { bob: idleBob(i, idleCount), legs: STAND });
    return f;
  });
  writeFileSync(join(dir, 'idle.png'), strip(idle, W, H));

  const walk = Array.from({ length: walkCount }, (_, i) => {
    const f = makeFrame(W, H);
    const pose = WALK_CYCLE[i % WALK_CYCLE.length];
    drawCharacter(f, colors, {
      bob: pose.bob,
      legs: pose,
      // The arm swings opposite the leading leg.
      armSwing: pose.near > 0 ? 1 : 0,
    });
    return f;
  });
  writeFileSync(join(dir, 'walk.png'), strip(walk, W, H));

  written += 2;
  console.log(
    `  ${variant.padEnd(9)} idle.png ${idleCount * W}x${H}  walk.png ${walkCount * W}x${H}`,
  );
}

console.log(`\n  ${written} sprite sheets written to site/public/sprites/`);
