"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretDown, Check, FunnelSimple, X } from "@phosphor-icons/react";
import {
  FILE_FORMATS,
  GAME_MODES,
  MAP_SIZES,
  MAP_TYPES,
  MC_VERSIONS,
  THEMES,
} from "@/lib/product-specs";
import { SORT_OPTIONS } from "@/lib/products";
import { BUTTON_COLORS, TERTIARY_COLORS } from "@/components/Button";
import {
  activeFilterCount,
  CATALOG_PARAMS,
  readCatalogQuery,
} from "@/lib/catalog-params";

// Фильтры витрины — В ПОПАПЕ, а не рядами пилюль на странице (решение
// владельца 2026-08-26; до этого здесь был один ряд пилюль по цене).
//
// Довод простой: полей стало семь. Разложенные по странице, они заняли бы
// больше места, чем сам каталог, и оттеснили бы карты вниз — а человек
// пришёл смотреть карты, а не настройки. В попапе видно только то, что он
// открыл сам, а сколько условий наложено, показывает число на кнопке.
//
// СОСТОЯНИЕ ЖИВЁТ В ДВУХ МЕСТАХ, И ЭТО НЕ ОШИБКА:
//   — адрес хранит ПРИМЕНЁННОЕ (его читает каталог, им делятся ссылкой);
//   — draft ниже хранит НАБРАННОЕ, пока попап открыт.
// Разделение нужно из-за полей цены: навигация на каждую нажатую цифру
// перезагружала бы список на «1», «12», «120». Поэтому здесь кнопка
// Apply, а не поиск по мере ввода, как в строке поиска рядом.

type Draft = {
  sort: string;
  min: string;
  max: string;
  values: Record<string, string[]>;
};

// Поля-наборы списком, а не шестью кусками разметки: одинаковые вещи,
// написанные шесть раз, разъезжаются — это в проекте уже случалось с
// градиентом и с датами.
const MULTI_FIELDS: {
  param: string;
  label: string;
  options: readonly string[];
}[] = [
  {
    param: CATALOG_PARAMS.mcVersions,
    label: "Minecraft version",
    options: MC_VERSIONS,
  },
  { param: CATALOG_PARAMS.formats, label: "File format", options: FILE_FORMATS },
  { param: CATALOG_PARAMS.mapTypes, label: "Map type", options: MAP_TYPES },
  { param: CATALOG_PARAMS.gameModes, label: "Game mode", options: GAME_MODES },
  { param: CATALOG_PARAMS.mapSizes, label: "Size", options: MAP_SIZES },
  { param: CATALOG_PARAMS.themes, label: "Theme", options: THEMES },
];

// Подпись поля и само поле — на уровне модуля, а не внутри панели: те же
// классы нужны выпадашке сортировки (SortSelect внизу файла), и вторая
// копия строки разъехалась бы с первой при первой же правке.
const LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";
const FIELD_CLASS =
  "w-full rounded-xl border border-zinc-950/[0.08] bg-transparent px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500";

function draftFromParams(params: URLSearchParams): Draft {
  const query = readCatalogQuery(params);
  return {
    sort: query.sort ?? "",
    min: query.minRaw,
    max: query.maxRaw,
    values: {
      [CATALOG_PARAMS.mcVersions]: query.specs.mcVersions,
      [CATALOG_PARAMS.formats]: query.specs.formats,
      [CATALOG_PARAMS.mapTypes]: query.specs.mapTypes,
      [CATALOG_PARAMS.gameModes]: query.specs.gameModes,
      [CATALOG_PARAMS.mapSizes]: query.specs.mapSizes,
      [CATALOG_PARAMS.themes]: query.specs.themes,
    },
  };
}

export function MarketplaceFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const count = activeFilterCount(readCatalogQuery(params));

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative flex h-[42px] cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
          count > 0
            ? "border-orange-500 text-orange-700 dark:border-orange-400 dark:text-orange-400"
            : "border-zinc-950/[0.08] text-zinc-600 hover:border-orange-500 hover:text-orange-600 dark:border-zinc-50/[0.08] dark:text-zinc-400 dark:hover:border-orange-400 dark:hover:text-orange-400"
        }`}
      >
        <FunnelSimple size={18} weight={count > 0 ? "fill" : "regular"} />
        <span>Filters</span>
        {/* Число — только когда есть что показать. Постоянный «0» на
            кнопке приучает глаз её не замечать. */}
        {count > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-zinc-950">
            {count}
          </span>
        )}
      </button>

      {open && (
        // key пересоздаёт панель на каждую смену адреса, поэтому черновик
        // рождается из актуальных параметров и синхронизировать его
        // эффектом не требуется.
        <FilterPanel
          key={params.toString()}
          initial={draftFromParams(params)}
          params={params}
          onClose={() => setOpen(false)}
          onApply={(href) => {
            setOpen(false);
            router.push(href, { scroll: false });
          }}
        />
      )}
    </div>
  );
}

function FilterPanel({
  initial,
  params,
  onClose,
  onApply,
}: {
  initial: Draft;
  params: URLSearchParams;
  onClose: () => void;
  onApply: (href: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const panelRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику мимо и по Escape. Оба обязательны: попап
  // перекрывает каталог, и передумавший его открывать не должен искать
  // крестик.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current) return;
      const target = event.target as Node;
      // Клик по самой кнопке-триггеру пропускаем: она сама переключает
      // состояние, и закрытие отсюда сработало бы вторым разом, снова
      // открыв панель.
      if (panelRef.current.parentElement?.contains(target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function toggle(param: string, value: string) {
    setDraft((prev) => {
      const current = prev.values[param] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, values: { ...prev.values, [param]: next } };
    });
  }

  function buildHref(next: Draft | null): string {
    // Начинаем с ТЕКУЩЕГО адреса, а не с пустого: попап отвечает только
    // за фильтры, а рядом живут ?category, ?collection и ?q — стереть их
    // означало бы выбросить человека из списка, который он смотрит.
    const search = new URLSearchParams(params.toString());

    const set = (key: string, value: string) => {
      if (value) search.set(key, value);
      else search.delete(key);
    };

    if (next) {
      set(CATALOG_PARAMS.sort, next.sort);
      set(CATALOG_PARAMS.min, next.min.trim());
      set(CATALOG_PARAMS.max, next.max.trim());
      for (const field of MULTI_FIELDS) {
        set(field.param, (next.values[field.param] ?? []).join(","));
      }
    } else {
      // Сброс снимает только свои параметры — список остаётся тем же.
      search.delete(CATALOG_PARAMS.sort);
      search.delete(CATALOG_PARAMS.min);
      search.delete(CATALOG_PARAMS.max);
      for (const field of MULTI_FIELDS) search.delete(field.param);
    }

    // Фильтр применён — значит человек просит СПИСОК, а на главной
    // витрине списка нет, там ряды подборок. Поэтому если не выбрано ни
    // категории, ни подборки, ни поиска, переводим в «все карты»: иначе
    // он нажал бы Apply и не увидел ровно никаких изменений.
    const hasList =
      search.has("category") || search.has("collection") || search.has("q");
    const hasFilters = [...search.keys()].some(
      (key) =>
        key !== "category" &&
        key !== "collection" &&
        key !== "q" &&
        key !== CATALOG_PARAMS.sort
    );
    if (!hasList && hasFilters) search.set("collection", "all");

    const query = search.toString();
    return query ? `/marketplace?${query}` : "/marketplace";
  }

  const labelClass = LABEL_CLASS;
  const fieldClass = FIELD_CLASS;
  const chip =
    "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";
  const chipOff =
    "border-zinc-950/[0.08] text-zinc-600 hover:border-orange-500 hover:text-orange-600 dark:border-zinc-50/[0.08] dark:text-zinc-400 dark:hover:border-orange-400 dark:hover:text-orange-400";
  const chipOn =
    "border-orange-500 bg-orange-500 text-zinc-950 dark:border-orange-400 dark:bg-orange-400";

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Filters"
      // Стекло по рецепту из DESIGN.md — тот же, что у выпадашки профиля
      // в навбаре: панель плавает над каталогом, под ней есть чему
      // просвечивать и размываться.
      className="absolute right-0 z-40 mt-2 max-h-[70vh] w-[min(24rem,calc(100vw-3rem))] overflow-y-auto rounded-2xl border border-white/60 bg-[#fbfbff]/90 p-5 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 backdrop-brightness-110 dark:border-white/10 dark:bg-zinc-900/90 dark:backdrop-brightness-75"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Filters
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className="cursor-pointer rounded-full p-1 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* Сортировка первой: она отвечает на «в каком порядке» и
          единственная здесь ничего не прячет. */}
      <div className="mt-5">
        <span className={labelClass}>Sort by</span>
        <SortSelect
          value={draft.sort}
          onChange={(value) => setDraft((prev) => ({ ...prev, sort: value }))}
        />
      </div>

      <div className="mt-5">
        <span className={labelClass}>Price, €</span>
        <div className="mt-2 flex items-center gap-2">
          {/* inputMode="decimal" — на телефоне открывается цифровая
              клавиатура. type="number" не берём: он рисует свои стрелки и
              по-разному ведёт себя с запятой в разных браузерах. */}
          <input
            value={draft.min}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, min: event.target.value }))
            }
            inputMode="decimal"
            placeholder="from"
            aria-label="Minimum price in euros"
            className={fieldClass}
          />
          <span className="text-zinc-400">—</span>
          <input
            value={draft.max}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, max: event.target.value }))
            }
            inputMode="decimal"
            placeholder="to"
            aria-label="Maximum price in euros"
            className={fieldClass}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Both ends are inclusive. Leave a field empty for no limit.
        </p>
      </div>

      {MULTI_FIELDS.map((field) => (
        <div key={field.param} className="mt-5">
          <span className={labelClass}>{field.label}</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {field.options.map((option) => {
              const on = (draft.values[field.param] ?? []).includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(field.param, option)}
                  className={`${chip} ${on ? chipOn : chipOff}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Кнопки прилипают к низу: полей семь, панель прокручивается, и
          Apply не должен уезжать из виду вместе с ними. */}
      <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex items-center gap-3 border-t border-zinc-950/[0.06] bg-[#fbfbff]/90 px-5 py-4 backdrop-blur-xl dark:border-zinc-50/[0.08] dark:bg-zinc-900/90">
        {/* Раскраска из BUTTON_COLORS, а геометрия своя: фиксированная
            высота h-12/h-14 из Button не влезает в подвал панели. Это тот
            самый случай, ради которого раскраска и вынесена отдельно —
            копировать оранжевые классы руками значило бы завести второе
            место, где живёт цвет кнопки. */}
        <button
          type="button"
          onClick={() => onApply(buildHref(draft))}
          className={`flex-1 cursor-pointer px-4 py-2.5 text-sm font-semibold transition-colors ${BUTTON_COLORS.primary}`}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => onApply(buildHref(null))}
          className={`cursor-pointer px-2 py-2.5 text-sm font-medium transition-colors ${TERTIARY_COLORS}`}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// Выпадашка сортировки. Своя, а не <select> (замечание владельца
// 2026-08-26).
//
// ⚠️ Причина не в придирке к вкусу: НАТИВНЫЙ СПИСОК РИСУЕТ ОПЕРАЦИОННАЯ
// СИСТЕМА, и покрасить его нельзя в принципе. Классы Tailwind доходят до
// закрытого поля и обрываются на нём — раскрытый список приезжает с
// системным синим выделением, системным шрифтом и белым фоном даже в
// тёмной теме. Это единственное место в интерфейсе, где наши правила
// цвета просто не действуют.
//
// Плата за свой список — доступность, которую <select> давал даром:
// здесь она сделана руками (role="listbox"/"option", aria-selected,
// закрытие по Escape и по клику мимо). Стрелками с клавиатуры список
// пока не листается — если понадобится, добавлять сюда, а не заводить
// второй компонент.
//
// Выпадашка в форме загрузки карты (SelectField) остаётся нативной
// намеренно: там выбор обязателен и происходит один раз, а здесь список
// открывают, чтобы посмотреть варианты.
function SortSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Пустое значение — «как решил список»: у подборки «Most popular» свой
  // порядок, и не выбрать сортировку значит оставить его.
  const options = [{ slug: "", label: "Default for this list" }, ...SORT_OPTIONS];
  const current = options.find((option) => option.slug === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex cursor-pointer items-center justify-between gap-2 text-left ${FIELD_CLASS} ${
          open ? "border-orange-500 dark:border-orange-400" : ""
        }`}
      >
        <span className="truncate">{current.label}</span>
        <CaretDown
          size={14}
          weight="bold"
          aria-hidden
          className={`shrink-0 text-zinc-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        // Тот же рецепт стекла, что у выпадашки профиля в навбаре
        // (DESIGN.md → «Стекло»). max-h: список из восьми строк должен
        // уметь прокручиваться сам, а не растягивать панель фильтров.
        <ul
          role="listbox"
          aria-label="Sort by"
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto overflow-x-hidden rounded-xl border border-white/60 bg-[#fbfbff]/95 py-1 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-900/95"
        >
          {options.map((option) => {
            const selected = option.slug === value;
            return (
              <li key={option.slug || "default"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.slug);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-950/[0.05] dark:hover:bg-zinc-50/[0.06] ${
                    selected
                      ? "font-semibold text-orange-700 dark:text-orange-400"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {/* Галочка, а не только цвет: выбранное должно быть
                      видно и тому, кто не различает оранжевый. */}
                  {selected && <Check size={14} weight="bold" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
