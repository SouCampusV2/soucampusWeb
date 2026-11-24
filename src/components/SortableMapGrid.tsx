"use client";

import { useState } from "react";
import { TOGGLE_PILL_COLORS } from "@/components/Button";

// Карты на профиле автора с сортировкой (24.11, просьба владельца: «по
// умолчанию от новых к старым», раньше порядок был непонятный).
//
// Карточки рисует СЕРВЕР и отдаёт сюда готовыми (node) — ProductCard
// серверный и со шрифтом, тащить его в браузер ради смены порядка
// незачем. Здесь только порядок: страница профиля собирается заранее, и
// сортировка через ?sort= в адресе сделала бы её динамической.

export type SortableMap = {
  slug: string;
  createdAt: string;
  sales: number;
  rating: number;
  ratingCount: number;
  priceCents: number;
  node: React.ReactNode;
};

const SORTS = {
  newest: { label: "Newest", by: (a: SortableMap, b: SortableMap) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0) },
  popular: { label: "Popular", by: (a: SortableMap, b: SortableMap) => b.sales - a.sales },
  rated: {
    label: "Top rated",
    // Без оценок — в конец, а не наверх с нулём.
    by: (a: SortableMap, b: SortableMap) => (b.ratingCount > 0 ? b.rating : -1) - (a.ratingCount > 0 ? a.rating : -1),
  },
  cheap: { label: "Price ↑", by: (a: SortableMap, b: SortableMap) => a.priceCents - b.priceCents },
  pricey: { label: "Price ↓", by: (a: SortableMap, b: SortableMap) => b.priceCents - a.priceCents },
} as const;

type SortKey = keyof typeof SORTS;

export function SortableMapGrid({ maps }: { maps: SortableMap[] }) {
  const [sort, setSort] = useState<SortKey>("newest");
  const sorted = [...maps].sort(SORTS[sort].by);

  return (
    <div>
      {/* Сортировка нужна, когда есть что сортировать. */}
      {maps.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Sort maps">
          {(Object.keys(SORTS) as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                sort === key ? TOGGLE_PILL_COLORS.on : TOGGLE_PILL_COLORS.off
              }`}
            >
              {SORTS[key].label}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((m) => (
          <div key={m.slug} className="h-full">
            {m.node}
          </div>
        ))}
      </div>
    </div>
  );
}
