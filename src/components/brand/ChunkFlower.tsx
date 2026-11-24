"use client";

// Цветок SouCampus, который «не догрузился», как чанк в игре: клетки
// появляются в случайном порядке и застревают на `upTo` доле. Стоит
// вместо «0» на странице 404 (выбрано в лаборатории бренда 16.11).
//
// Порядок клеток случайный, но постоянный (своё зерно), — у каждого
// посетителя одна и та же картинка. При prefers-reduced-motion — сразу
// конечный вид, без появления.
import { useEffect, useMemo, useState } from "react";
import flowerStamps from "../../../public/brand/pixel/flower-stamps.json";
import { PixelGrid } from "@/components/brand/PixelArt";

const ROWS = flowerStamps.stamps.flower32.rows;
// Оранжевый цветок с жёлтой серединкой — как в навбаре и на фавиконке.
const COLORS: Record<string, string> = { ...flowerStamps.palettes.orange, C: "#fed83d", c: "#c6a830" };

/** Клетки цветка в перемешанном порядке (Парк — Миллер, зерно 7). */
function shuffledCells() {
  const cells: string[] = [];
  ROWS.forEach((r, y) => [...r].forEach((c, x) => c !== "." && cells.push(`${x},${y}`)));
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}

// Один порядок на всех — считается один раз, при загрузке модуля.
const CELLS = shuffledCells();

export function ChunkFlower({ upTo = 0.7, className }: { upTo?: number; className?: string }) {
  const stop = Math.round(CELLS.length * upTo);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setShown(stop));
      return () => window.clearTimeout(t);
    }
    const t = window.setInterval(() => setShown((n) => Math.min(stop, n + 6)), 30);
    return () => window.clearInterval(t);
  }, [stop]);

  const rows = useMemo(() => {
    const on = new Set(CELLS.slice(0, shown));
    return ROWS.map((r, y) => [...r].map((c, x) => (on.has(`${x},${y}`) ? c : ".")).join(""));
  }, [shown]);

  return <PixelGrid rows={rows} color={(c) => COLORS[c] ?? null} className={className} />;
}
