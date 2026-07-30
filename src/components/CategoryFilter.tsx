"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { SHOP_CATEGORIES, type ProductCategory } from "@/lib/products";

// Фильтр категорий на самой витрине. Раньше категории жили вкладками в
// навбаре — с восемью штуками это перестало помещаться (решение владельца
// 2026-07-30), и место им здесь.
//
// Состояние держит АДРЕС (?category=…), а не useState. Причин две:
// ссылку на «Spawns & hubs» можно отправить или сохранить в закладки, и
// тот же параметр уже читает ShopCatalog — второй источник правды
// неминуемо разъехался бы с первым.
//
// Пилюли, а не выпадающий список: вариантов немного и все влезают, а
// видимый набор избавляет от лишнего клика «открыть, чтобы посмотреть,
// что есть». Выпадашка осталась там, где выбор обязателен и один —
// в форме загрузки карты (SelectField).
export function CategoryFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("category");
  const activeQuery = params.get("q") ?? "";

  // Своя строка поиска на витрине — в дополнение к той, что в навбаре.
  //
  // Навбарная не показывает текущий запрос: приходишь по ссылке
  // /shop?q=castle, карты отфильтрованы, а поле пустое — выглядит так,
  // будто поиск не сработал. Починить её на месте нельзя дёшево:
  // useSearchParams в навбаре (а он в layout) утянул бы в client-render
  // ВСЕ статические страницы сайта. Здесь мы уже внутри <Suspense> на
  // клиентской витрине, так что запрос читается бесплатно.
  //
  // Поле НЕконтролируемое, и это осознанно. Правда о запросе — в адресе;
  // держать её ещё и в useState значит синхронизировать две копии
  // эффектом, а setState в эффекте в этом проекте запрещён линтером (и
  // правильно: лишний рендер плюс мигание). key={activeQuery} решает то
  // же самое силами React — сменился адрес, поле пересоздалось с новым
  // значением, и синхронизировать нечего.
  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const value = new FormData(form).get("q");
    const next = new URLSearchParams(params.toString());
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    const query = next.toString();
    router.push(query ? `/shop?${query}` : "/shop", { scroll: false });
  }

  // Меняем ОДИН параметр, остальные (в частности ?q поиска) сохраняем —
  // иначе выбор категории молча сбрасывал бы поисковый запрос.
  function select(slug: ProductCategory | null) {
    const next = new URLSearchParams(params.toString());
    if (slug) next.set("category", slug);
    else next.delete("category");
    const query = next.toString();
    // scroll: false — список под фильтром обновляется на месте, прыгать
    // к началу страницы при каждом переключении незачем.
    router.push(query ? `/shop?${query}` : "/shop", { scroll: false });
  }

  const pill =
    "cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors";
  const inactive =
    "border-zinc-950/[0.08] text-zinc-600 hover:border-orange-500 hover:text-orange-600 dark:border-zinc-50/[0.08] dark:text-zinc-400 dark:hover:border-orange-400 dark:hover:text-orange-400";
  const selected =
    "border-orange-500 bg-orange-500 text-zinc-950 dark:border-orange-400 dark:bg-orange-400";

  const pills = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => select(null)}
        className={`${pill} ${active === null ? selected : inactive}`}
      >
        All maps
      </button>

      {SHOP_CATEGORIES.map((category) => (
        <button
          key={category.slug}
          type="button"
          onClick={() => select(category.slug)}
          className={`${pill} ${active === category.slug ? selected : inactive}`}
        >
          {category.label}
        </button>
      ))}

    </div>
  );

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse sm:items-start sm:justify-between sm:gap-6">
      {/* Поиск справа на широком экране, сверху на узком: на телефоне
          набирать удобнее сразу, а не после прокрутки списка категорий. */}
      <form onSubmit={submitSearch} className="relative w-full sm:max-w-xs">
        <MagnifyingGlass
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
        />
        <input
          key={activeQuery}
          type="search"
          name="q"
          defaultValue={activeQuery}
          aria-label="Search maps and creators"
          placeholder="Search maps or creators"
          className="w-full rounded-full border border-zinc-950/[0.08] bg-transparent py-2.5 pl-10 pr-9 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        {activeQuery && (
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params.toString());
              next.delete("q");
              const query = next.toString();
              router.push(query ? `/shop?${query}` : "/shop", { scroll: false });
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            <X size={15} weight="bold" />
          </button>
        )}
      </form>

      {pills}
    </div>
  );
}
