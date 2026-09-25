// Готовая картинка мира для первого кадра главной (public/hero-world.png).
//
// Зачем. Карту в hero рисует браузер: воркер считает мир только после
// того, как скачался и запустился весь JS страницы. На телефоне это
// секунды синего экрана (замер 25.09, docs/PERF.md). Картинка приходит
// вместе с HTML и закрывает эту паузу; настоящий, случайный мир потом
// проявляется поверх неё.
//
// Картинка — тот же генератор (src/lib/world-gen.ts), пиксель = блок.
// Бесшовная по X, как и сама карта, поэтому на странице она повторяется
// по горизонтали (repeat-x) и закрывает экран любой ширины.
//
// Запуск (после правки генератора или этих чисел):
//   node --experimental-strip-types scripts/gen-hero-placeholder.mjs
// ⚠️ COLS и ROWS повторены в HeroWorld.tsx (размер фона) — меняешь здесь,
// меняй и там.

import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { terrain } from "../src/lib/world-gen.ts";

const SEED = Number(process.argv[2] ?? 3291);
const COLS = 210; // 210 блоков × 7 px = 1470 px на одну копию
const ROWS = 160; // 160 × 7 = 1120 px — выше большинства экранов

const land = terrain(SEED, COLS, ROWS);
const out = fileURLToPath(new URL("../public/hero-world.png", import.meta.url));

await sharp(Buffer.from(land.buffer), { raw: { width: COLS, height: ROWS, channels: 4 } })
  .removeAlpha()
  .png({ compressionLevel: 9, palette: true })
  .toFile(out);

console.log(`hero-world.png: seed ${SEED}, ${COLS}×${ROWS}`);
