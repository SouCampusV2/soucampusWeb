"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

// Поиск и фильтр состояния для каталога админки.
//
// Состояние живёт в адресе (?q=, ?state=), а не в компоненте: так
// отфильтрованный список можно оставить открытым во вкладке, вернуться к
// нему кнопкой «назад» и переслать себе ссылкой. Страница серверная и
// читает те же параметры.
//
// Значения — ровно те же слова, что в колонке `state`. Раньше их было
// пять на четыре колонки, и два из них («hidden», «published») в базе не
// существовали вовсе: страница переводила их в условия по двум полям.
// Теперь фильтр и база говорят на одном языке.
const FILTERS = [
  { value: "", label: "All" },
  { value: "live", label: "Live" },
  { value: "pending", label: "In review" },
  { value: "suspended", label: "Taken down" },
  { value: "hidden", label: "Hidden by author" },
  { value: "rejected", label: "Rejected" },
  { value: "deleted", label: "Deleted" },
];

// Сколько ждать после последнего нажатия клавиши, прежде чем идти в
// базу. 250мс — примерно пауза между словами: за время набора «cathedral»
// уходит один запрос, а не девять, но на глаз задержки не видно.
const SEARCH_DEBOUNCE_MS = 250;

export function CatalogFilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const currentState = params.get("state") ?? "";
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  function apply(next: { q?: string; state?: string }) {
    const search = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    // Клик по фильтру и Enter — push: это осознанные переходы, и им
    // место в истории. Живой поиск по мере ввода идёт через replace,
    // см. эффект ниже.
    router.push(`/admin/products?${search.toString()}`);
  }

  // Поиск по мере ввода, а не только по Enter. Стирание символов —
  // такое же изменение запроса, как их добавление: очистив поле, человек
  // ждёт полный список, а не тот же отфильтрованный, что был.
  //
  // Круга здесь не возникает, хотя эффект и зависит от адреса, который
  // сам же меняет: сравнение с urlQuery гасит второй заход. Набрали
  // текст → он разошёлся с адресом → уходим в replace → urlQuery стал
  // равен query → эффект пробуждается и сразу выходит.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === urlQuery) return;

    const timer = setTimeout(() => {
      const search = new URLSearchParams();
      if (trimmed) search.set("q", trimmed);
      if (currentState) search.set("state", currentState);
      // replace, а не push: иначе каждая буква становится шагом истории
      // и «назад» приходится жать столько раз, сколько символов набрал.
      router.replace(`/admin/products?${search.toString()}`);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, urlQuery, currentState, router]);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: query, state: currentState });
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
              apply({ q: "", state: currentState });
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
            onClick={() => apply({ q: query, state: f.value })}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              currentState === f.value
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
