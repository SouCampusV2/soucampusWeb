"use client";

import { useState } from "react";
import { Eye } from "@phosphor-icons/react";
import type { SiteViews as SiteViewsData } from "@/lib/views";

// Порядок кнопок — от общего к частному, слева направо: сначала итог за
// всё время (значение по умолчанию), потом всё более узкие срезы.
const PERIODS = [
  { key: "all_time", label: "All time" },
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "today", label: "Today" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

/**
 * Уникальные посетители всего сайта + переключатель периода.
 *
 * Клиентский компонент, потому что здесь есть состояние — выбранный
 * период. Но в сеть он не ходит: все четыре числа приезжают пропсом,
 * посчитанные на сервере, и переключение мгновенное.
 */
export function SiteViews({ views }: { views: SiteViewsData }) {
  const [period, setPeriod] = useState<PeriodKey>("all_time");

  // Пока на сайте не было ни одного посетителя, показывать "0 Visitors"
  // с переключателем незачем — это выглядит как сломанный виджет.
  if (!views.all_time) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="inline-flex items-center gap-2 text-sm leading-none text-zinc-500 dark:text-zinc-400">
        <Eye size={18} weight="duotone" aria-hidden className="shrink-0" />
        <span className="font-semibold tabular-nums">
          {views[period].toLocaleString("en-US")}
        </span>
        <span className="opacity-70">Visitors</span>
      </span>

      {/* Сегментированный переключатель: одна общая подложка, активная
          кнопка — светлая "таблетка" внутри неё. Так видно, что варианты
          взаимоисключающие, в отличие от набора отдельных кнопок. */}
      <div
        role="group"
        aria-label="Period"
        className="inline-flex rounded-full bg-zinc-950/[0.04] p-0.5 dark:bg-zinc-50/[0.06]"
      >
        {PERIODS.map((p) => {
          const active = p.key === period;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={active}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-[#fbfbff] text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
