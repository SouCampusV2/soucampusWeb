"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PERIOD_PRESETS, type Range } from "@/lib/analytics";

// Переключатель периода над графиком продаж.
//
// Текущий период приходит ПРОПСОМ, а не читается через useSearchParams:
// разбирает адрес всё равно сервер (resolveRange), и второе чтение на
// клиенте означало бы две разные правды об одном и том же — например,
// при мусоре в параметрах сервер откатывается к 30 дням, а кнопка
// подсвечивала бы то, что написано в URL.
//
// Переход через router.push, а не <Link>: сюда же ходит форма своих дат,
// и оба пути должны собирать адрес одинаково.
export function PeriodPicker({ range }: { range: Range }) {
  const router = useRouter();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  // Свой отрезок «активен» только когда он не совпадает ни с одной
  // кнопкой-пресетом — иначе подсветятся сразу двое.
  const preset = PERIOD_PRESETS.find((d) => d === range.days && isToToday(range));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        {PERIOD_PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => router.push(`/admin?days=${days}`)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors pointer-coarse:px-4 pointer-coarse:py-2.5 ${
              preset === days
                ? "border-orange-500 bg-orange-500 font-medium text-zinc-950"
                : "border-zinc-200 text-zinc-600 hover:border-orange-500 dark:border-zinc-800 dark:text-zinc-400"
            }`}
          >
            {label(days)}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/admin?from=${from}&to=${to}`);
        }}
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From"
          className="rounded-lg border border-zinc-200 bg-transparent px-2 py-1 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
        />
        <span className="text-zinc-500 dark:text-zinc-400">→</span>
        <input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To"
          className="rounded-lg border border-zinc-200 bg-transparent px-2 py-1 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
        />
        <button
          type="submit"
          disabled={from > to}
          className={`cursor-pointer rounded-full border px-3 py-1 transition-colors ${
            preset === undefined
              ? "border-orange-500 font-medium text-orange-600 dark:text-orange-400"
              : "border-zinc-200 text-zinc-600 hover:border-orange-500 dark:border-zinc-800 dark:text-zinc-400"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Apply
        </button>
      </form>
    </div>
  );
}

function isToToday(range: Range): boolean {
  return range.to === new Date().toISOString().slice(0, 10);
}

function label(days: number): string {
  if (days === 365) return "12 months";
  if (days % 30 === 0) return `${days / 30} months`;
  return `${days} days`;
}
