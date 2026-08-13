"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { SHOP_CATEGORIES, type ProductCategory } from "@/lib/products";

// Фильтр категорий на самой витрине. Раньше категории жили вкладками в
// навбаре — с восемью штуками это перестало помещаться (решение владельца
// 2026-07-30), и место им здесь.
//
// Состояние держит АДРЕС (?category=…), а не useState. Причин две:
// ссылку на «Spawns & hubs» можно отправить или сохранить в закладки, и
// тот же параметр уже читает MarketplaceCatalog — второй источник правды
// неминуемо разъехался бы с первым.
//
// Пилюли, а не выпадающий список: вариантов немного и все влезают, а
// видимый набор избавляет от лишнего клика «открыть, чтобы посмотреть,
// что есть». Выпадашка осталась там, где выбор обязателен и один —
// в форме загрузки карты (SelectField).
const SEARCH_DEBOUNCE_MS = 250;

export function CategoryFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("category");
  const activeQuery = params.get("q") ?? "";

  // Своя строка поиска на витрине — в дополнение к той, что в навбаре.
  //
  // Навбарная не показывает текущий запрос: приходишь по ссылке
  // /marketplace?q=castle, карты отфильтрованы, а поле пустое — выглядит так,
  // будто поиск не сработал. Починить её на месте нельзя дёшево:
  // useSearchParams в навбаре (а он в layout) утянул бы в client-render
  // ВСЕ статические страницы сайта. Здесь мы уже внутри <Suspense> на
  // клиентской витрине, так что запрос читается бесплатно.
  //
  // Правда о запросе — в адресе; SearchField (внизу файла) держит то,
  // что человек набирает. С поиском по мере ввода эти два значения
  // расходятся ровно на время паузы перед запросом и снова сходятся
  // сами — синхронизировать их эффектом (setState в эффекте здесь
  // запрещён линтером, и правильно) не требуется.
  // useCallback здесь не про скорость: SearchField запускает по этим
  // функциям таймер живого поиска, и если бы они пересоздавались на
  // каждый рендер витрины, таймер перезапускался бы вместе с ними.
  //
  // replace для поиска по мере ввода и push для Enter — разница в
  // истории: набранное слово не должно оставлять в ней по шагу на букву,
  // а осознанная отправка запроса шагом быть обязана.
  const applySearch = useCallback(
    (value: string, { replace = false } = {}) => {
      const next = new URLSearchParams(params.toString());
      const trimmed = value.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      const query = next.toString();
      const href = query ? `/marketplace?${query}` : "/marketplace";
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [params, router]
  );

  const submitSearch = useCallback(
    (value: string) => applySearch(value),
    [applySearch]
  );

  const clearSearch = useCallback(() => applySearch(""), [applySearch]);

  const liveSearch = useCallback(
    (value: string) => applySearch(value, { replace: true }),
    [applySearch]
  );

  // Константа живого поиска — та же, что в админке: пауза между словами.


  // Меняем ОДИН параметр, остальные (в частности ?q поиска) сохраняем —
  // иначе выбор категории молча сбрасывал бы поисковый запрос.
  function select(slug: ProductCategory | null) {
    const next = new URLSearchParams(params.toString());
    if (slug) next.set("category", slug);
    else next.delete("category");
    const query = next.toString();
    // scroll: false — список под фильтром обновляется на месте, прыгать
    // к началу страницы при каждом переключении незачем.
    router.push(query ? `/marketplace?${query}` : "/marketplace", { scroll: false });
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
      {/* key={activeQuery} здесь БОЛЬШЕ НЕТ — и это принципиально.
          Он пересоздавал поле при каждой смене ?q, чтобы подтянуть
          запрос из адреса без setState в эффекте. Пока поиск шёл по
          Enter, это было незаметно: адрес менялся один раз, уже после
          ввода. С поиском по мере ввода адрес меняется в процессе
          набора, и пересоздание выбивало бы фокус из поля на каждой
          букве — набрать больше одного символа стало бы невозможно.
          Плата за это: при переходе «назад» текст в поле остаётся
          прежним, хотя список обновляется. */}
      <SearchField
        initialQuery={activeQuery}
        onSubmit={submitSearch}
        onClear={clearSearch}
        onLiveChange={liveSearch}
      />

      {pills}
    </div>
  );
}

// Строка поиска. Отдельный компонент, потому что ей нужно СВОЁ состояние:
// крестик очистки обязан появляться, как только человек начал печатать, а
// не после отправки запроса (замечание владельца 2026-07-31). Раньше он
// висел на activeQuery — то есть на адресе, — и набранный, но не
// отправленный текст стереть было нечем.
//
// Пересоздаётся из CategoryFilter по key={activeQuery}: сменился адрес
// (выбрали категорию, нажали «назад», пришли по ссылке) — поле рождается
// заново с актуальным значением. Это и есть синхронизация с адресом,
// только силами React, без setState в эффекте.
function SearchField({
  initialQuery,
  onSubmit,
  onClear,
  onLiveChange,
}: {
  initialQuery: string;
  onSubmit: (value: string) => void;
  onClear: () => void;
  /** Поиск по мере ввода — тот же переход, но без следа в истории. */
  onLiveChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialQuery);

  // Поиск по мере ввода, а не только по Enter — и, что важнее, при
  // СТИРАНИИ символов: убрав букву, человек ждёт, что список расширится
  // обратно, а не останется на прежней выдаче до нажатия Enter.
  //
  // Сравнение с initialQuery (то, что уже в адресе) не даёт эффекту
  // сработать на собственный результат: после навигации initialQuery
  // становится равен value, и следующий заход выходит сразу.
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === initialQuery) return;

    const timer = setTimeout(() => onLiveChange(trimmed), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, initialQuery, onLiveChange]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
      className="relative w-full sm:max-w-xs"
    >
      <MagnifyingGlass
        size={16}
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
      />
      {/* [&::-webkit-search-cancel-button]:hidden — у type="search"
          браузер рисует СВОЙ крестик очистки поверх нашего: два разных
          крестика в одном поле, оба рабочие, чужой ещё и не в наших
          цветах. Прячем браузерный, оставляем свой — он один умеет
          заодно убрать ?q из адреса. */}
      <input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Search maps and creators"
        placeholder="Search maps or creators"
        className="w-full rounded-full border border-zinc-950/[0.08] bg-transparent py-2.5 pl-10 pr-9 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            // Чистим и поле, и адрес. Второе — только если в адресе
            // действительно что-то было: иначе крестик на ненайденном
            // черновике запроса дёргал бы навигацию впустую.
            setValue("");
            if (initialQuery) onClear();
          }}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <X size={15} weight="bold" />
        </button>
      )}
    </form>
  );
}
