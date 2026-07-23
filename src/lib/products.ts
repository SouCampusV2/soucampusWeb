import { getSupabase } from "@/lib/supabase";

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
};

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
