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
function biome(h: number, m: number): RGB {
  if (h < 0.4) return [36, 72, 138];
  if (h < 0.455) return [58, 110, 190];
  if (h < 0.48) return [214, 200, 140];
  if (h < 0.62) return m > 0.52 ? [58, 116, 46] : [108, 164, 70];
  if (h < 0.7) return m > 0.5 ? [44, 92, 50] : [94, 136, 64];
  if (h < 0.78) return [128, 128, 124];
  return [236, 240, 244];
}

const SEA_LEVEL = 0.455;
const CELL = 7; // экранных пикселей на блок
const SCALE = 0.018; // частота шума на клетку

function terrain(seed: number, cols: number, rows: number) {
  const height = valueNoise(seed);
  const moist = valueNoise(seed ^ 0x9e3779b9);
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
      const [r, g, b] = biome(h, m);
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

function clouds(seed: number, cols: number, rows: number) {
  const n = valueNoise(seed ^ 0x51ed270b);
  const img = new ImageData(cols, rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = fbm(n, x * 0.05, y * 0.08, 3);
      const i = (y * cols + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = v > 0.6 ? 170 : 0;
    }
  }
  return img;
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
      sky.getContext("2d")!.putImageData(clouds(seed, cc, rows), 0, 0);
    }

    function draw(t: number) {
      if (!canvas || !ctx || !land || !sky) return;
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
