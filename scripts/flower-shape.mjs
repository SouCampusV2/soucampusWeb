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
function polygon(d) {
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
  return points.map(([x, y]) => [+((x - vx) / vw).toFixed(4), +((y - vy) / vh).toFixed(4)]);
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
