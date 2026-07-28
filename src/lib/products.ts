import { getSupabase } from "@/lib/supabase";
import { getCreatorsById } from "@/lib/creators";

// Категории витрины. ВРЕМЕННО: пока в БД нет колонки category, категорию
// выводим детерминированно из slug (deriveCategory ниже) — «случайно, но
// стабильно»: у товара всегда одна и та же категория, между рендерами не
// прыгает. Когда появится реальная колонка (подэтап маркетплейса), заменить
// derive на row.category — тип Product и фильтрация на витрине не изменятся.
// «Free» — не тег, а факт цены: цена 0 (см. filterByCategory).
export type ProductCategory = "assets" | "landscape" | "free";

export const SHOP_CATEGORIES: { slug: ProductCategory; label: string }[] = [
  { slug: "assets", label: "Assets" },
  { slug: "landscape", label: "Landscape" },
  { slug: "free", label: "Free" },
];

// Готовая навигация магазина: «All Map» + категории + «Support». Ровно этот
// список показывают ТРИ места (пилюля навбара на десктопе, мобильная
// выпадашка магазина, колонка Shop в футере) — раньше каждое собирало его
// само, и футер успел отстать: там категории годами висели неактивными
// «Coming soon», хотя в навбаре уже работали. Один источник — не разъедутся.
export const SHOP_NAV_LINKS: { href: string; label: string }[] = [
  { href: "/shop", label: "All Map" },
  ...SHOP_CATEGORIES.map((category) => ({
    href: `/shop?category=${category.slug}`,
    label: category.label,
  })),
  { href: "/support", label: "Support" },
];

// Товар, каким его видит сайт. Тот же паттерн границы, что у
// projects.ts/reviews.ts: снаружи — домен сайта (price как готовая
// строка), внутри — устройство БД (price_label/price_cents). Перевод
// одного в другое — rowToProduct ниже, чистая функция под тест.
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
  /** Категория витрины (пока производная от slug, см. deriveCategory). */
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
const TAGGABLE: ProductCategory[] = ["assets", "landscape"];

export function deriveCategory(slug: string): ProductCategory {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return TAGGABLE[hash % TAGGABLE.length];
}

// Фильтр витрины по вкладке навбара. «free» — по цене (0), остальные — по
// производной категории. Вынесено отдельной чистой функцией, чтобы
// одинаково работало и на клиенте (ShopCatalog), и в тесте.
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
    // Пока производная от slug; заменить на row.category, когда появится
    // колонка (тогда добавить category в PRODUCT_FIELDS и ProductRow).
    category: deriveCategory(row.slug),
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
const PRODUCT_FIELDS = `${PRODUCT_FIELDS_NO_IMAGES}, creator_id, product_images(url, position)`;

// Запасной путь на случай, когда миграции галереи/автора в этой базе ещё
// не прогнаны. PostgREST на незнакомую колонку или связь отвечает
// ошибкой и НЕ отдаёт строки вовсе — то есть магазин лёг бы целиком
// из-за необязательного поля. Деплой кода не должен зависеть от тайминга
// миграции: тот же принцип, что у get_product_stats и public_profiles.
function isMissingOptional(message: string): boolean {
  return message.includes("product_images") || message.includes("creator_id");
}

// Фильтр is_published здесь — для ясности намерения; настоящая защита —
// RLS-политика "public read published": анониму база неопубликованные
// строки не отдаст, даже если этот фильтр однажды забудут.
export async function getAllProducts(): Promise<Product[]> {
  const query = (fields: string) =>
    getSupabase()
      .from("products")
      .select(fields)
      .eq("is_published", true)
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

// Товары витрины вместе с агрегатами и профилями авторов. Для /shop:
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
      .eq("is_published", true)
      // maybeSingle: нет строки — это 404 страницы, а не ошибка запроса.
      .maybeSingle();

  let { data, error } = await query(PRODUCT_FIELDS);
  if (error && isMissingOptional(error.message)) {
    ({ data, error } = await query(PRODUCT_FIELDS_NO_IMAGES));
  }

  if (error) throw new Error(`Не удалось загрузить товар "${slug}": ${error.message}`);

  return data ? rowToProduct(data as unknown as ProductRow) : null;
}
