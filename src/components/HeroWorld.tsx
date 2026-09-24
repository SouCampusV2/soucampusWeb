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
// Цена в производительности: генерация — один раз на зерно и размер
// экрана (~60 тыс. клеток, миллисекунды), дальше каждый кадр только
// сдвигает две готовые картинки. Кадры останавливаются, когда первый
// экран ушёл из вида, и не идут вовсе при prefers-reduced-motion.

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

type RGB = [number, number, number];

// Палитра биомов — единственное, что задано руками. Это цвета самой игры,
// а не акценты сайта: карта должна читаться как карта Minecraft.
//
// Биом решают три поля, как в самой игре: высота (h), влажность (m) и
// температура (t). Шум фрактальный, поэтому значения кучкуются вокруг
// 0.5 — отсюда пороги в районе 0.44–0.56, а не 0.3/0.7: при широких
// порогах крайние биомы (пустыня, тайга) почти не выпадали бы.
function biome(h: number, m: number, t: number): RGB {
  const hot = t > 0.55;
  const cold = t < 0.45;
  const wet = m > 0.53;
  const dry = m < 0.47;

  // Океаны по температуре, как в игре: тёплый — бирюзовый, умеренно
  // тёплый — голубее обычного, холодный — темнее и с фиолетовым.
  // Цвета воды из игры (warm #43D5EE и т.д.), приглушённые: с высоты
  // чистый голубой перекрикивал бы панель с текстом.
  if (h < 0.455) {
    const shallow = h >= 0.4;
    if (hot) return shallow ? [72, 196, 204] : [30, 136, 164]; // тёплый
    if (t > 0.51) return shallow ? [60, 146, 204] : [34, 98, 158]; // умеренно тёплый
    if (cold) return shallow ? [56, 88, 180] : [36, 54, 128]; // холодный
    return shallow ? [58, 110, 190] : [36, 72, 138]; // обычный
  }
  if (h < 0.48) {
    // Берег: в жаре и суши — красный песок бэдлендса, в холоде — галька.
    if (hot && dry) return [206, 124, 60];
    if (cold) return [150, 150, 140];
    return [214, 200, 140];
  }
  if (h < 0.62) {
    if (hot) {
      if (dry) return m < 0.43 ? [222, 206, 146] : [176, 168, 82]; // пустыня / саванна
      return wet ? [42, 132, 34] : [140, 160, 64]; // джунгли / сухая саванна
    }
    // Снежная равнина — только в сильном холоде, иначе тундра: при
    // одном пороге белое занимало пол-экрана в каждом холодном мире.
    // Снег чуть голубой, чтобы не сливаться с облаками.
    if (cold) return wet ? [52, 92, 70] : t < 0.41 ? [214, 226, 238] : [110, 132, 104]; // тайга / снег / тундра
    if (wet && h < 0.51) return [76, 98, 58]; // болото у воды
    if (wet) return [58, 116, 46]; // лес
    if (m > 0.5 && t > 0.5) return [226, 168, 196]; // вишнёвая роща, редкая
    return dry ? [132, 172, 80] : [108, 164, 70]; // равнина / луг
  }
  if (h < 0.7) {
    if (hot && dry) return h < 0.66 ? [188, 96, 48] : [214, 140, 80]; // бэдлендс полосами
    if (hot) return [28, 100, 30]; // густые джунгли
    if (cold) return [44, 78, 62]; // ельник
    return wet ? [44, 92, 50] : [120, 158, 84]; // тёмный лес / березняк
  }
  if (h < 0.78) return t < 0.41 ? [214, 226, 238] : [128, 128, 124]; // камень, в сильном холоде уже снег
  return [236, 240, 244];
}

const SEA_LEVEL = 0.455;
const CELL = 7; // экранных пикселей на блок
const SCALE = 0.018; // частота шума на клетку

function terrain(seed: number, cols: number, rows: number) {
  const height = valueNoise(seed);
  const moist = valueNoise(seed ^ 0x9e3779b9);
  const temp = valueNoise(seed ^ 0x7f4a7c15);
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
      const m = fbm(moist, x * SCALE * 1.4, y * SCALE * 1.4, 3);
      // Частота температуры подобрана так, чтобы на один экран
      // приходилось два-три климата: при более крупных поясах (×0.8)
      // экран целиком уходил в один климат, чаще всего в снег.
      const t = fbm(temp, x * SCALE * 1.1, y * SCALE * 1.1, 3);
      const [r, g, b] = biome(h, m, t);
      // Свет с северо-запада. Вода плоская, её не тенюем.
      const nw = hmap[Math.max(0, y - 1) * cols + Math.max(0, x - 1)];
      const shade = h < SEA_LEVEL ? 1 : 1 + Math.max(-0.35, Math.min(0.35, (h - nw) * 9));
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hydrated = useHydrated();
  // Своё число на сервере и в браузере — не беда: до гидратации оно нигде
  // не напечатано, а рисует холст только эффект, то есть браузер.
  const [seed, setSeed] = useState(randomSeed);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let visible = true;
    let land: HTMLCanvasElement | null = null;
    let sky: HTMLCanvasElement | null = null;
    let cloud: ReturnType<typeof clouds> | null = null;
    // Отсчёт облаков идёт от первого показа мира и не сбрасывается при
    // смене размера окна: пересобранное небо сразу догоняет нужную фазу.
    const start = performance.now();
    let lastCloudPaint = -Infinity;

    // Небо перерисовывается не каждый кадр, а раз в ~100 мс и только пока
    // облака ещё набегают — дальше картинка неподвижна и её лишь сдвигают.
    function updateSky(now: number) {
      if (!sky || !cloud) return;
      const elapsed = reduce ? Infinity : (now - start) / 1000;
      if (elapsed - lastCloudPaint < 0.1) return;
      if (lastCloudPaint > cloud.done) return;
      lastCloudPaint = elapsed;
      paintClouds(cloud.img, cloud.appearAt, elapsed);
      sky.getContext("2d")!.putImageData(cloud.img, 0, 0);
    }

    function build() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      // Поле шире экрана на 40% — есть куда медленно плыть.
      const cols = Math.ceil((canvas.clientWidth * 1.4) / CELL);
      const rows = Math.ceil(canvas.clientHeight / CELL) + 2;
      land = document.createElement("canvas");
      land.width = cols;
      land.height = rows;
      land.getContext("2d")!.putImageData(terrain(seed, cols, rows), 0, 0);
      const cc = Math.ceil(cols * 1.3);
      sky = document.createElement("canvas");
      sky.width = cc;
      sky.height = rows;
      cloud = clouds(seed, cc, rows);
      lastCloudPaint = -Infinity;
      updateSky(performance.now());
    }

    function draw(t: number) {
      if (!canvas || !ctx || !land || !sky) return;
      updateSky(t);
      const cell = CELL * (canvas.width / canvas.clientWidth);
      ctx.imageSmoothingEnabled = false;
      const spanLand = land.width * cell - canvas.width;
      const spanSky = sky.width * cell - canvas.width;
      // Туда-обратно по синусу: без шва на краю поля.
      const p = reduce ? 0.5 : (Math.sin(t / 26000) + 1) / 2;
      const q = reduce ? 0.3 : (Math.sin(t / 9000) + 1) / 2;
      ctx.drawImage(land, -Math.round(p * spanLand), 0, land.width * cell, land.height * cell);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(sky, -Math.round(q * spanSky), 0, sky.width * cell, sky.height * cell);
      ctx.globalAlpha = 1;
      if (!reduce && visible) frame = requestAnimationFrame(draw);
    }

    function restart() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    }

    build();
    restart();

    // Первый экран ушёл из вида — кадры не нужны никому.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) restart();
      else cancelAnimationFrame(frame);
    });
    observer.observe(canvas);

    const onResize = () => {
      build();
      restart();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [seed]);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
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
