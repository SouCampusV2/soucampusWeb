import { getSupabase } from "@/lib/supabase";

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
  image: string;
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
};

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    image: row.image_url,
    price: row.price_label,
    priceCents: Number(row.price_cents),
    currency: row.price_currency,
    // Пока производная от slug; заменить на row.category, когда появится
    // колонка (тогда добавить category в PRODUCT_FIELDS и ProductRow).
    category: deriveCategory(row.slug),
  };
}

// Одна строка с колонками на оба запроса — getAllProducts и getProduct
// не разъедутся между собой (тот же приём, что PROJECT_FIELDS).
const PRODUCT_FIELDS =
  "id, slug, title, summary, description, image_url, price_label, price_cents, price_currency";

// Фильтр is_published здесь — для ясности намерения; настоящая защита —
// RLS-политика "public read published": анониму база неопубликованные
// строки не отдаст, даже если этот фильтр однажды забудут.
export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await getSupabase()
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Не удалось загрузить товары: ${error.message}`);

  return (data ?? []).map(rowToProduct);
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

// Товары витрины вместе с агрегатами. Для /shop: карточки показывают
// оценки/покупки, «Most popular» сортируется по продажам.
export async function getAllProductsWithStats(): Promise<Product[]> {
  const [products, stats] = await Promise.all([
    getAllProducts(),
    getProductStats(),
  ]);
  return products.map((p) => {
    const s = stats.get(p.id);
    return s
      ? { ...p, rating: s.rating, ratingCount: s.ratingCount, salesCount: s.salesCount }
      : p;
  });
}

export async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await getSupabase()
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("slug", slug)
    .eq("is_published", true)
    // maybeSingle: нет строки — это 404 страницы, а не ошибка запроса.
    .maybeSingle();

  if (error) throw new Error(`Не удалось загрузить товар "${slug}": ${error.message}`);

  return data ? rowToProduct(data) : null;
}
