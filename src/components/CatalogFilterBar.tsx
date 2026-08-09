"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

// Поиск и фильтр статуса для каталога админки.
//
// Состояние живёт в адресе (?q=, ?status=), а не в компоненте: так
// отфильтрованный список можно оставить открытым во вкладке, вернуться к
// нему кнопкой «назад» и переслать себе ссылкой. Страница серверная и
// читает те же параметры.
const FILTERS = [
  { value: "", label: "All" },
  { value: "published", label: "Live" },
  { value: "pending", label: "In review" },
  { value: "hidden", label: "Taken down" },
  { value: "rejected", label: "Rejected" },
  { value: "deleted", label: "Deleted" },
];

export function CatalogFilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const currentStatus = params.get("status") ?? "";
  const [query, setQuery] = useState(params.get("q") ?? "");

  function apply(next: { q?: string; status?: string }) {
    const search = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    router.push(`/admin/products?${search.toString()}`);
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: query, status: currentStatus });
        }}
        className="relative min-w-[16rem] flex-1"
      >
        <MagnifyingGlass
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title, slug or creator"
          aria-label="Search the catalog"
          // type="text", а не "search": браузер рисует у search-полей
          // собственный крестик, и рядом с нашим их получалось два (эту
          // же ошибку уже ловили на витрине магазина).
          type="text"
          className="w-full rounded-full border border-zinc-950/[0.08] py-2 pl-9 pr-9 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:bg-zinc-900"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              apply({ q: "", status: currentStatus });
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={14} weight="bold" />
          </button>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => apply({ q: query, status: f.value })}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              currentStatus === f.value
                ? "bg-orange-500 text-zinc-950 dark:bg-orange-400"
                : "text-zinc-600 hover:bg-zinc-950/[0.05] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
