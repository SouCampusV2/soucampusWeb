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
  {
    href: "/wiki",
    label: "Wiki",
    soon: true,
    title: "Guides on installing maps are coming soon",
  },
  {
    href: "/updates",
    label: "What's new",
    soon: true,
    title: "Updates and new maps are coming soon",
  },
  { href: "/support", label: "Support" },
  // Выход из магазина на основной сайт. Появился 2026-08-20 вместе с тем,
  // что лого в режиме магазина стало вести на витрину, а не на "/": до
  // этого лого было ЕДИНСТВЕННОЙ дверью наружу, и, забрав её, надо было
  // дать другую. Стоит последним намеренно — это выход, а не раздел
  // магазина.
  { href: "/", label: "Main site" },
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
  creator?: { displayName: string; handle: string; isVerified: boolean };
  // Агрегаты витрины (оценки/покупки). Опциональны: приезжают отдельным
  // запросом get_product_stats() и подмешиваются в getAllProductsWithStats.
  // Без них (детальная страница, тесты) карточка просто их не показывает.
  /** Средний балл 0–5 (0, если оценок нет). */
  rating?: number;
  /** Сколько оценок. */
  ratingCount?: number;
  /** Сколько раз куплен (оплаченные заказы). */
  salesCount?: number;
};

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
      p.creator?.displayName ?? "",
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
    price: row.price_label,
    priceCents: Number(row.price_cents),
    currency: row.price_currency,
    // Реальная колонка, если есть (новые строки её всегда заполняют);
    // старые строки без category — деривация из slug, тот же фоллбэк.
    category: row.category ?? deriveCategory(row.slug),
    creatorId: row.creator_id ?? null,
  };
}

// Общие списки колонок на оба запроса — getAllProducts и getProduct не
// разъедутся между собой (тот же приём, что PROJECT_FIELDS).
// Колонки, которые есть в products с самого начала.
const PRODUCT_FIELDS_NO_IMAGES =
  "id, slug, title, summary, description, image_url, price_label, price_cents, price_currency, created_at";

// Полный набор: то же плюс автор (creator_id) и вложенная выборка
// галереи. product_images(...) — PostgREST сам подтягивает связанные
// строки по внешнему ключу одним запросом, без второго похода в базу и
// без ручного join'а на нашей стороне.
const PRODUCT_FIELDS = `${PRODUCT_FIELDS_NO_IMAGES}, creator_id, category, product_images(url, position)`;

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
    message.includes("category")
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
              displayName: c.displayName,
              handle: c.handle,
              isVerified: c.isVerified,
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
};

// Черновик карты от креатора.
//
// Состояние здесь НЕ передаётся вовсе, и это осознанно: его назначает
// триггер guard_product_insert (миграция 20260815160000) — новая карта
// всегда встаёт в очередь на разбор, что бы ни прислали. Передавать
// state: 'pending' отсюда значило бы делать вид, что решает эта строка
// кода, хотя решает база; а если бы она НЕ решала, то же поле можно было
// бы прислать запросом мимо этой функции и опубликовать себя сразу.
//
// RLS "creators insert own products" разрешает вставку только со своим
// creator_id и только при активном статусе креатора без паузы на заявки.
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
      })
      .select("id, slug")
      .single();

    if (!error) return { id: data.id as string, slug: data.slug as string };
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
