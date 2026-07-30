import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signedDownloadUrl } from "@/lib/orders";
import type { ProductCategory, ProductStatus } from "@/lib/products";

// Очередь модерации и «мои заявки» креатора.
//
// Читается служебным ключом (getSupabaseAdmin): черновики закрыты RLS от
// всех, кроме их автора, а модератор — как раз не автор. Это ровно тот
// случай, под который supabase-admin и заведён.

export type PendingProduct = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  /** HTML из редактора — санитизировать при показе. */
  description: string;
  images: string[];
  price: string;
  category: ProductCategory | null;
  createdAt: string;
  /** Подписанная ссылка на файл карты; null — файла нет или подпись не удалась. */
  fileUrl: string | null;
  creator: { id: string; displayName: string } | null;
};

type Row = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image_url: string;
  price_label: string;
  category: ProductCategory | null;
  file_path: string | null;
  created_at: string;
  creator_id: string | null;
  product_images: { url: string; position: number }[] | null;
};

/**
 * Все карты, ждущие разбора. Вместе с подписанными ссылками на файлы —
 * модератор обязан иметь возможность СКАЧАТЬ и открыть карту, иначе
 * «проверка» сводится к чтению заголовка.
 */
export async function getPendingProducts(): Promise<PendingProduct[]> {
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("products")
    .select(
      "id, slug, title, summary, description, image_url, price_label, category, file_path, created_at, creator_id, product_images(url, position)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Не удалось загрузить очередь: ${error.message}`);

  const rows = (data ?? []) as unknown as Row[];

  // Ники авторов — одним запросом, а не по строке на карту.
  const creatorIds = Array.from(
    new Set(rows.map((r) => r.creator_id).filter((id): id is string => Boolean(id)))
  );
  const names = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    for (const p of profiles ?? []) names.set(p.id, p.display_name);
  }

  return Promise.all(
    rows.map(async (row) => {
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
        images: [row.image_url, ...extra],
        price: row.price_label,
        category: row.category,
        createdAt: row.created_at,
        fileUrl: row.file_path ? await signedDownloadUrl(row.file_path) : null,
        creator: row.creator_id
          ? { id: row.creator_id, displayName: names.get(row.creator_id) ?? "—" }
          : null,
      };
    })
  );
}

// Карты креатора для его личного раздела /resources: и опубликованные, и
// ждущие разбора, и отклонённые — в одном списке со статусом у каждой.
//
// Читается ПОД СЕССИЕЙ пользователя: политика "creators read own
// products" отдаёт ровно свои строки. Служебный ключ здесь не нужен и
// был бы лишним расширением прав — человек смотрит на своё.
export type OwnProduct = {
  id: string;
  slug: string;
  title: string;
  image: string;
  price: string;
  status: ProductStatus;
  isPublished: boolean;
  rejectionReason: string | null;
  rejectionFlags: string[];
  createdAt: string;
};

export async function getOwnProducts(
  supabase: SupabaseClient,
  userId: string
): Promise<OwnProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, title, image_url, price_label, status, is_published, rejection_reason, rejection_flags, created_at"
    )
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });

  // Не роняем страницу из-за этой секции: пока миграция модерации не
  // прогнана, колонок нет (тот же принцип, что у get_product_stats и
  // public_profiles).
  if (error) {
    console.warn(`Карты креатора недоступны: ${error.message}`);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    image: row.image_url,
    price: row.price_label,
    status: row.status ?? "published",
    isPublished: Boolean(row.is_published),
    rejectionReason: row.rejection_reason ?? null,
    rejectionFlags: row.rejection_flags ?? [],
    createdAt: row.created_at,
  }));
}

// Одна своя карта целиком — для формы редактирования. Тот же путь через
// сессию и ту же политику, что getOwnProducts: чужую строку она просто
// не вернёт, отдельной проверки владения в коде не требуется.
export type EditableProduct = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image: string;
  images: string[];
  priceCents: number;
  category: ProductCategory | null;
  status: ProductStatus;
  isPublished: boolean;
  rejectionReason: string | null;
  rejectionFlags: string[];
  filePath: string | null;
};

export async function getOwnProduct(
  supabase: SupabaseClient,
  userId: string,
  slug: string
): Promise<EditableProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, title, summary, description, image_url, price_cents, category, status, is_published, rejection_reason, rejection_flags, file_path, product_images(url, position)"
    )
    .eq("creator_id", userId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.warn(`Карта креатора недоступна: ${error.message}`);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    slug: string;
    title: string;
    summary: string;
    description: string;
    image_url: string;
    price_cents: number;
    category: ProductCategory | null;
    status: ProductStatus | null;
    is_published: boolean;
    rejection_reason: string | null;
    rejection_flags: string[] | null;
    file_path: string | null;
    product_images: { url: string; position: number }[] | null;
  };

  // Обложка первой, остальные по position — та же сборка галереи, что в
  // rowToProduct (см. products.ts).
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
    priceCents: Number(row.price_cents),
    category: row.category,
    status: row.status ?? "published",
    isPublished: Boolean(row.is_published),
    rejectionReason: row.rejection_reason ?? null,
    rejectionFlags: row.rejection_flags ?? [],
    filePath: row.file_path,
  };
}
