"use client";

import { useEffect, useRef, useState } from "react";
import { BUTTON_COLORS } from "@/components/Button";
import { useHydrated } from "@/lib/useHydrated";

// Фон первого экрана — генеративная карта мира. Перенесена из лаборатории
// (ветка design-lab, вариант «Seed», 22.09) по решению владельца 24.09.
//
// Мир не рисуется, а вырастает из одного числа. Зерно запускает генератор,
// генератор — два поля шума: высоту и влажность. Всё остальное следует из
// них, как в самой игре: низина — вода, кромка — песок, влажная равнина —
// лес, сухая — луг, выше — камень, на вершинах снег. Отмывка рельефа — не
// краска, а разница высот соседей: склон к свету светлее, от света темнее.
// Облака — третье поле шума, выше и быстрее.
//
// Каждый блок — один пиксель поля, увеличенный без сглаживания: чёткий
// квадрат, как блок в игре. Зерно новое на каждом заходе.
//
// ⚠️ Зерно выбирает БРАУЗЕР, а не сервер. В лаборатории страница была
// динамической и зерно приходило с HTML; главная у нас статическая (один
// HTML на всех), поэтому число в плашке рисуется только после гидратации
// (useHydrated) — иначе сервер и клиент напечатали бы разные числа.
//
// Как рисуется и движется (с 24.09, вечер). Мир генерируется ОДИН раз на
// зерно и размер экрана в маленький холст «пиксель = блок», один раз
// переносится увеличенным без сглаживания на видимый холст, а плывёт тот
// CSS-трансформацией через Web Animations API. Такую анимацию ведёт
// поток композитора: сдвиг дробный и равномерный, и паузы основного
// потока (React, прокрутка) её не задевают.
// ⚠️ До этого каждый кадр перерисовывал весь холст из JS со сдвигом,
// округлённым до пикселя. При скорости ~0.1 пикселя за кадр шаг в пиксель
// выпадал то через три кадра, то через пять — фон «потряхивало». Не
// возвращать покадровую отрисовку ради движения.
// Анимации ставятся на паузу, когда первый экран ушёл из вида, и не
// запускаются вовсе при prefers-reduced-motion.

/** Детерминированный генератор (mulberry32): одно зерно — один мир. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Значимый шум на решётке 256×256 с гладкой интерполяцией. */
function valueNoise(seed: number) {
  const r = rng(seed);
  const size = 256;
  const table = new Float32Array(size * size);
  for (let i = 0; i < table.length; i++) table[i] = r();
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const at = (i: number, j: number) => table[((j & 255) << 8) | (i & 255)];
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

/**
 * Градиентный шум Перлина (улучшенный, с квинтичным сглаживанием) —
 * тот же класс шума, что у Minecraft. Нужен климату: у value noise выше
 * на низкой частоте проступает сетка — пятна тянутся вдоль осей ромбами
 * и полосами, и после нарезки на уровни это становится формой биомов.
 * У градиентного шума сетки не видно. Выход — около 0.5, как у valueNoise.
 */
function perlinNoise(seed: number) {
  const r = rng(seed);
  const order = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = order[i & 255];
  const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const dot = (i: number, j: number, dx: number, dy: number) => {
    const g = GRAD[perm[perm[i] + j] & 7];
    return g[0] * dx + g[1] * dy;
  };
  return (x: number, y: number) => {
    const X = Math.floor(x);
    const Y = Math.floor(y);
    const xf = x - X;
    const yf = y - Y;
    const xi = X & 255;
    const yi = Y & 255;
    const u = fade(xf);
    const v = fade(yf);
    const n00 = dot(xi, yi, xf, yf);
    const n10 = dot(xi + 1, yi, xf - 1, yf);
    const n01 = dot(xi, yi + 1, xf, yf - 1);
    const n11 = dot(xi + 1, yi + 1, xf - 1, yf - 1);
    const top = n00 + (n10 - n00) * u;
    const bottom = n01 + (n11 - n01) * u;
    return 0.5 + (top + (bottom - top) * v) * 0.5;
  };
}

/** Случайное число 0..1 для клетки: одно и то же для той же клетки и зерна. */
function cellHash(seed: number, x: number, y: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Фрактальный шум: октавы, каждая вдвое мельче и вдвое тише. */
function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves: number) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// Биомы — как в Minecraft 1.18+. Мир считается из нескольких полей шума,
// и роли у них разные:
//   · РЕЛЬЕФ (высота, h) решает только форму: вода, берег, равнина,
//     склон, пик. Он частый — берега и горы должны быть подробными;
//   · КЛИМАТ (температура и влажность) решает, КАКОЙ это биом. Он редкий
//     и гладкий: одно значение держится на сотнях блоков, поэтому биом
//     занимает большой цельный кусок, а не рассыпается пятнами по суше.
// Оба климатических поля делятся на 5 уровней, и биом берётся из таблицы
// 5×5 (ниже BIOMES) — ровно так выбирает игра.
//
// ⚠️ До 24.09 (вечер) здесь сравнивали с порогами мелкий шум в три
// октавы — каждое его пятнышко становилось отдельным биомом, и суша
// выглядела пёстрой. Климат обязан быть крупнее рельефа, а не мельче.

type RGB = [number, number, number];

// Пороги уровней — ДОЛИ суши, а не числа «на глаз»: шум кучкуется вокруг
// 0.5, и равные интервалы дали бы крайним уровням почти ничего. Числа
// сняты замером на 300 мирах (двухоктавный Перлин — у него распределение
// уже, чем у value noise, поэтому при смене шума пороги пересчитаны):
// температура — 6% мороз, 20% холод, 34% умеренно, 20% тепло, 20% жара;
// влажность — пять равных частей. Мороз нарочно редкий: снега на первом
// экране должно быть мало.
const TEMP_LEVELS = [0.334, 0.427, 0.522, 0.584];
const HUMIDITY_LEVELS = [0.406, 0.47, 0.522, 0.584];

// Полуширина перехода между уровнями, в единицах шума. Меньше половины
// самого узкого промежутка между порогами (0.043), иначе переход
// захватывал бы третий уровень.
const BLEND = 0.016;

/**
 * Уровень 0..4 и его сосед по мягкой границе: [нижний, верхний, вес
 * верхнего]. Около порога клетка принадлежит двум уровням сразу с весами
 * по плавной кривой — так игра смешивает цвет травы и листвы на стыке
 * биомов (biome blend), и биомы перетекают друг в друга, а не обрываются
 * ступенькой.
 */
function softLevel(v: number, cuts: number[]): [number, number, number] {
  let i = 0;
  while (i < cuts.length && v >= cuts[i]) i++;
  const smooth = (k: number) => k * k * (3 - 2 * k);
  if (i < cuts.length && cuts[i] - v < BLEND) {
    return [i, i + 1, smooth((v - (cuts[i] - BLEND)) / (2 * BLEND))];
  }
  if (i > 0 && v - cuts[i - 1] < BLEND) {
    return [i - 1, i, smooth((v - (cuts[i - 1] - BLEND)) / (2 * BLEND))];
  }
  return [i, i, 0];
}

// Цвета — самой игры, а не акценты сайта: карта должна читаться как
// карта Minecraft. Строка — температура (мороз → жара), столбец —
// влажность (сухо → влажно). Повторы в строке — не опечатка: у игры
// тоже один биом занимает несколько клеток таблицы.
const SNOWY_PLAINS: RGB = [214, 226, 238]; // чуть голубой — не сливается с облаками
const SNOWY_TAIGA: RGB = [104, 128, 118];
const COLD_PLAINS: RGB = [128, 158, 96];
const FOREST: RGB = [58, 116, 46];
const TAIGA: RGB = [52, 92, 70];
const SPRUCE_TAIGA: RGB = [42, 76, 60];
const MEADOW: RGB = [128, 176, 78];
const PLAINS: RGB = [108, 164, 70];
const BIRCH_FOREST: RGB = [112, 152, 78];
const DARK_FOREST: RGB = [38, 80, 42];
const SAVANNA: RGB = [176, 168, 82];
const WARM_FOREST: RGB = [72, 128, 46];
const SPARSE_JUNGLE: RGB = [62, 142, 44];
const JUNGLE: RGB = [34, 124, 30];
const DESERT: RGB = [222, 206, 146];
const BADLANDS: RGB = [188, 96, 48];

const BIOMES: RGB[][] = [
  [SNOWY_PLAINS, SNOWY_PLAINS, SNOWY_PLAINS, SNOWY_TAIGA, SNOWY_TAIGA],
  [COLD_PLAINS, COLD_PLAINS, FOREST, TAIGA, SPRUCE_TAIGA],
  [MEADOW, PLAINS, FOREST, BIRCH_FOREST, DARK_FOREST],
  [SAVANNA, SAVANNA, WARM_FOREST, SPARSE_JUNGLE, JUNGLE],
  [DESERT, DESERT, DESERT, BADLANDS, BADLANDS],
];

// Океаны по той же температуре, как в игре: тёплый — бирюзовый, холодный
// — темнее и с фиолетовым. [глубина, мелководье]. Цвета воды из игры,
// приглушённые: с высоты чистый голубой перекрикивал бы панель.
const OCEANS: [RGB, RGB][] = [
  [[36, 54, 128], [56, 88, 180]], // морозный
  [[36, 60, 132], [56, 96, 184]], // холодный
  [[36, 72, 138], [58, 110, 190]], // обычный
  [[34, 98, 158], [60, 146, 204]], // умеренно тёплый
  [[30, 136, 164], [72, 196, 204]], // тёплый
];

function biome(h: number, t: number, m: number): RGB {
  if (h < 0.455) return OCEANS[t][h < 0.4 ? 0 : 1];
  if (h < 0.48) {
    // Берег: у бэдлендса красный песок, в холоде галька.
    if (t === 4 && m >= 3) return [206, 124, 60];
    if (t <= 1) return [150, 150, 140];
    return [214, 200, 140];
  }
  if (h >= 0.72) {
    // Пики. Снег только на самых высоких и не в тепле — шапки, а не поля.
    // Порог по замеру на 200 мирах: выше 0.8 лежит 1.9% суши в среднем и
    // до 15% в горных мирах (белое пятно на пол-экрана), выше 0.84 —
    // 0.65% в среднем.
    if (h >= 0.84 && t <= 2) return [236, 240, 244];
    if (t === 4 && m >= 3) return [170, 104, 72]; // горы бэдлендса
    return [128, 128, 124];
  }
  // Болото и мангры — только во влажной низине у воды, как в игре.
  if (m === 4 && h < 0.5 && (t === 2 || t === 3)) return t === 2 ? [76, 98, 58] : [62, 100, 52];
  // Вишнёвая роща — на склонах умеренного сухого климата.
  if (t === 2 && m === 0 && h >= 0.63) return [226, 168, 196];
  // Бэдлендс полосами по высоте, как слои терракоты. Полосы широкие и
  // близкие по цвету: частые и контрастные читались как горизонтали
  // топографической карты.
  if (t === 4 && m >= 3) return Math.floor(h * 25) % 2 === 0 ? [198, 110, 60] : BADLANDS;
  return BIOMES[t][m];
}

const SEA_LEVEL = 0.455;
const CELL = 7; // экранных пикселей на блок
const SCALE = 0.018; // частота рельефа на клетку
const CLIMATE_SCALE = 0.008; // частота климата: вдвое реже рельефа
const WARP = 18; // на сколько клеток искривлены границы климата
const WARP_SCALE = 0.012; // частота искривления: плавные изгибы, а не рябь

function terrain(seed: number, cols: number, rows: number) {
  const height = valueNoise(seed);
  const temp = perlinNoise(seed ^ 0x7f4a7c15);
  const moist = perlinNoise(seed ^ 0x9e3779b9);
  const warpX = perlinNoise(seed ^ 0x3c6ef372);
  const warpY = perlinNoise(seed ^ 0xa54ff53a);
  const detail = valueNoise(seed ^ 0x1f83d9ab);
  const hmap = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Центр карты приподнят: на экране чаще суша, а не океан.
      const d = Math.hypot((x / cols - 0.5) * 1.2, y / rows - 0.5);
      hmap[y * cols + x] = fbm(height, x * SCALE, y * SCALE, 5) + 0.12 - d * 0.25;
    }
  }
  const img = new ImageData(cols, rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const h = hmap[i];
      // Domain warp: климат читается не в (x, y), а в точке, сдвинутой
      // ещё одним шумом. Границы биомов становятся извилистыми, как у
      // игры, а не ровными пятнами-кругами. Биом при этом цельный:
      // сдвиг плавный, пятен он не добавляет.
      // Множитель 4, а не 2: разброс Перлина вокруг 0.5 уже, чем у
      // value noise, и при прежнем он гнул бы границы вдвое слабее.
      const wx = x + (warpX(x * WARP_SCALE, y * WARP_SCALE) - 0.5) * 4 * WARP;
      const wy = y + (warpY(x * WARP_SCALE, y * WARP_SCALE) - 0.5) * 4 * WARP;
      const [t0, t1, tw] = softLevel(fbm(temp, wx * CLIMATE_SCALE, wy * CLIMATE_SCALE, 2), TEMP_LEVELS);
      const [m0, m1, mw] = softLevel(fbm(moist, wx * CLIMATE_SCALE, wy * CLIMATE_SCALE, 2), HUMIDITY_LEVELS);
      // На полосе перехода блок целиком достаётся ОДНОМУ из двух биомов,
      // с вероятностью по весу. Переход постепенный, но из чётких блоков,
      // как рваная граница биомов в самой игре.
      // ⚠️ Смешивать ЦВЕТА нельзя (пробовали 24.09): соседние блоки
      // отличались на доли тона, и полоса перехода читалась как размытие.
      const t = cellHash(seed, x, y) < tw ? t1 : t0;
      const m = cellHash(seed ^ 0x5bd1e995, x, y) < mw ? m1 : m0;
      const [r, g, b] = biome(h, t, m);
      // Свет с северо-запада. Вода плоская, её не тенюем.
      const nw = hmap[Math.max(0, y - 1) * cols + Math.max(0, x - 1)];
      let shade = h < SEA_LEVEL ? 1 : 1 + Math.max(-0.35, Math.min(0.35, (h - nw) * 9));
      // Фактура внутри биома: ±5% яркости по мелкому шуму. Лес выглядит
      // лесом, а не заливкой, но в другой биом не превращается.
      if (h >= SEA_LEVEL) shade *= 0.95 + detail(x * 0.15, y * 0.15) * 0.1;
      img.data[i * 4] = Math.min(255, r * shade);
      img.data[i * 4 + 1] = Math.min(255, g * shade);
      img.data[i * 4 + 2] = Math.min(255, b * shade);
      img.data[i * 4 + 3] = 255;
    }
  }
  return img;
}

// Облака набегают постепенно. Каждой клетке облака назначается момент
// появления (в секундах от старта) из трёх слагаемых:
//   · «рождение» облака — отдельное поле шума, крупное: соседние клетки
//     одного облака получают близкие числа, разные облака — разные.
//     Поэтому облака возникают в случайных местах по одному, а не
//     полосой слева направо;
//   · глубина клетки внутри облака — плотная середина раньше, края
//     позже: облако РАСТЁТ, а не проявляется целиком;
//   · немного случайного разброса, чтобы край рос рвано, блоками.
// Итоговая плотность та же, что была: клетка облака — где v > 0.6.
const CLOUD_ALPHA = 170;
const CLOUD_START = 1.5; // первые секунды небо чистое
const CLOUD_SPREAD = 20; // за сколько секунд рождаются все облака
const CLOUD_GROW = 5; // сколько растёт одно облако от середины к краю
const CLOUD_FADE = 1.2; // сколько проявляется одна клетка

function clouds(seed: number, cols: number, rows: number) {
  const n = valueNoise(seed ^ 0x51ed270b);
  const birth = valueNoise(seed ^ 0x2545f491);
  const jitter = rng(seed ^ 0x68e31da4);
  const appearAt = new Float32Array(cols * rows).fill(Infinity);
  let last = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = fbm(n, x * 0.05, y * 0.08, 3);
      if (v <= 0.6) continue;
      const b = Math.min(1, Math.max(0, (fbm(birth, x * 0.02, y * 0.03, 2) - 0.3) / 0.4));
      const depth = 1 - Math.min(1, (v - 0.6) / 0.15);
      const at = CLOUD_START + b * CLOUD_SPREAD + depth * CLOUD_GROW + jitter() * 0.8;
      appearAt[y * cols + x] = at;
      last = Math.max(last, at);
    }
  }
  const img = new ImageData(cols, rows);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
  }
  return { img, appearAt, done: last + CLOUD_FADE };
}

/** Прозрачность облаков на момент elapsed (сек). */
function paintClouds(img: ImageData, appearAt: Float32Array, elapsed: number) {
  for (let i = 0; i < appearAt.length; i++) {
    const k = (elapsed - appearAt[i]) / CLOUD_FADE;
    img.data[i * 4 + 3] = k <= 0 ? 0 : k >= 1 ? CLOUD_ALPHA : Math.round(k * CLOUD_ALPHA);
  }
}

const randomSeed = () => Math.floor(Math.random() * 99999);

export function HeroWorld() {
  const boxRef = useRef<HTMLDivElement>(null);
  const landRef = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<HTMLCanvasElement>(null);
  const hydrated = useHydrated();
  // Своё число на сервере и в браузере — не беда: до гидратации оно нигде
  // не напечатано, а рисует холст только эффект, то есть браузер.
  const [seed, setSeed] = useState(randomSeed);

  useEffect(() => {
    const box = boxRef.current;
    const land = landRef.current;
    const sky = skyRef.current;
    const landCtx = land?.getContext("2d");
    const skyCtx = sky?.getContext("2d");
    if (!box || !land || !sky || !landCtx || !skyCtx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let anims: Animation[] = [];
    let visible = true;
    let cloud: ReturnType<typeof clouds> | null = null;
    let timer = 0;
    // Отсчёт облаков идёт от первого показа мира и не сбрасывается при
    // смене размера окна: пересобранное небо сразу догоняет нужную фазу.
    const start = performance.now();

    // Данные мира лежат в маленьких холстах «пиксель = блок» вне страницы,
    // а на видимые переносятся увеличенными БЕЗ сглаживания. Увеличивать
    // силами браузера (image-rendering: pixelated) нельзя: композитор,
    // двигая слой, масштабирует его сглаживанием, и блоки расплываются —
    // проверено 24.09. Готовая картинка 1:1 им только сдвигается.
    const landData = document.createElement("canvas");
    const skyData = document.createElement("canvas");

    function blit(from: HTMLCanvasElement, to: CanvasRenderingContext2D) {
      to.imageSmoothingEnabled = false;
      to.clearRect(0, 0, to.canvas.width, to.canvas.height);
      to.drawImage(from, 0, 0, to.canvas.width, to.canvas.height);
    }

    // Небо перерисовывается раз в 100 мс и только пока облака набегают.
    function paintSky() {
      if (!cloud || !skyCtx) return;
      const elapsed = reduce ? Infinity : (performance.now() - start) / 1000;
      paintClouds(cloud.img, cloud.appearAt, elapsed);
      skyData.getContext("2d")!.putImageData(cloud.img, 0, 0);
      blit(skyData, skyCtx);
      if (elapsed > cloud.done) window.clearInterval(timer);
    }

    /** Туда-обратно без шва на краю поля; ease-in-out повторяет прежний синус. */
    function drift(el: HTMLElement, span: number, oneWayMs: number, phase: number) {
      if (reduce) {
        el.style.transform = `translate3d(${-span * phase}px,0,0)`;
        return;
      }
      const a = el.animate(
        [{ transform: "translate3d(0,0,0)" }, { transform: `translate3d(${-span}px,0,0)` }],
        {
          duration: oneWayMs,
          iterations: Infinity,
          direction: "alternate",
          easing: "ease-in-out",
          delay: -oneWayMs * phase,
        },
      );
      if (!visible) a.pause();
      anims.push(a);
    }

    function build() {
      if (!box || !land || !sky || !landCtx) return;
      anims.forEach((a) => a.cancel());
      anims = [];
      window.clearInterval(timer);
      const width = box.clientWidth;
      const height = box.clientHeight;
      // Поле шире экрана на 40% — есть куда медленно плыть.
      const cols = Math.ceil((width * 1.4) / CELL);
      const rows = Math.ceil(height / CELL) + 1;
      // Земля — в разрешении экрана (dpr до 2): это её чёткие края.
      // Облака — в CSS-пикселях: они полупрозрачные, на ретине лишняя
      // чёткость им не нужна, а холст неба самый большой (~1.8 ширины экрана).
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      landData.width = cols;
      landData.height = rows;
      landData.getContext("2d")!.putImageData(terrain(seed, cols, rows), 0, 0);
      land.width = cols * CELL * dpr;
      land.height = rows * CELL * dpr;
      land.style.width = `${cols * CELL}px`;
      land.style.height = `${rows * CELL}px`;
      blit(landData, landCtx);
      const cc = Math.ceil(cols * 1.3);
      skyData.width = cc;
      skyData.height = rows;
      sky.width = cc * CELL;
      sky.height = rows * CELL;
      sky.style.width = `${cc * CELL}px`;
      sky.style.height = `${rows * CELL}px`;
      cloud = clouds(seed, cc, rows);
      paintSky();
      if (!reduce) timer = window.setInterval(paintSky, 100);
      drift(land, cols * CELL - width, 82000, 0.5);
      drift(sky, cc * CELL - width, 28000, 0.3);
    }

    build();

    // Первый экран ушёл из вида — анимации не нужны никому.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      anims.forEach((a) => (visible ? a.play() : a.pause()));
    });
    observer.observe(box);

    let resizeTimer = 0;
    const onResize = () => {
      // Пересборка мира — десятки миллисекунд; во время перетаскивания
      // края окна она шла бы на каждый пиксель.
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      anims.forEach((a) => a.cancel());
      window.clearInterval(timer);
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [seed]);

  const layer = "absolute left-0 top-0 max-w-none will-change-transform";

  return (
    <>
      <div ref={boxRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <canvas ref={landRef} className={layer} />
        <canvas ref={skyRef} className={`${layer} opacity-55`} />
      </div>
      {hydrated && (
        <div className="absolute bottom-5 right-5 z-10 flex items-center gap-3 rounded-full border border-zinc-950/[0.06] bg-[#fbfbff]/80 py-1.5 pl-4 pr-1.5 text-sm text-zinc-950 backdrop-blur-xl dark:border-zinc-50/[0.08] dark:bg-zinc-950/80 dark:text-zinc-50">
          <span className="tabular-nums">
            World seed <span className="font-semibold">{seed}</span>
          </span>
          <button
            type="button"
            onClick={() => setSeed(randomSeed())}
            className={`${BUTTON_COLORS.primary} px-3 py-1.5 font-semibold transition-transform active:scale-95 pointer-coarse:py-2.5`}
          >
            New world
          </button>
        </div>
      )}
    </>
  );
}
