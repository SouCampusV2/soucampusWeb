"use client";

import { useEffect, useRef, useState } from "react";

// ============================================================
// «Emergent Terrain» — алгоритмическая философия варианта 11
// (algorithmic-art требует сначала манифест, потом код).
//
// Мир не рисуется — он вырастает из одного числа. Зерно запускает
// генератор, генератор — два поля шума: высоту и влажность. Всё
// остальное следует из них, как в самой игре: низина под уровнем
// моря — вода, кромка — песок, влажная равнина — лес, сухая — луг,
// выше — камень, на вершинах снег. Отмывка рельефа — не краска, а
// разница высот соседей: склон к свету светлее, от света темнее.
//
// Каждый блок — ровно один пиксель поля, увеличенный без сглаживания:
// чёткий квадрат, как блок в игре. Облака — третье поле шума, выше и
// быстрее; два слоя, едущие с разной скоростью, дают глубину без 3D.
//
// Посетитель получает свой мир: зерно новое на каждом заходе, и
// кнопка даёт следующее. Одинаковых карт у двух людей не будет.
// ============================================================

/** Детерминированный генератор (mulberry32): одно зерно — один мир. */
export function rng(seed: number) {
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

// Палитра биомов — единственное, что задано руками. Всё остальное считает шум.
function biome(h: number, m: number): RGB {
  if (h < 0.4) return [36, 72, 138];
  if (h < 0.455) return [58, 110, 190];
  if (h < 0.48) return [214, 200, 140];
  if (h < 0.62) return m > 0.52 ? [58, 116, 46] : [108, 164, 70];
  if (h < 0.7) return m > 0.5 ? [44, 92, 50] : [94, 136, 64];
  if (h < 0.78) return [128, 128, 124];
  return [236, 240, 244];
}

const CELL = 7; // экранных пикселей на блок

/**
 * Поле высот. edge — насколько сильно опускаются края: 0.25 даёт
 * материк во весь экран (первый экран лендинга), ~0.9 — остров посреди
 * воды (страницы студии). scale — частота шума на клетку: на маленьком
 * поле нужна крупнее, иначе рельеф не успевает измениться и остров
 * выходит плоской кляксой.
 */
export function heightMap(seed: number, cols: number, rows: number, edge = 0.25, scale = 0.018) {
  const height = valueNoise(seed);
  const hmap = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Поднимаем центр карты: так на экране чаще выходит суша, а не океан.
      const d = Math.hypot((x / cols - 0.5) * 1.2, y / rows - 0.5);
      hmap[y * cols + x] = fbm(height, x * scale, y * scale, 5) + 0.12 - d * edge;
    }
  }
  return hmap;
}

/** Уровень, выше которого клетка — суша (песок и всё, что выше). */
export const SEA_LEVEL = 0.455;

/** Раскраска поля высот биомами с отмывкой рельефа. */
export function paint(seed: number, hmap: Float32Array, cols: number, rows: number, scale = 0.018) {
  const moist = valueNoise(seed ^ 0x9e3779b9);
  const img = new ImageData(cols, rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const h = hmap[i];
      const m = fbm(moist, x * scale * 1.4, y * scale * 1.4, 3);
      const [r, g, b] = biome(h, m);
      // Отмывка: свет с северо-запада. Вода — плоская, её не тенюем.
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

function generate(seed: number, cols: number, rows: number) {
  return paint(seed, heightMap(seed, cols, rows), cols, rows);
}

function clouds(seed: number, cols: number, rows: number) {
  const n = valueNoise(seed ^ 0x51ed270b);
  const img = new ImageData(cols, rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = fbm(n, x * 0.05, y * 0.08, 3);
      const a = v > 0.6 ? 170 : 0;
      const i = (y * cols + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a;
    }
  }
  return img;
}

export function World({ initialSeed }: { initialSeed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Первое зерно выбирает сервер на каждый запрос (страница динамическая),
  // поэтому HTML и первый кадр совпадают, а мир всё равно новый.
  const [seed, setSeed] = useState(initialSeed);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let terrain: HTMLCanvasElement | null = null;
    let sky: HTMLCanvasElement | null = null;

    function build() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      // Поле шире экрана на 40% — есть куда медленно плыть.
      const cols = Math.ceil((canvas.clientWidth * 1.4) / CELL);
      const rows = Math.ceil(canvas.clientHeight / CELL) + 2;
      terrain = document.createElement("canvas");
      terrain.width = cols;
      terrain.height = rows;
      terrain.getContext("2d")!.putImageData(generate(seed, cols, rows), 0, 0);
      const cc = Math.ceil(cols * 1.3);
      sky = document.createElement("canvas");
      sky.width = cc;
      sky.height = rows;
      sky.getContext("2d")!.putImageData(clouds(seed, cc, rows), 0, 0);
    }

    function draw(t: number) {
      if (!canvas || !ctx || !terrain || !sky) return;
      const dpr = canvas.width / canvas.clientWidth;
      const cell = CELL * dpr;
      ctx.imageSmoothingEnabled = false;
      const spanT = terrain.width * cell - canvas.width;
      const spanS = sky.width * cell - canvas.width;
      // Туда-обратно по синусу: без шва на краю поля.
      const p = reduce ? 0.5 : (Math.sin(t / 26000) + 1) / 2;
      const q = reduce ? 0.3 : (Math.sin(t / 9000) + 1) / 2;
      ctx.drawImage(terrain, -Math.round(p * spanT), 0, terrain.width * cell, terrain.height * cell);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(sky, -Math.round(q * spanS), 0, sky.width * cell, sky.height * cell);
      ctx.globalAlpha = 1;
      if (!reduce) frame = requestAnimationFrame(draw);
    }

    build();
    frame = requestAnimationFrame(draw);
    const onResize = () => {
      cancelAnimationFrame(frame);
      build();
      frame = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [seed]);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="absolute bottom-5 right-5 z-10 flex items-center gap-3 rounded-full bg-[#0d1210]/80 py-1.5 pl-4 pr-1.5 text-sm text-[#e7eee8] backdrop-blur">
        <span className="tabular-nums">
          World seed <span className="font-semibold">{seed}</span>
        </span>
        <button
          type="button"
          onClick={() => setSeed(Math.floor(Math.random() * 99999))}
          className="rounded-full bg-[#e7d9a0] px-3 py-1.5 font-semibold text-[#0d1210] transition-transform active:scale-95"
        >
          New world
        </button>
      </div>
    </>
  );
}
