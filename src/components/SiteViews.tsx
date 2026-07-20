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
      <span className="inline-flex items-center gap-1.5 text-xs leading-4 text-zinc-500 dark:text-zinc-400">
        {/* fill, а не duotone — у duotone поверх заливки идёт обводка, и
            на мелком размере она читается как ореол вокруг иконки. */}
        <Eye size={14} weight="fill" aria-hidden className="shrink-0" />
        <span className="font-semibold tabular-nums">
          {views[period].toLocaleString("en-US")}
        </span>
        <span className="uppercase tracking-wide opacity-60">Visitors</span>
      </span>

      {/* Сегментированный переключатель в стиле навбара (DESIGN.md):
          pill-капсула, стеклянная полупрозрачная подложка с backdrop-blur
          и очень лёгкая обводка, без тени. Одна общая подложка на все
          варианты показывает, что они взаимоисключающие.
          Активный — оранжевый, по правилу "акцент действия всегда orange",
          и по общей схеме кнопок: 500 в светлой теме, 400 в тёмной. */}
      <div
        role="group"
        aria-label="Period"
        className="inline-flex rounded-full border border-zinc-950/[0.06] bg-[#fbfbff]/70 p-1 backdrop-blur-xl dark:border-zinc-50/[0.08] dark:bg-zinc-950/70"
      >
        {PERIODS.map((p) => {
          const active = p.key === period;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={active}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "bg-orange-500 text-zinc-950 dark:bg-orange-400"
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
