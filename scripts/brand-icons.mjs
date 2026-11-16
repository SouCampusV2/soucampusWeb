// Иконки сайта из пиксельного знака SouCampus (выбор владельца 16.11 —
// вариант F2: кремовый цветок с жёлтой серединкой на оранжевом квадрате;
// тот же знак стоит в навбаре).
//
// Источник один — сетка цветка public/brand/pixel/flower-stamps.json.
// Скрипт пишет:
//   · src/app/icon.svg        — вектор, Next подключает его во вкладку сам;
//   · src/app/apple-icon.png  — 180×180, значок на экране телефона;
//   · public/favicon.ico      — 16 и 32 px, старые браузеры и закладки.
//
// Перерисовал владелец знак или сменил цвета — запустить заново:
//   node scripts/brand-icons.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const stamps = JSON.parse(readFileSync("public/brand/pixel/flower-stamps.json", "utf8"));
const ROWS = stamps.stamps.flower32.rows;
const W = Math.max(...ROWS.map((r) => r.length));
const H = ROWS.length;
const COLORS = { ...stamps.palettes.cream, C: "#fed83d", c: "#c6a830" };
const BG = "#ff6900";
const RADIUS = 0.22; // скругление квадрата — доля стороны, как rounded-[22%] в навбаре
const FLOWER = 0.8; // цветок занимает 80% стороны, как size-8 в size-10

// ── SVG ──
const side = Math.max(W, H) / FLOWER;
const ox = (side - W) / 2;
const oy = (side - H) / 2;
let paths = "";
for (const cell of new Set(ROWS.join("").replace(/\./g, ""))) {
  let d = "";
  ROWS.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== cell) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === cell) end++;
      d += `M${x} ${y}h${end - x}v1h${x - end}z`;
      x = end;
    }
  });
  // Обводка тем же цветом закрывает стыки соседних частей (как в PixelArt.tsx).
  paths += `<path fill="${COLORS[cell]}" stroke="${COLORS[cell]}" stroke-width="0.04" d="${d}"/>`;
}
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side.toFixed(3)} ${side.toFixed(3)}">` +
  `<rect width="${side.toFixed(3)}" height="${side.toFixed(3)}" rx="${(side * RADIUS).toFixed(3)}" fill="${BG}"/>` +
  `<g transform="translate(${ox.toFixed(3)} ${oy.toFixed(3)})">${paths}</g></svg>\n`;
writeFileSync("src/app/icon.svg", svg);

// ── Растр ──
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Цвет точки (u, v) в долях стороны, RGBA. */
function sample(u, v) {
  // Скруглённый квадрат: вне угловых дуг — прозрачно.
  const r = RADIUS;
  const cx = Math.min(Math.max(u, r), 1 - r);
  const cy = Math.min(Math.max(v, r), 1 - r);
  if (Math.hypot(u - cx, v - cy) > r) return [0, 0, 0, 0];
  const gx = Math.floor(u * side - ox);
  const gy = Math.floor(v * side - oy);
  const cell = ROWS[gy]?.[gx];
  if (cell && cell !== ".") return [...hex(COLORS[cell]), 255];
  return [...hex(BG), 255];
}

/** size×size RGBA: каждый пиксель — среднее 4×4 точек, иначе на 16 px цветок рассыпается. */
function raster(size) {
  const out = Buffer.alloc(size * size * 4);
  const SUB = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const c = sample((x + (sx + 0.5) / SUB) / size, (y + (sy + 0.5) / SUB) / size);
          // Цвет копим с весом прозрачности, чтобы край не темнел.
          acc[0] += c[0] * c[3];
          acc[1] += c[1] * c[3];
          acc[2] += c[2] * c[3];
          acc[3] += c[3];
        }
      }
      const i = (y * size + x) * 4;
      const a = acc[3] / (SUB * SUB);
      out[i] = acc[3] ? Math.round(acc[0] / acc[3]) : 0;
      out[i + 1] = acc[3] ? Math.round(acc[1] / acc[3]) : 0;
      out[i + 2] = acc[3] ? Math.round(acc[2] / acc[3]) : 0;
      out[i + 3] = Math.round(a);
    }
  }
  return out;
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function png(size) {
  const rgba = raster(size);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("src/app/apple-icon.png", png(180));

// ICO с PNG внутри (так умеют все браузеры с Vista/IE9): заголовок,
// по записи на размер, затем сами PNG.
const sizes = [16, 32];
const images = sizes.map(png);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s;
  e[1] = s;
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});
writeFileSync("public/favicon.ico", Buffer.concat([header, ...entries, ...images]));

console.log("icon.svg, apple-icon.png (180), favicon.ico (16, 32)");
