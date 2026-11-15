// Контуры цветка SouCampus для маленьких цветов в мире первого экрана.
//
// Источник — гладкий знак владельца public/brand/parts/flower-parts.svg
// (11 лепестков petal-1…11 — кривые Безье, серединка center — круг).
// Скрипт превращает каждую кривую в ломаную и пишет координаты 0..1 в
// src/lib/flower-shape.json. Генератор мира (world-gen.ts → smallFlower)
// рисует по ним цветок любого размера — форма та же, что у знака.
//
// Заодно — веер для секции «How an order works» (HowItWorks): из
// public/brand/parts/fan-parts.svg берутся пути petal-1…12 и sun как есть
// (рисует их сам браузер, ломаная не нужна) в src/lib/fan-shape.json.
//
// Перерисовал владелец знак — запустить заново:
//   node scripts/flower-shape.mjs

import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync("public/brand/parts/flower-parts.svg", "utf8");
const [vx, vy, vw, vh] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);

/** Ломаная по пути из команд M, C, Z (других в файле нет — проверяется). */
function polygon(d, [bx, by, bw, bh] = [vx, vy, vw, vh]) {
  const tokens = d.match(/[MCZ]|-?\d*\.?\d+/g);
  const points = [];
  let i = 0;
  let cur = [0, 0];
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M") {
      cur = [num(), num()];
      points.push(cur);
    } else if (cmd === "C") {
      // C может идти несколькими тройками подряд без повторения буквы.
      while (i < tokens.length && !/[MCZ]/.test(tokens[i])) {
        const p1 = [num(), num()];
        const p2 = [num(), num()];
        const p3 = [num(), num()];
        for (let k = 1; k <= 6; k++) {
          const t = k / 6;
          const u = 1 - t;
          points.push([
            u * u * u * cur[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * cur[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
          ]);
        }
        cur = p3;
      }
    } else if (cmd === "Z") {
      // замыкание — ломаная и так замкнута при проверке «точка внутри»
    } else {
      throw new Error(`Команда ${cmd} в пути не поддерживается — добавить в скрипт`);
    }
  }
  return points.map(([x, y]) => [+((x - bx) / bw).toFixed(4), +((y - by) / bh).toFixed(4)]);
}

const path = (id) => {
  const m = svg.match(new RegExp(`<path[^>]*id="${id}"[^>]*d="([^"]+)"`)) ??
    svg.match(new RegExp(`<path[^>]*d="([^"]+)"[^>]*id="${id}"`));
  if (!m) throw new Error(`Нет пути ${id} в flower-parts.svg`);
  return polygon(m[1]);
};

const petals = [];
for (let n = 1; svg.includes(`id="petal-${n}"`); n++) petals.push(path(`petal-${n}`));
// Серединка в файле — круг (<circle id="center">), а не путь.
const circle = svg.match(/<circle[^>]*id="center"[^>]*>/)?.[0];
if (!circle) throw new Error("Нет серединки center в flower-parts.svg");
const attr = (name) => Number(circle.match(new RegExp(`${name}="([^"]+)"`))[1]);
const center = {
  cx: +((attr("cx") - vx) / vw).toFixed(4),
  cy: +((attr("cy") - vy) / vh).toFixed(4),
  r: +(attr("r") / vw).toFixed(4),
};

writeFileSync(
  "src/lib/flower-shape.json",
  JSON.stringify({ source: "public/brand/parts/flower-parts.svg", petals, center }) + "\n",
);
console.log(`flower-shape.json: ${petals.length} лепестков, серединка r = ${center.r}`);

// ── Веер ──
const fan = readFileSync("public/brand/parts/fan-parts.svg", "utf8");
const fanD = (id) => {
  const m = fan.match(new RegExp(`<path[^>]*id="${id}"[^>]*d="([^"]+)"`)) ??
    fan.match(new RegExp(`<path[^>]*d="([^"]+)"[^>]*id="${id}"`));
  if (!m) throw new Error(`Нет пути ${id} в fan-parts.svg`);
  return m[1];
};
const fanPetals = [];
for (let n = 1; fan.includes(`id="petal-${n}"`); n++) fanPetals.push(fanD(`petal-${n}`));
writeFileSync(
  "src/lib/fan-shape.json",
  JSON.stringify({
    source: "public/brand/parts/fan-parts.svg",
    viewBox: fan.match(/viewBox="([^"]+)"/)[1],
    petals: fanPetals,
    sun: fanD("sun"),
  }) + "\n",
);
console.log(`fan-shape.json: ${fanPetals.length} лепестков и солнце`);


// ── Пиксельный веер по частям ──
// Секции «How an order works» нужен ПИКСЕЛЬНЫЙ веер (решение владельца
// 15.11), лепестки которого заливаются по одному. Рисунок — нарисованный
// владельцем public/brand/pixel/transparent/fan-40px-neutral.svg (40×40,
// лепестки одним цветом, солнце другим). Какой пиксель чьего лепестка,
// в рисунке не записано, и лепестки в нём касаются — по связности их не
// разделить. Поэтому:
//   1. «тела» лепестков (дальше 12 клеток от солнца) получают номер того
//      гладкого лепестка (fan-parts.svg), чей угол от солнца ближе всего;
//   2. «ножки» у солнца загибаются и по углу уходили бы к соседу — они
//      получают номер тела, до которого ближе идти по клеткам лепестков.
// Итог — src/lib/fan-pixels.json: "S" — солнце, "a"…"l" — лепестки 1…12
// слева направо, "." — пусто. Сетка обрезана по рисунку.
const pixelSvg = readFileSync("public/brand/pixel/transparent/fan-40px-neutral.svg", "utf8");
const PN = Number(pixelSvg.match(/viewBox="0 0 (\d+)/)[1]);
const pgrid = Array.from({ length: PN }, () => Array(PN).fill("."));
const paths = [...pixelSvg.matchAll(/<path fill="([^"]+)" d="([^"]+)"/g)];
if (paths.length !== 2) throw new Error("Ждал два слоя в пиксельном веере: лепестки и солнце");
for (const [, fill, d] of paths) {
  // Солнце — светлый слой (#ffb86a), лепестки — оранжевый.
  const ch = fill.toLowerCase() === "#ffb86a" ? "S" : "P";
  for (const [, x, y, w] of d.matchAll(/M(\d+) (\d+)h(\d+)/g)) for (let i = 0; i < +w; i++) pgrid[+y][+x + i] = ch;
}

// Углы гладких лепестков от середины основания солнца.
const fanBox = fan.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const flat = (d) => polygon(d, fanBox);
const sunPoly = flat(fanD("sun"));
const sunX = (Math.min(...sunPoly.map((p) => p[0])) + Math.max(...sunPoly.map((p) => p[0]))) / 2;
const sunY = Math.max(...sunPoly.map((p) => p[1]));
const angles = fanPetals.map((d) => {
  const p = flat(d);
  const cx = p.reduce((s, q) => s + q[0], 0) / p.length;
  const cy = p.reduce((s, q) => s + q[1], 0) / p.length;
  return Math.atan2(sunY - cy, cx - sunX);
});
const angleGap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

let sx0 = PN;
let sx1 = 0;
let sy1 = 0;
pgrid.forEach((r, y) => r.forEach((c, x) => {
  if (c === "S") [sx0, sx1, sy1] = [Math.min(sx0, x), Math.max(sx1, x), Math.max(sy1, y)];
}));
const pcx = (sx0 + sx1 + 1) / 2;
const pcy = sy1 + 1;

const label = pgrid.map((r) => r.map((c) => (c === "S" ? "S" : ".")));
const queue = [];
pgrid.forEach((r, y) => r.forEach((c, x) => {
  if (c !== "P" || Math.hypot(x + 0.5 - pcx, y + 0.5 - pcy) <= 12) return;
  const a = Math.atan2(pcy - (y + 0.5), x + 0.5 - pcx);
  let best = 0;
  angles.forEach((b, i) => { if (angleGap(b, a) < angleGap(angles[best], a)) best = i; });
  label[y][x] = String.fromCharCode(97 + best);
  queue.push([x, y]);
}));
// Ножки: волна от тел по клеткам лепестков (4 соседа).
for (let q = 0; q < queue.length; q++) {
  const [x, y] = queue[q];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (pgrid[ny]?.[nx] === "P" && label[ny][nx] === ".") {
      label[ny][nx] = label[y][x];
      queue.push([nx, ny]);
    }
  }
}
// Оторванные пиксели, до которых волна не дошла, — по углу.
pgrid.forEach((r, y) => r.forEach((c, x) => {
  if (c !== "P" || label[y][x] !== ".") return;
  const a = Math.atan2(pcy - (y + 0.5), x + 0.5 - pcx);
  let best = 0;
  angles.forEach((b, i) => { if (angleGap(b, a) < angleGap(angles[best], a)) best = i; });
  label[y][x] = String.fromCharCode(97 + best);
}));
// Сглаживание: на краю тела угол иногда отдаёт пиксель соседу — такой
// пиксель берёт метку большинства соседей-лепестков (8 соседей, 4 прохода).
for (let pass = 0; pass < 4; pass++) {
  const next = label.map((r) => [...r]);
  pgrid.forEach((r, y) => r.forEach((c, x) => {
    if (c !== "P") return;
    const votes = {};
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const l = pgrid[y + dy]?.[x + dx] === "P" ? label[y + dy][x + dx] : null;
        if (l) votes[l] = (votes[l] ?? 0) + 1;
      }
    const [top] = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    if (top[1] > (votes[label[y][x]] ?? 0)) next[y][x] = top[0];
  }));
  label.splice(0, label.length, ...next);
}

const rowsOut = label.map((r) => r.join(""));
const usedRow = (r) => /[^.]/.test(r);
const top = rowsOut.findIndex(usedRow);
const bottom = rowsOut.length - [...rowsOut].reverse().findIndex(usedRow);
let left = PN;
let right = 0;
for (const r of rowsOut.slice(top, bottom)) {
  const m = r.match(/[^.]/);
  if (m) left = Math.min(left, m.index);
  right = Math.max(right, r.replace(/\.+$/, "").length);
}
const fanPixels = rowsOut.slice(top, bottom).map((r) => r.slice(left, right));
writeFileSync(
  "src/lib/fan-pixels.json",
  JSON.stringify({ source: "public/brand/pixel/transparent/fan-40px-neutral.svg", rows: fanPixels }, null, 1) + "\n",
);
console.log(`fan-pixels.json: ${fanPixels[0].length}×${fanPixels.length}`);
