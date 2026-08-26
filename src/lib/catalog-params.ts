import {
  eurosToCents,
  SORT_OPTIONS,
  type SortOption,
  type SpecFilters,
} from "@/lib/products";

// Разбор фильтров витрины из адреса — ОДНО место на весь магазин.
//
// Читателей у этих параметров двое: попап фильтров (показывает, что
// сейчас выбрано) и каталог (отбирает карты). Пока каждый разбирал адрес
// сам, расхождение было вопросом времени — ровно та болезнь, что уже
// ловилась с сортировкой подборок и с формулой видимости карты.
//
// ⚠️ Здесь НЕТ проверки значений по словарям из product-specs.ts, и это
// сознательно. Словарь там — про вкус, он пополняется без миграции, а в
// карте, залитой раньше, может стоять значение вне словаря. Отфильтровав
// «неизвестное» значение, мы сделали бы такую карту ненаходимой её же
// собственной характеристикой. Единственная защита, которая тут нужна, —
// от объёма: длинный адрес не должен превращаться в тысячу сравнений.

/** Имена параметров. Строками их писать нельзя — разъедутся. */
export const CATALOG_PARAMS = {
  sort: "sort",
  min: "min",
  max: "max",
  mcVersions: "mc",
  formats: "fmt",
  mapTypes: "type",
  gameModes: "mode",
  mapSizes: "size",
  themes: "theme",
} as const;

// Сколько значений принимаем в одном поле. Больше в интерфейсе выбрать
// нельзя — столько просто нет в словарях; ограничение стоит против
// адреса, собранного руками.
const MAX_VALUES_PER_FIELD = 40;

export type CatalogQuery = {
  sort: SortOption | null;
  minCents: number | null;
  maxCents: number | null;
  /** То, что человек ввёл, — для показа в полях попапа. */
  minRaw: string;
  maxRaw: string;
  specs: SpecFilters;
};

function readList(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_VALUES_PER_FIELD);
}

export function readCatalogQuery(params: URLSearchParams): CatalogQuery {
  const rawSort = params.get(CATALOG_PARAMS.sort);
  const sort = SORT_OPTIONS.some((o) => o.slug === rawSort)
    ? (rawSort as SortOption)
    : null;

  const minRaw = params.get(CATALOG_PARAMS.min) ?? "";
  const maxRaw = params.get(CATALOG_PARAMS.max) ?? "";

  return {
    sort,
    minCents: eurosToCents(minRaw),
    maxCents: eurosToCents(maxRaw),
    minRaw,
    maxRaw,
    specs: {
      mcVersions: readList(params, CATALOG_PARAMS.mcVersions),
      formats: readList(params, CATALOG_PARAMS.formats),
      mapTypes: readList(params, CATALOG_PARAMS.mapTypes),
      gameModes: readList(params, CATALOG_PARAMS.gameModes),
      mapSizes: readList(params, CATALOG_PARAMS.mapSizes),
      themes: readList(params, CATALOG_PARAMS.themes),
    },
  };
}

/**
 * Сколько условий сейчас наложено — число на иконке фильтра.
 *
 * Сортировка сюда НЕ входит: она не сужает список, а меняет порядок.
 * Показать «2» человеку, который всего лишь переставил карты по цене,
 * значило бы обещать спрятанные карты, которых нет.
 *
 * Цена считается за ОДНО условие, даже если заполнены обе границы:
 * человек задал один диапазон, а не два требования.
 */
export function activeFilterCount(query: CatalogQuery): number {
  const specCount = Object.values(query.specs).filter(
    (values) => values.length > 0,
  ).length;
  const priceCount = query.minRaw.trim() || query.maxRaw.trim() ? 1 : 0;
  return specCount + priceCount;
}

/** Пусто ли — то же самое, но без счёта. Для «Reset» и подписей. */
export function hasActiveFilters(query: CatalogQuery): boolean {
  return activeFilterCount(query) > 0 || query.sort !== null;
}
