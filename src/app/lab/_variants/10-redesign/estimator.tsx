"use client";

import { SIZE_MAX, SIZE_MIN, useEstimate } from "../../_shared/useEstimate";
import { CONTACT } from "../../_shared/pages";
import s from "./styles.module.css";

// Карточка оценки — наследник BuildEstimator с живого /contact, по аудиту
// redesign-skill: осталось то, ради чего карточка существует (размер → цена
// и срок), ушло то, что отвлекало. Выбор валюты с живыми курсами снят: цена
// на сайте в евро, а список из тридцати валют — самый тяжёлый кусок
// страницы ради декоративного удобства. Две кнопки быстрых размеров
// заменяют «подумай, сколько это блоков».
const PRESETS = [100, 150, 250, 400] as const;

export function EvolvedEstimator() {
  const e = useEstimate(150);

  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_24px_48px_-24px_rgba(28,25,23,0.18)] md:p-8">
      <p className={`${s.display} text-lg font-bold`}>{CONTACT.estimateTitle}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="text-sm text-[var(--muted)]">
          Width, blocks
          <input
            type="number"
            inputMode="numeric"
            min={SIZE_MIN}
            max={SIZE_MAX}
            value={e.width}
            onChange={(ev) => e.setWidth(ev.target.value)}
            className={`${s.field} mt-1.5`}
          />
        </label>
        <label className="text-sm text-[var(--muted)]">
          Length, blocks
          <input
            type="number"
            inputMode="numeric"
            min={SIZE_MIN}
            max={SIZE_MAX}
            value={e.height}
            onChange={(ev) => e.setHeight(ev.target.value)}
            className={`${s.field} mt-1.5`}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Common sizes">
        {PRESETS.map((size) => {
          const on = e.w === size && e.h === size;
          return (
            <button
              key={size}
              type="button"
              aria-pressed={on}
              onClick={() => {
                e.setWidth(String(size));
                e.setHeight(String(size));
              }}
              className={`rounded-full px-3 py-1.5 text-sm tabular-nums transition-colors ${
                on ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {size}×{size}
            </button>
          );
        })}
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[var(--line)]" aria-live="polite">
        <div className="bg-[var(--bg)] p-4">
          <dt className="text-sm text-[var(--muted)]">Price from</dt>
          <dd className={`${s.display} mt-1 text-3xl font-extrabold tabular-nums tracking-[-0.03em] text-[var(--accent-text)]`}>{e.priceLabel}</dd>
        </div>
        <div className="bg-[var(--bg)] p-4">
          <dt className="text-sm text-[var(--muted)]">Timeline</dt>
          <dd className={`${s.display} mt-1 text-3xl font-extrabold tracking-[-0.03em]`}>{e.deadline}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-[var(--muted)]">{CONTACT.estimateNote}</p>
    </div>
  );
}
