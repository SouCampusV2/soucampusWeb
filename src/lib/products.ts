import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { getCreatorsById } from "@/lib/creators";

// Категории витрины. ВРЕМЕННО: пока в БД нет колонки category, категорию
// выводим детерминированно из slug (deriveCategory ниже) — «случайно, но
// стабильно»: у товара всегда одна и та же категория, между рендерами не
// прыгает. Когда появится реальная колонка (подэтап маркетплейса), заменить
// derive на row.category — тип Product и фильтрация на витрине не изменятся.
// «Free» — не тег, а факт цены: цена 0 (см. filterByCategory).
export type ProductCategory =
  | "spawn"
  | "adventure"
  | "minigame"
  | "building"
  | "interior"
  | "landscape"
  | "assets"
  | "free";

export const SHOP_CATEGORIES: { slug: ProductCategory; label: string }[] = [
  { slug: "spawn", label: "Spawns & hubs" },
  { slug: "adventure", label: "Adventure & RPG" },
  { slug: "minigame", label: "Minigames & PvP" },
  { slug: "building", label: "Buildings" },
  { slug: "interior", label: "Interiors" },
  { slug: "landscape", label: "Landscape" },
  { slug: "assets", label: "Assets" },
  { slug: "free", label: "Free" },
];

// Готовая навигация магазина. Ровно этот список показывают ТРИ места
// (пилюля навбара на десктопе, мобильная выпадашка магазина, колонка Marketplace
// в футере) — раньше каждое собирало его само, и футер успел отстать:
// там категории годами висели неактивными «Coming soon», хотя в навбаре
// уже работали. Один источник — не разъедутся.
//
// Категорий здесь БОЛЬШЕ НЕТ (решение владельца 2026-07-30). Пока их было
// две, они помещались вкладками; с восемью пилюля навбара превратилась бы
// в свалку, а на мобильном — в простыню. Место категорий — фильтр на
// самой витрине (CategoryFilter), где есть куда развернуться и где рядом
// видно, сколько карт нашлось.
// `soon` — пункт виден, но не кликается: раздела ещё нет. Заглушку ставим
// осознанно, а не «ссылкой на пустую страницу»: неактивный пункт честно
// говорит «будет», а живая ссылка на пустоту читается как поломка сайта.
// Как только раздел появится — снять флаг и поставить настоящий href,
// больше нигде править не нужно.
export const SHOP_NAV_LINKS: {
  href: string;
  label: string;
  soon?: boolean;
  title?: string;
}[] = [
  // «Maps», а не «All Map» (2026-08-14): прежняя подпись была ещё и
  // безграмотной — all с единственным числом.
  { href: "/marketplace", label: "Maps" },
  // Wiki перестала быть заглушкой 2026-09-02, флаг снят 05.09 — раздел
  // есть, восемь статей. Правка ровно в одну строку и ровно здесь: этот
  // список рисует И навбар магазина, И колонку Marketplace в футере.
  { href: "/wiki", label: "Wiki" },
  // What's new перестал быть заглушкой 2026-09-15 — ровно той правкой в
  // одну строку, которую обещал комментарий выше. Пункт висел серым с
  // 14.08: месяц обещания без содержимого.
  { href: "/updates", label: "What's new" },
  { href: "/support", label: "Support" },
  // Выход из магазина на основной сайт. Появился 2026-08-20 вместе с тем,
  // что лого в режиме магазина стало вести на витрину, а не на "/": до
  // этого лого было ЕДИНСТВЕННОЙ дверью наружу, и, забрав её, надо было
  // дать другую. Стоит последним намеренно — это выход, а не раздел
  // магазина.
  { href: "/", label: "Studio" },
];

// Товар, каким его видит сайт. Тот же паттерн границы, что у
// projects.ts/reviews.ts: снаружи — домен сайта (price как готовая
// строка), внутри — устройство БД (price_label/price_cents). Перевод
// одного в другое — rowToProduct ниже, чистая функция под тест.
/**
 * Где карта находится — ОДНО значение на всё (колонка `state`, миграции
 * 20260815130000 и 20260816120000).
 *
 * Раньше это описывали четыре независимых поля (`status`, `is_published`,
 * `deleted_at`, `hidden_by`), из которых складывались десятки комбинаций
 * при семи осмысленных. Невозможные состояния прекрасно записывались —
 * так и появилось «уже не удалена, но всё ещё снята», из которого не было
 * выхода. Теперь состояние одно, а разрешённые переходы стережёт триггер
 * `guard_product_state` в базе, а не проверки в обработчиках.
 *
 *   pending    — в очереди на разбор
 *   rejected   — отказано, причина в rejectionReason/rejectionFlags
 *   live       — на витрине
 *   hidden     — автор снял сам, сам же и вернёт
 *   suspended  — сняла площадка, причина обязательна
 *   deleted    — убрана из каталога мягко (файл и скриншоты целы)
 *
 * ВАЖНО: `live` ещё не значит «видно покупателю». Видимость — это
 * `state === "live" И creatorActive`: карты автора, лишённого статуса,
 * уходят с витрины, сохраняя своё состояние, и возвращаются вместе со
 * статусом. Это же условие стоит в политике чтения.
 */
export type ProductState =
  | "pending"
  | "rejected"
  | "live"
  | "hidden"
  | "suspended"
  | "deleted";

export type Product = {
  /** uuid — нужен как внешний ключ order_items.product_id (подэтап B). */
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  /** Обложка: превью карточки и og:image. */
  image: string;
  /**
   * Галерея: обложка + дополнительные скриншоты из product_images, уже
   * отсортированные по position. Всегда непустой массив — первый элемент
   * это image. Так и странице товара, и карточке витрины не нужно
   * склеивать обложку со списком у себя.
   */
  images: string[];
  /** ISO-дата добавления — по ней строится подборка «Recently added». */
  createdAt: string;
  /** Когда карту правили в последний раз — products.updated_at. */
  updatedAt: string;
  /** Готовая строка для показа: "€15". */
  price: string;
  /**
   * Цена в центах — для Stripe (подэтап B). UI её не показывает и не
   * форматирует: показ — это price, число — это логика оплаты.
   */
  priceCents: number;
  currency: string;
  /**
   * Категория витрины. Реальная колонка (миграция 20260730120000) —
   * deriveCategory используется только как фоллбэк для старых строк,
   * созданных до неё (см. rowToProduct).
   */
  category: ProductCategory;
  /** Автор карты — profiles.id. null у карт, чей автор удалил аккаунт. */
  creatorId: string | null;
  /**
   * Профиль автора для показа на карточке. Опционален: приезжает
   * отдельным запросом (см. getCreatorsById — связать вложенной выборкой
   * нельзя, profiles закрыта RLS) и подмешивается только там, где нужен.
   */
  creator?: {
    username: string;
    handle: string;
    isVerified: boolean;
    /**
     * Цвет ника — привилегия купивших. Едет сюда, чтобы имя автора
     * выглядело одинаково ВЕЗДЕ: на карточке витрины, в блоке автора на
     * странице карты и под комментарием. До 2026-09-06 цвет доходил
     * только до двух последних, и карточка показывала то же имя серым —
     * то есть привилегия, за которую заплачено, на самом видном месте
     * не работала.
     */
    nameColor?: string | null;
  };
  // Агрегаты витрины (оценки/покупки). Опциональны: приезжают отдельным
  // запросом get_product_stats() и подмешиваются в getAllProductsWithStats.
  // Без них (детальная страница, тесты) карточка просто их не показывает.
  /** Средний балл 0–5 (0, если оценок нет). */
  rating?: number;
  /** Сколько оценок. */
  ratingCount?: number;
  /** Сколько раз куплен (оплаченные заказы). */
  salesCount?: number;

  /**
   * Характеристики карты (миграция 20260821130000). Отдельными полями, а
   * не текстом в описании: написанное прозой нельзя ни отфильтровать, ни
   * показать одинаково у двух авторов. Словари допустимых значений — в
   * product-specs.ts, база стережёт только объём.
   *
   * Все необязательны: у карт, залитых до миграции, они пусты, и
   * страница товара просто не показывает пустую строку.
   */
  specs: ProductSpecs;
  /**
   * Реакция карты — id строки из reaction_options; null, если автор её
   * не выбрал. Сам смайлик/картинка приезжает отдельно (getReactionOptions):
   * дублировать их в каждой карте значило бы завести второе место, где
   * живёт ответ на «как выглядит эта реакция».
   */
  reactionOptionId: string | null;
};

/** См. Product.specs. Вынесено типом — набор ездит целиком. */
export type ProductSpecs = {
  /** Версии Minecraft ПО СЛОВАМ АВТОРА — площадка их не проверяет. */
  mcVersions: string[];
  /**
   * Чем карта является: Spawn, Hub… НАБОР до трёх (с 2026-09-06; до
   * этого было одно значение). Три — «основное и два уточнения»: карта,
   * помеченная всеми типами, не описана никак.
   */
  mapTypes: string[];
  gameModes: string[];
  themes: string[];
  /** Масштаб словами: Small…Huge. */
  mapSize: string | null;
  fileFormats: string[];
  tags: string[];
  /** Вес файла в байтах — считается из файла, автор его не вводит. */
  fileSizeBytes: number | null;
  /** Когда карта впервые вышла на витрину; null — ещё не выходила. */
  publishedAt: string | null;
};

/**
 * Часть ProductSpecs, которую заполняет человек.
 *
 * ⚠️ Живёт здесь, а не в SpecFields.tsx, с 2026-09-13. Тот компонент
 * помечен "use client", и шлюз записи (/api/creator/map), импортируя из
 * него чистую функцию, тащил бы за ней клиентскую границу в серверный
 * обработчик. Место характеристик и так рядом с остальной формой карты.
 *
 * Что автор НЕ заполняет: fileSizeBytes берётся из самого файла (у
 * Storage, а не со слов клиента), publishedAt ставит база.
 */
export type EditableSpecs = Pick<
  ProductSpecs,
  "mcVersions" | "mapTypes" | "gameModes" | "themes" | "mapSize" | "fileFormats"
>;

export const EMPTY_SPECS: EditableSpecs = {
  mcVersions: [],
  mapTypes: [],
  gameModes: [],
  themes: [],
  mapSize: null,
  fileFormats: [],
};

/** Форма для записи в БД. Одна на обе формы — колонки не разъедутся. */
export function specsToColumns(specs: EditableSpecs) {
  return {
    mc_versions: specs.mcVersions,
    map_types: specs.mapTypes,
    game_modes: specs.gameModes,
    themes: specs.themes,
    map_size: specs.mapSize,
    file_formats: specs.fileFormats,
  };
}

// «Случайная, но стабильная» категория из slug: маленький хеш → одна из
// нехалявных категорий. «free» сюда не попадает — бесплатность определяется
// ценой, а не тегом (см. filterByCategory), иначе платный товар мог бы
// оказаться в «Free».
const TAGGABLE: ProductCategory[] = [
  "spawn",
  "adventure",
  "minigame",
  "building",
  "interior",
  "landscape",
  "assets",
];

export function deriveCategory(slug: string): ProductCategory {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return TAGGABLE[hash % TAGGABLE.length];
}

// Текст без HTML-разметки — для поиска по описанию. Описание пишется
// редактором и хранится как HTML, поэтому поиск по сырой строке находил
// бы совпадения в именах тегов и адресах картинок («img», «span»,
// «https»), а слово, разорванное тегом на середине, наоборот пропускал.
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

/**
 * Поиск по каталогу. Совпадение ищется в названии, кратком описании,
 * полном описании и **имени автора** — по нику креатора искали и не
 * находили, потому что раньше смотрели только на название и summary.
 *
 * Чистая функция рядом с filterByCategory: одинаково работает на
 * клиенте (MarketplaceCatalog) и в тесте.
 */
export function filterBySearch(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;

  return products.filter((p) =>
    [
      p.title,
      p.summary,
      stripHtml(p.description),
      p.creator?.username ?? "",
    ].some((field) => field.toLowerCase().includes(q)),
  );
}

// Фильтр витрины по вкладке навбара. «free» — по цене (0), остальные — по
// производной категории. Вынесено отдельной чистой функцией, чтобы
// одинаково работало и на клиенте (MarketplaceCatalog), и в тесте.
export function filterByCategory(
  products: Product[],
  category: ProductCategory,
): Product[] {
  if (category === "free") return products.filter((p) => p.priceCents === 0);
  return products.filter((p) => p.category === category);
}

// ── Подборки витрины ───────────────────────────────────────────────────
//
// Подборка — это не тег на карте, а ПОРЯДОК, в котором смотрят один и тот
// же каталог: «популярное» и «новое» состоят из тех же карт, просто
// выстроенных по-разному. Поэтому здесь сортировка, а не фильтр.
//
// Функция вынесена сюда, потому что порядок нужен ДВУМ местам сразу: ряду
// на главной витрине (первые восемь) и подстранице подборки (все).
// Отсортируй они каждый у себя — рано или поздно первая карта ряда
// перестала бы быть первой на странице, куда ведёт его же «View all».
export type ProductCollection = "all" | "popular" | "recent" | "top-rated";

export const SHOP_COLLECTIONS: {
  slug: ProductCollection;
  label: string;
}[] = [
  { slug: "all", label: "All maps" },
  { slug: "popular", label: "Most popular" },
  { slug: "recent", label: "Recently added" },
  { slug: "top-rated", label: "Top rated" },
];

/**
 * Порядок карт внутри подборки. Не мутирует вход — сортировка идёт по
 * копии: массив приезжает из кэша страницы, и перестановка на месте
 * меняла бы его для всех остальных читателей.
 *
 * `all` возвращает порядок как есть — это тот, что задала база
 * (sort_order), и своего мнения у витрины здесь нет.
 *
 * ⚠️ `top-rated` заодно ОТСЕИВАЕТ карты без единой оценки: карта, которую
 * никто не оценил, не может стоять в «лучших по оценкам» — ноль там
 * значит «неизвестно», а не «плохо». Это единственная подборка, которая
 * меняет состав, а не только порядок.
 */
export function sortByCollection(
  products: Product[],
  collection: ProductCollection,
): Product[] {
  switch (collection) {
    case "popular":
      return [...products].sort(
        (a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0),
      );
    case "recent":
      return [...products].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    case "top-rated":
      return products
        .filter((p) => (p.ratingCount ?? 0) > 0)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "all":
    default:
      return products;
  }
}

// ── Фильтр цены ────────────────────────────────────────────────────────
//
// Границы вводит человек («от» и «до»), а не выбирает из готовых
// диапазонов (решение владельца 2026-08-26; до этого здесь были пилюли
// Free / Under €10 / …). Готовые диапазоны короче в нажатиях, но
// отвечают только на те вопросы, которые мы придумали заранее; поле
// отвечает на любой.
//
// Наружу — ЕВРО (то, что человек видит на карточке), внутрь — центы.
// Перевод один и здесь: цена в базе целочисленная, и дробная
// арифметика на границе — самый дешёвый способ получить «19.99 не
// попало в диапазон до 20».
export function eurosToCents(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

/**
 * Отбор по цене. Обе границы ВКЛЮЧИТЕЛЬНЫ — так читается «от 5 до 20»
 * человеком, который их вписал: карта за ровно 20 в такой выборке
 * обязана быть. Это отличается от прежних пилюль, где верхняя граница
 * была исключающей, и отличается сознательно: там диапазоны стояли
 * встык и пересечение было бы ошибкой, здесь границы называет человек.
 *
 * null — граница не задана. Перепутанные местами границы (от 20 до 5)
 * не считаем ошибкой и молча меняем местами: это опечатка, а пустой
 * экран в ответ на опечатку читается как поломка каталога.
 */
export function filterByPriceRange(
  products: Product[],
  minCents: number | null,
  maxCents: number | null,
): Product[] {
  let lo = minCents;
  let hi = maxCents;
  if (lo !== null && hi !== null && lo > hi) [lo, hi] = [hi, lo];

  return products.filter(
    (p) =>
      (lo === null || p.priceCents >= lo) && (hi === null || p.priceCents <= hi),
  );
}

// ── Фильтр по характеристикам ──────────────────────────────────────────
//
// Ровно те поля, что завела миграция 20260821130000: версии, формат
// файла, тип карты, режимы, размер, темы. Значения приходят из адреса и
// сверяются со СТРОКАМИ В КАРТЕ, а не со словарём из product-specs.ts:
// словарь там — про вкус и пополняется без миграции, и карта, залитая
// со значением вне словаря, обязана находиться своим же значением.
export type SpecFilters = {
  /** Карта подходит, если совпала ХОТЯ БЫ ОДНА выбранная версия. */
  mcVersions: string[];
  formats: string[];
  mapTypes: string[];
  gameModes: string[];
  mapSizes: string[];
  themes: string[];
};

export const EMPTY_SPEC_FILTERS: SpecFilters = {
  mcVersions: [],
  formats: [],
  mapTypes: [],
  gameModes: [],
  mapSizes: [],
  themes: [],
};

// Внутри одного поля выбранные значения складываются по ИЛИ, а разные
// поля — по И. То есть «1.20 или 1.21» и при этом «Schematic».
// Обратное («и 1.20, и 1.21 одновременно») человек в фильтре не имеет в
// виду почти никогда, а у карты версии перечислены списком — требовать
// совпадения всех значило бы находить пустоту.
function matchesAny(chosen: string[], actual: string[]): boolean {
  if (chosen.length === 0) return true;
  return actual.some((value) => chosen.includes(value));
}

export function filterBySpecs(
  products: Product[],
  filters: SpecFilters,
): Product[] {
  return products.filter((p) => {
    const specs = p.specs;
    return (
      matchesAny(filters.mcVersions, specs.mcVersions) &&
      matchesAny(filters.formats, specs.fileFormats) &&
      matchesAny(filters.mapTypes, specs.mapTypes) &&
      // mapSize — одно значение или ничего. Приводим к списку, чтобы
      // правило совпадения было ОДНО на все поля: два разных правила
      // «одно значение» и «список» разошлись бы при первой же правке.
      matchesAny(filters.gameModes, specs.gameModes) &&
      matchesAny(filters.mapSizes, specs.mapSize ? [specs.mapSize] : []) &&
      matchesAny(filters.themes, specs.themes)
    );
  });
}

// ── Сортировка ─────────────────────────────────────────────────────────
//
// Отдельная ось от подборки. Подборка задаёт порядок ПО УМОЛЧАНИЮ
// («Most popular» — по продажам), а выбранная человеком сортировка его
// перебивает: он попросил явно, и молча оставить свой порядок значило бы
// проигнорировать просьбу.
export type SortOption =
  | "newest"
  | "oldest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "rating";

export const SORT_OPTIONS: { slug: SortOption; label: string }[] = [
  { slug: "newest", label: "Newest first" },
  { slug: "oldest", label: "Oldest first" },
  { slug: "price-asc", label: "Price: low to high" },
  { slug: "price-desc", label: "Price: high to low" },
  { slug: "name-asc", label: "Name: A to Z" },
  { slug: "rating", label: "Best rated" },
];

/**
 * Не мутирует вход — сортировка идёт по копии: массив приезжает из кэша
 * страницы, и перестановка на месте меняла бы его для всех остальных
 * читателей.
 *
 * `localeCompare` для имён, а не сравнение строк: иначе «Émeraude»
 * уезжает за «Zephyr», потому что по коду символа É больше Z.
 */
export function sortProducts(
  products: Product[],
  sort: SortOption | null,
): Product[] {
  if (!sort) return products;
  const copy = [...products];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    case "oldest":
      return copy.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    case "price-asc":
      return copy.sort((a, b) => a.priceCents - b.priceCents);
    case "price-desc":
      return copy.sort((a, b) => b.priceCents - a.priceCents);
    case "name-asc":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "en"));
    case "rating":
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    default:
      return copy;
  }
}

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image_url: string;
  price_label: string;
  price_cents: number;
  price_currency: string;
  created_at: string;
  updated_at: string;
  /** Появилась вместе с мульти-креатором; у старых баз колонки нет. */
  creator_id?: string | null;
  /** Появились вместе с creator upload; у старых баз колонок нет. */
  category?: ProductCategory | null;
  /**
   * Вложенная выборка PostgREST по внешнему ключу (product_images).
   * Опциональна: если миграции галереи ещё нет, Supabase вернёт строки
   * без этого поля — товар всё равно соберётся, просто с одной обложкой.
   */
  product_images?: { url: string; position: number }[] | null;
  /** Все восемь — из 20260821130000; у баз без неё колонок нет. */
  mc_versions?: string[] | null;
  map_type?: string | null;
  /** Из 20260906120000 — набор вместо одного значения. */
  map_types?: string[] | null;
  game_modes?: string[] | null;
  themes?: string[] | null;
  map_size?: string | null;
  file_formats?: string[] | null;
  tags?: string[] | null;
  file_size_bytes?: number | string | null;
  published_at?: string | null;
  /** Из 20260821170000. */
  reaction_option_id?: string | null;
};

export function rowToProduct(row: ProductRow): Product {
  // Порядок галереи задаём здесь, а не в запросе: сортировка вложенной
  // выборки в PostgREST многословна, а список из пары-тройки картинок
  // дешевле упорядочить на месте. Обложка всегда первая — она уже
  // выбрана владельцем как главный кадр.
  const extra = [...(row.product_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i) => i.url)
    .filter((url) => url !== row.image_url);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    image: row.image_url,
    images: [row.image_url, ...extra],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    price: row.price_label,
    priceCents: Number(row.price_cents),
    currency: row.price_currency,
    // Реальная колонка, если есть (новые строки её всегда заполняют);
    // старые строки без category — деривация из slug, тот же фоллбэк.
    category: row.category ?? deriveCategory(row.slug),
    creatorId: row.creator_id ?? null,
    specs: {
      mcVersions: row.mc_versions ?? [],
      // Пока обе колонки живы, читаем новую, а старую держим запасным
      // путём: миграция прогоняется ДО деплоя, но база без неё (или
      // строка, дописанная старым кодом) не должна терять тип карты.
      // Уйдёт вместе со сносом map_type.
      mapTypes:
        row.map_types && row.map_types.length > 0
          ? row.map_types
          : row.map_type
            ? [row.map_type]
            : [],
      gameModes: row.game_modes ?? [],
      themes: row.themes ?? [],
      mapSize: row.map_size ?? null,
      fileFormats: row.file_formats ?? [],
      tags: row.tags ?? [],
      // bigint приезжает из PostgREST строкой: в JSON число такой
      // разрядности не помещается без потерь, и драйвер честно отдаёт
      // текст. Number здесь безопасен — вес файла до 2^53 не дорастёт.
      fileSizeBytes:
        row.file_size_bytes === null || row.file_size_bytes === undefined
          ? null
          : Number(row.file_size_bytes),
      publishedAt: row.published_at ?? null,
    },
    reactionOptionId: row.reaction_option_id ?? null,
  };
}

// Общие списки колонок на оба запроса — getAllProducts и getProduct не
// разъедутся между собой (тот же приём, что PROJECT_FIELDS).
// Колонки, которые есть в products с самого начала.
const PRODUCT_FIELDS_NO_IMAGES =
  "id, slug, title, summary, description, image_url, price_label, price_cents, price_currency, created_at, updated_at";

// Полный набор: то же плюс автор (creator_id) и вложенная выборка
// галереи. product_images(...) — PostgREST сам подтягивает связанные
// строки по внешнему ключу одним запросом, без второго похода в базу и
// без ручного join'а на нашей стороне.
// Характеристики (20260821130000). Отдельной строкой, чтобы её было
// легко снять целиком, если база окажется без миграции, — см.
// isMissingOptional ниже.
const PRODUCT_SPEC_FIELDS =
  "mc_versions, map_type, map_types, game_modes, themes, map_size, file_formats, tags, file_size_bytes, published_at, reaction_option_id";

const PRODUCT_FIELDS = `${PRODUCT_FIELDS_NO_IMAGES}, creator_id, category, product_images(url, position), ${PRODUCT_SPEC_FIELDS}`;

// Запасной путь на случай, когда миграции галереи/автора/upload в этой
// базе ещё не прогнаны. PostgREST на незнакомую колонку или связь
// отвечает ошибкой и НЕ отдаёт строки вовсе — то есть магазин лёг бы
// целиком из-за необязательного поля. Деплой кода не должен зависеть от
// тайминга миграции: тот же принцип, что у get_product_stats и
// public_profiles.
function isMissingOptional(message: string): boolean {
  return (
    message.includes("product_images") ||
    message.includes("creator_id") ||
    message.includes("category") ||
    // Характеристики (20260821130000): пока миграция не прогнана,
    // спрашивать эти колонки — значит уронить витрину целиком.
    message.includes("mc_versions") ||
    message.includes("map_type") ||
    message.includes("map_types") ||
    message.includes("game_modes") ||
    message.includes("themes") ||
    message.includes("map_size") ||
    message.includes("file_formats") ||
    message.includes("tags") ||
    message.includes("file_size_bytes") ||
    message.includes("published_at") ||
    message.includes("reaction_option_id")
  );
}

// Фильтр здесь — для ясности намерения; настоящая защита — RLS-политика
// "public read live": анониму база отдаст только те же строки, даже если
// этот фильтр однажды забудут.
//
// Условий два, и второе не декоративное: карта автора, лишённого статуса
// креатора, остаётся `live` (чтобы вернуться туда же, когда статус
// вернут), но покупателю не показывается — см. ProductState.
export async function getAllProducts(): Promise<Product[]> {
  const query = (fields: string) =>
    getSupabase()
      .from("products")
      .select(fields)
      .eq("state", "live")
      .eq("creator_active", true)
      .order("sort_order", { ascending: true });

  let { data, error } = await query(PRODUCT_FIELDS);
  if (error && isMissingOptional(error.message)) {
    console.warn(`Необязательные поля товара недоступны: ${error.message}`);
    ({ data, error } = await query(PRODUCT_FIELDS_NO_IMAGES));
  }

  if (error) throw new Error(`Не удалось загрузить товары: ${error.message}`);

  return ((data ?? []) as unknown as ProductRow[]).map(rowToProduct);
}

export type ProductStats = {
  rating: number;
  ratingCount: number;
  salesCount: number;
};

// Агрегаты (средний балл, число оценок, число покупок) по всем товарам —
// одним вызовом security-definer функции get_product_stats() (см. миграцию
// 20260726120000). Возвращаем Map по product_id для быстрого подмешивания.
export async function getProductStats(): Promise<Map<string, ProductStats>> {
  const { data, error } = await getSupabase().rpc("get_product_stats");
  // Не роняем витрину из-за агрегатов: если функции ещё нет (миграция не
  // прогнана) или запрос упал — просто отдаём пустую карту, карточки
  // покажутся без оценок/покупок. Так деплой кода не завязан на тайминг
  // миграции, а магазин не падает.
  if (error) {
    console.warn(`get_product_stats недоступна: ${error.message}`);
    return new Map();
  }

  const map = new Map<string, ProductStats>();
  for (const row of (data ?? []) as {
    product_id: string;
    rating_avg: number | string;
    rating_count: number | string;
    sales_count: number | string;
  }[]) {
    map.set(row.product_id, {
      rating: Number(row.rating_avg),
      ratingCount: Number(row.rating_count),
      salesCount: Number(row.sales_count),
    });
  }
  return map;
}

// Товары витрины вместе с агрегатами и профилями авторов. Для /marketplace:
// карточки показывают оценки/покупки и кликабельное имя креатора,
// «Most popular» сортируется по продажам.
//
// Три запроса параллельно, а не по цепочке: они друг от друга не
// зависят, и общее время равно самому медленному из них.
export async function getAllProductsWithStats(): Promise<Product[]> {
  const [products, stats, creators] = await Promise.all([
    getAllProducts(),
    getProductStats(),
    getCreatorsById(),
  ]);
  return products.map((p) => {
    const s = stats.get(p.id);
    const c = p.creatorId ? creators.get(p.creatorId) : undefined;
    return {
      ...p,
      ...(s
        ? { rating: s.rating, ratingCount: s.ratingCount, salesCount: s.salesCount }
        : {}),
      ...(c
        ? {
            creator: {
              username: c.username,
              handle: c.handle,
              isVerified: c.isVerified,
              nameColor: c.nameColor,
            },
          }
        : {}),
    };
  });
}

export async function getProduct(slug: string): Promise<Product | null> {
  const query = (fields: string) =>
    getSupabase()
      .from("products")
      .select(fields)
      .eq("slug", slug)
      .eq("state", "live")
      .eq("creator_active", true)
      // maybeSingle: нет строки — это 404 страницы, а не ошибка запроса.
      .maybeSingle();

  let { data, error } = await query(PRODUCT_FIELDS);
  if (error && isMissingOptional(error.message)) {
    ({ data, error } = await query(PRODUCT_FIELDS_NO_IMAGES));
  }

  if (error) throw new Error(`Не удалось загрузить товар "${slug}": ${error.message}`);

  return data ? rowToProduct(data as unknown as ProductRow) : null;
}

// Бакет под обложку + галерею (миграция 20260730120000_creator_uploads).
// Публичный, как avatars — товар показывается всем, подписанные ссылки
// только усложнили бы витрину.
export const PRODUCT_IMAGES_BUCKET = "product-images";

// slug из заголовка: только [a-z0-9-], пробелы/спецсимволы → дефис,
// повторы дефисов схлопываются. Пустой заголовок ("!!!") даёт пустую
// строку — вызывающий код (createProduct) страхует это случайным
// суффиксом, который тогда становится всем slug'ом.
function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining diacritics after NFKD
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CreateProductInput = {
  creatorId: string;
  title: string;
  summary: string;
  /** HTML из Tiptap-редактора — санитизируется при показе, не здесь. */
  description: string;
  imageUrl: string;
  priceCents: number;
  category: Exclude<ProductCategory, "free">;
  filePath: string;
  /**
   * Характеристики карты (миграция 20260821130000). То, что заполняет
   * человек; published_at и file_size_bytes сюда не входят — первое
   * ставит база, второе приходит отдельным полем ниже.
   */
  specs: EditableSpecs;
  /**
   * Вес загруженного файла в байтах.
   *
   * ⚠️ С 2026-09-13 берётся у Storage (storage.info), а не из File в
   * браузере: число показывается покупателю, и заявленному нет причины
   * верить, когда можно спросить у того, кто файл хранит.
   */
  fileSizeBytes: number;
  /** Выбранная автором реакция; null — карта без реакции. */
  reactionOptionId: string | null;
  /** Скриншоты сверх обложки, по порядку. */
  galleryUrls: string[];
};

// Черновик карты от креатора. Зовётся ТОЛЬКО из шлюза
// (/api/creator/map) и только служебным ключом: с 2026-09-13 из браузера
// эту таблицу не пишет никто, политика вставки снята.
//
// ⚠️ СОСТОЯНИЕ ЗДЕСЬ ТЕПЕРЬ ПЕРЕДАЁТСЯ ЯВНО, И ЭТО РАЗВОРОТ.
//
// Раньше на этом месте стоял ровно обратный довод: state не передаём,
// его назначает триггер guard_product_insert, а писать его из кода —
// «делать вид, что решает эта строка, когда решает база». Довод был
// верен, пока вставка шла из браузера под ролью authenticated.
//
// Служебный ключ эту роль меняет, а триггер первой же строкой
// пропускает всё, что приходит не от конечного пользователя, — иначе
// модерация не могла бы назначать состояния вовсе. То есть под нашим
// ключом триггер молчит, и «не передавать state» означало бы теперь
// создать карту БЕЗ состояния (точнее, с умолчанием колонки) — и
// однажды выложить на витрину непроверенное.
//
// Правило не изменилось, изменилось место: решает по-прежнему одна
// сторона, но теперь эта сторона — обработчик, потому что только он
// знает, автор нажал кнопку или владелец. Триггер остаётся вторым
// рубежом для любого ещё не мигрировавшего пути.
//
// slug уникален (unique constraint) — при коллизии добавляем случайный
// хвост и пробуем ещё раз, до 5 попыток (коллизия по одинаковому
// заголовку — редкость, не нужен отдельный "slug taken" UX).
export async function createProduct(
  supabase: SupabaseClient,
  input: CreateProductInput
): Promise<{ id: string; slug: string }> {
  const base = slugify(input.title) || "map";
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 7)}`;

    const { data, error } = await supabase
      .from("products")
      .insert({
        slug,
        title: input.title,
        summary: input.summary,
        description: input.description,
        image_url: input.imageUrl,
        price_cents: input.priceCents,
        price_currency: "EUR",
        price_label: `€${(input.priceCents / 100).toFixed(2)}`,
        file_path: input.filePath,
        category: input.category,
        creator_id: input.creatorId,
        // То, что решает судьбу карты, — поимённо, теми же значениями,
        // что назначал guard_product_insert. Новая карта всегда встаёт
        // в очередь: что бы ни прислала форма, публикует владелец.
        state: "pending",
        submission_kind: "first",
        was_approved: false,
        deleted_by: null,
        suspension_reason: null,
        rejection_reason: null,
        rejection_flags: [],
        ...specsToColumns(input.specs),
        file_size_bytes: input.fileSizeBytes,
        reaction_option_id: input.reactionOptionId,
      })
      .select("id, slug")
      .single();

    if (!error) {
      const id = data.id as string;
      // Галерея — сразу же и здесь, а не вторым вызовом из обработчика.
      //
      // ⚠️ Не ради краткости: если картинки не легли, карту надо убрать.
      // Иначе автор увидит ошибку, нажмёт ещё раз — и в очереди окажутся
      // два черновика одной карты, из которых первый без скриншотов.
      // Настоящей транзакции тут нет (две таблицы, два запроса), поэтому
      // убираем ЖЁСТКИМ delete: строка живёт секунды, в очередь не
      // попадала и мягкое удаление хранить в ней нечего.
      try {
        await addProductImages(supabase, id, input.galleryUrls);
      } catch (err) {
        await supabase.from("products").delete().eq("id", id);
        throw err;
      }
      return { id, slug: data.slug as string };
    }
    // 23505 — unique_violation (slug занят). Другая ошибка — не наша
    // область, пробовать заново бессмысленно.
    if (error.code !== "23505") throw new Error(`Не удалось создать товар: ${error.message}`);
    lastError = error.message;
  }

  throw new Error(`Не удалось создать товар: ${lastError}`);
}

// Дополнительные скриншоты галереи (сверх обложки) — обложка уже ушла в
// products.image_url при createProduct. position = порядок в массиве.
export async function addProductImages(
  supabase: SupabaseClient,
  productId: string,
  urls: string[]
): Promise<void> {
  if (urls.length === 0) return;
  const { error } = await supabase
    .from("product_images")
    .insert(urls.map((url, position) => ({ product_id: productId, url, position })));

  if (error) throw new Error(`Не удалось сохранить фото товара: ${error.message}`);
}
