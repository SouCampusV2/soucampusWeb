"use client";

// ⚠️ ЛАБОРАТОРИЯ бренда, круг 3 (16.11): 404, экран загрузки и фавиконка
// (docs/BRAND-IDEAS.md, разделы 5 и 6).
import { useEffect, useMemo, useState } from "react";
import { Unbounded } from "next/font/google";
import flowerStamps from "../../../../../public/brand/pixel/flower-stamps.json";
import { PixelFan, PixelFlower, PixelGrid } from "@/components/brand/PixelArt";
import { Label } from "./Label";

const display = Unbounded({ weight: "800", subsets: ["latin"] });
const YELLOW_CENTER = { C: "#fed83d", c: "#c6a830" };
const FLOWER_COLORS: Record<string, string> = { ...flowerStamps.palettes.orange, ...YELLOW_CENTER };
const ROWS = flowerStamps.stamps.flower32.rows;

/** Клетки цветка в случайном (но постоянном) порядке — для «загрузки чанка». */
function useShuffledCells() {
  return useMemo(() => {
    const cells: [number, number][] = [];
    ROWS.forEach((r, y) => [...r].forEach((c, x) => c !== "." && cells.push([x, y])));
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells;
  }, []);
}

/** Цветок, у которого видны только первые `shown` клеток из перемешанного списка. */
function PartialFlower({ shown, className }: { shown: number; className?: string }) {
  const cells = useShuffledCells();
  const rows = useMemo(() => {
    const on = new Set(cells.slice(0, shown).map(([x, y]) => `${x},${y}`));
    return ROWS.map((r, y) => [...r].map((c, x) => (on.has(`${x},${y}`) ? c : ".")).join(""));
  }, [cells, shown]);
  return <PixelGrid rows={rows} color={(c) => FLOWER_COLORS[c] ?? null} className={className} />;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="flex h-[34rem] flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white px-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
        {children}
      </div>
    </div>
  );
}

const Caption = ({ children }: { children: React.ReactNode }) => (
  <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400 sm:text-base">{children}</p>
);

/** 404-1 — большой цветок и подпись. */
export function NotFoundFlower() {
  return (
    <Frame>
      <PixelFlower colors={YELLOW_CENTER} className="w-64 sm:w-80" />
      <p className={`${display.className} text-3xl text-zinc-950 dark:text-zinc-50 sm:text-4xl`}>This chunk hasn&apos;t loaded yet</p>
      <Caption>404 — the page you&apos;re looking for isn&apos;t on this server. Tap the flower to go home.</Caption>
    </Frame>
  );
}

/** 404-2 — «4 цветок 4». */
export function NotFoundDigits() {
  return (
    <Frame>
      <div className={`${display.className} flex items-center gap-2 text-[9rem] leading-none text-zinc-950 dark:text-zinc-50 sm:text-[13rem]`}>
        4
        <PixelFlower colors={YELLOW_CENTER} className="size-[8rem] sm:size-[11rem]" />
        4
      </div>
      <Caption>This chunk hasn&apos;t loaded yet.</Caption>
    </Frame>
  );
}

/** 404-3 — недогруженный цветок: клетки появляются и застывают на 70%. */
export function NotFoundChunk() {
  const cells = useShuffledCells();
  const stop = Math.round(cells.length * 0.7);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setShown((n) => (n >= stop ? n : n + 6)), 30);
    return () => window.clearInterval(t);
  }, [stop]);
  return (
    <Frame>
      <PartialFlower shown={shown} className="w-64 sm:w-80" />
      <p className={`${display.className} text-3xl text-zinc-950 dark:text-zinc-50 sm:text-4xl`}>This chunk hasn&apos;t loaded yet</p>
      <Caption>404 — some blocks of this page never made it to the server.</Caption>
    </Frame>
  );
}

/** Загрузка-1 — цветок поворачивается рывками по 90°, как блок. */
export function LoadingTurn() {
  return (
    <Frame>
      <PixelFlower colors={YELLOW_CENTER} className="w-24 animate-[spin_2.4s_steps(4)_infinite] motion-reduce:animate-none" />
      <Caption>Loading…</Caption>
    </Frame>
  );
}

/** Загрузка-2 — веер заливается по кругу. */
export function LoadingFan() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setStep((s) => (s + 1) % 6), 350);
    return () => window.clearInterval(t);
  }, []);
  return (
    <Frame>
      <PixelFan step={step} on="#ff6900" off="#e4e4e7" className="w-28" />
      <Caption>Loading…</Caption>
    </Frame>
  );
}

/** Загрузка-3 — цветок собирается по клеткам, по кругу. */
export function LoadingCells() {
  const cells = useShuffledCells();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setShown((n) => (n >= cells.length + 60 ? 0 : n + 8)), 30);
    return () => window.clearInterval(t);
  }, [cells.length]);
  return (
    <Frame>
      <PartialFlower shown={Math.min(shown, cells.length)} className="w-24" />
      <Caption>Loading…</Caption>
    </Frame>
  );
}

type Fav = { name: string; render: (size: number) => React.ReactNode };

const FAVICONS: Fav[] = [
  {
    name: "Ф1 · Цветок без фона",
    render: (s) => <PixelFlower colors={YELLOW_CENTER} style={{ width: s, height: s }} />,
  },
  {
    name: "Ф2 · Кремовый цветок на оранжевом квадрате",
    render: (s) => (
      <span className="grid place-items-center rounded-[22%] bg-[#ff6900]" style={{ width: s, height: s }}>
        <PixelFlower palette="cream" colors={{ C: "#fed83d", c: "#c6a830" }} style={{ width: s * 0.8, height: s * 0.8 }} />
      </span>
    ),
  },
  {
    name: "Ф3 · Цветок на тёмном квадрате",
    render: (s) => (
      <span className="grid place-items-center rounded-[22%] bg-zinc-950" style={{ width: s, height: s }}>
        <PixelFlower colors={YELLOW_CENTER} style={{ width: s * 0.8, height: s * 0.8 }} />
      </span>
    ),
  },
  {
    name: "Ф4 · Белый веер на оранжевом квадрате",
    render: (s) => (
      <span className="grid place-items-center rounded-[22%] bg-[#ff6900]" style={{ width: s, height: s }}>
        <span className="block" style={{ width: s * 0.75 }}>
          <PixelFan step={5} on="#ffffff" off="#ffffff" className="block w-full" />
        </span>
      </span>
    ),
  },
];

/** Фавиконка во вкладке браузера (светлой и тёмной) и в размерах 16 / 32 / 180. */
function FaviconRow({ fav }: { fav: Fav }) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid gap-4 rounded-3xl border border-zinc-200 p-6 dark:border-zinc-800 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          {["bg-zinc-200 text-zinc-800", "bg-zinc-800 text-zinc-100"].map((tab) => (
            <div key={tab} className={`flex w-72 items-center gap-2 rounded-t-xl px-3 py-2 text-sm ${tab}`}>
              <span className="grid size-4 shrink-0 place-items-center">{fav.render(16)}</span>
              SouCampus builds
            </div>
          ))}
        </div>
        <div className="flex items-end gap-6">
          {[16, 32, 180].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2 text-xs text-zinc-500">
              <span className="grid place-items-center" style={{ width: s, height: s }}>
                {fav.render(s)}
              </span>
              {s}px
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Все фавиконки подряд, с подписями. */
export function FaviconLab() {
  return FAVICONS.map((f) => (
    <div key={f.name}>
      <Label n={f.name.split(" · ")[0]} name={f.name.split(" · ")[1]} />
      <FaviconRow fav={f} />
    </div>
  ));
}
