"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "@phosphor-icons/react";
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

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2">
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

      {/* Сброс поиска — отдельно от категорий: строка поиска живёт в
          навбаре, и без этой кнопки очистить запрос со страницы нечем. */}
      {params.get("q") && (
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.delete("q");
            const query = next.toString();
            router.push(query ? `/shop?${query}` : "/shop", { scroll: false });
          }}
          className="ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
        >
          <X size={14} weight="bold" />
          Clear “{params.get("q")}”
        </button>
      )}
    </div>
  );
}
