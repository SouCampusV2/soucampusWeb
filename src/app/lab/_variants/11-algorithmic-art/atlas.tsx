"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SIZE_MAX, SIZE_MIN, useEstimate } from "../../_shared/useEstimate";
import { CONTACT } from "../../_shared/pages";
import { SEA_LEVEL, heightMap, paint, rng } from "./world";

// Генеративные куски страниц студии варианта Seed. Тот же алгоритм, что
// рисует карту на первом экране лендинга (world.tsx: поле высот → биомы →
// отмывка), только с другими параметрами:
//
//   Island       — остров посреди воды (края опущены сильнее);
//   Atlas        — материк, на суше которого алгоритм расставляет работы;
//   PlotEstimator — остров, чьи размеры задаёт посетитель, а цена и срок
//                   считаются по формуле сайта.
//
// Все три рисуются один раз на смену параметров, не каждый кадр: движение
// здесь не нужно, и оно съело бы батарею ради ничего.

/**
 * Поле высот считается в useMemo — это чистая математика, она одинаково
 * работает на сервере и в браузере. Поэтому метки атласа, которые от него
 * зависят, есть уже в серверном HTML. Красит canvas эффект: ImageData
 * существует только в браузере. Одна клетка = один пиксель, растягивает
 * CSS без сглаживания.
 */
function useTerrain(seed: number, cols: number, rows: number, edge: number, scale: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hmap = useMemo(() => heightMap(seed, cols, rows, edge, scale), [seed, cols, rows, edge, scale]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = cols;
    canvas.height = rows;
    ctx.putImageData(paint(seed, hmap, cols, rows, scale), 0, 0);
  }, [seed, hmap, cols, rows, scale]);

  return { ref, hmap };
}

const PIXEL = { imageRendering: "pixelated" as const };

// ── Остров ──────────────────────────────────────────────────────────────

/** edge: насколько опущены края. 0.9 — остров посреди воды, 0.45 — почти материк. */
export function Island({ seed, cells, label, edge = 0.7 }: { seed: number; cells: number; label: string; edge?: number }) {
  const { ref } = useTerrain(seed, cells, cells, edge, 0.09);
  return <canvas ref={ref} role="img" aria-label={label} className="h-full w-full rounded-lg" style={PIXEL} />;
}

// ── Атлас ───────────────────────────────────────────────────────────────

type Place = { slug: string; title: string; tag: string };

const COLS = 180;
const ROWS = 100;

/**
 * Места на суше: для каждой работы — своя цепочка случайных чисел из
 * зерна, первая клетка суши не ближе MIN_GAP к уже занятым. Одно зерно —
 * одна раскладка, поэтому кнопка «New world» переставляет и метки.
 */
function placeOnLand(seed: number, hmap: Float32Array, count: number) {
  const MIN_GAP = 9;
  const spots: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng(seed * 31 + i * 7919);
    let best: { x: number; y: number } | null = null;
    for (let tries = 0; tries < 400; tries++) {
      const x = Math.floor(6 + r() * (COLS - 12));
      const y = Math.floor(6 + r() * (ROWS - 12));
      if (hmap[y * COLS + x] < SEA_LEVEL + 0.02) continue;
      const clear = spots.every((p) => Math.hypot(p.x - x, p.y - y) >= MIN_GAP);
      if (clear) {
        best = { x, y };
        break;
      }
      best ??= { x, y };
    }
    // Суши не нашлось совсем (редкое зерно-океан) — ставим по сетке.
    spots.push(best ?? { x: 10 + ((i * 23) % (COLS - 20)), y: 10 + ((i * 13) % (ROWS - 20)) });
  }
  return spots;
}

export function Atlas({ initialSeed, places }: { initialSeed: number; places: Place[] }) {
  const [seed, setSeed] = useState(initialSeed);
  const { ref, hmap } = useTerrain(seed, COLS, ROWS, 0.55, 0.03);
  const [active, setActive] = useState<string | null>(null);
  const spots = useMemo(() => placeOnLand(seed, hmap, places.length), [seed, hmap, places.length]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10" style={{ aspectRatio: `${COLS} / ${ROWS}` }}>
        <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" style={PIXEL} />
        {spots.map((spot, i) => {
          const place = places[i];
          const on = active === place.slug;
          return (
            <Link
              key={place.slug}
              href={`/portfolio/${place.slug}`}
              onMouseEnter={() => setActive(place.slug)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(place.slug)}
              onBlur={() => setActive(null)}
              aria-label={`${i + 1}. ${place.title}`}
              className={`absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#0d1210] text-[11px] font-bold tabular-nums transition-transform ${
                on ? "z-20 scale-125 bg-[#e7d9a0] text-[#0d1210]" : "z-10 bg-[#0d1210]/85 text-[#e7eee8] hover:scale-110"
              }`}
              style={{ left: `${(spot.x / COLS) * 100}%`, top: `${(spot.y / ROWS) * 100}%` }}
            >
              {i + 1}
              {on && (
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0d1210]/95 px-3 py-1.5 text-left text-sm font-semibold text-[#e7eee8] shadow-lg">
                  {place.title}
                  <span className="block text-xs font-normal text-[#e7eee8]/60">{place.tag}</span>
                </span>
              )}
            </Link>
          );
        })}
        <div className="absolute bottom-3 right-3 z-30 flex items-center gap-3 rounded-full bg-[#0d1210]/80 py-1.5 pl-4 pr-1.5 text-sm backdrop-blur">
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
      </div>
      <p className="mt-3 text-sm text-[#e7eee8]/55">
        Every visit draws a new world and places the builds on its land. The numbers match the index below.
      </p>
    </div>
  );
}

// ── Калькулятор-остров ──────────────────────────────────────────────────

/** Один пиксель поля = BLOCKS_PER_CELL блоков карты: 1000×1000 — это 200×200 клеток. */
const BLOCKS_PER_CELL = 5;

export function PlotEstimator({ seed }: { seed: number }) {
  const e = useEstimate(150);
  const cols = Math.max(8, Math.round(e.w / BLOCKS_PER_CELL));
  const rows = Math.max(8, Math.round(e.h / BLOCKS_PER_CELL));
  // Масштаб шума привязан к БЛОКАМ, а не к клеткам: большая карта —
  // больше рельефа, а не тот же остров, растянутый крупнее.
  const { ref } = useTerrain(seed, cols, rows, 0.8, 0.045);
  const longest = Math.max(e.w, e.h);

  return (
    <div className="grid gap-8 rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10 md:grid-cols-[1fr_1.1fr] md:p-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{CONTACT.estimateTitle}</h2>
        <p className="mt-2 text-[#e7eee8]/65">Set the size. The island on the right grows with it, drawn by the same algorithm as the map on the home page.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <SizeField label="Width" value={e.width} onChange={e.setWidth} />
          <SizeField label="Length" value={e.height} onChange={e.setHeight} />
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-6 border-t border-[#e7eee8]/15 pt-6" aria-live="polite">
          <div>
            <dt className="text-sm text-[#e7eee8]/60">Price from</dt>
            <dd className="mt-1 text-4xl font-semibold tabular-nums tracking-[-0.03em] text-[#e7d9a0]">{e.priceLabel}</dd>
          </div>
          <div>
            <dt className="text-sm text-[#e7eee8]/60">Timeline</dt>
            <dd className="mt-1 text-4xl font-semibold tracking-[-0.03em]">{e.deadline}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-[#e7eee8]/50">{CONTACT.estimateNote}</p>
      </div>
      <div className="grid min-h-[260px] place-items-center rounded-xl bg-[#243f8a]/40 p-4">
        {/* Рамка пропорциональна введённому размеру: 400×100 — вытянутая
            полоса, а не квадрат с другой подписью. */}
        <div
          className="relative max-h-[340px] max-w-full"
          style={{
            aspectRatio: `${e.w} / ${e.h}`,
            width: `${Math.max(30, (e.w / longest) * 100)}%`,
          }}
        >
          <canvas ref={ref} role="img" aria-label={`Generated island, ${e.w} by ${e.h} blocks`} className="h-full w-full rounded-md" style={PIXEL} />
          <span className="absolute -bottom-7 left-0 right-0 text-center text-xs tabular-nums text-[#e7eee8]/60">
            {e.w} × {e.h} blocks
          </span>
        </div>
      </div>
    </div>
  );
}

function SizeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm text-[#e7eee8]/65">
      {label}, blocks
      <input
        type="number"
        inputMode="numeric"
        min={SIZE_MIN}
        max={SIZE_MAX}
        step={10}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        className="mt-1.5 h-12 w-full rounded-xl bg-[#0d1210] px-4 text-lg tabular-nums text-[#e7eee8] outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-[#e7d9a0]"
      />
    </label>
  );
}
