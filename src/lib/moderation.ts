import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signedDownloadUrl, downloadFileName } from "@/lib/orders";
import type { EditableSpecs } from "@/components/SpecFields";
import type { ProductCategory, ProductState } from "@/lib/products";

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
  creator: { id: string; username: string } | null;
  /**
   * Откуда карта пришла в очередь (колонка submission_kind, миграция
   * 20260811150000). Первая заявка, исправление после отказа и возврат
   * после снятия — три разных разбора, а выглядели одинаково.
   */
  submissionKind: SubmissionKind;
  /** За что сняли, если это возврат после снятия. Триггер её не стирает. */
  suspensionReason: string | null;
};

export type SubmissionKind =
  | "first"
  | "after_rejection"
  | "after_takedown"
  | "file_changed";

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
  submission_kind: SubmissionKind | null;
  suspension_reason: string | null;
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
      "id, slug, title, summary, description, image_url, price_label, category, file_path, created_at, creator_id, submission_kind, suspension_reason, product_images(url, position)"
    )
    // Одно сравнение вместо двух: «удалена» больше не отдельная метка
    // поверх статуса, а самостоятельное состояние — значит в pending
    // удалённая карта не попадёт по построению.
    .eq("state", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Не удалось загрузить очередь: ${error.message}`);

  const rows = (data ?? []) as unknown as Row[];

  // Ники авторов — одним запросом, а не по строке на карту.
  const creatorIds = Array.from(
    new Set(rows.map((r) => r.creator_id).filter((id): id is string => Boolean(id)))
  );
  // Имя человека — ОДНО (миграция 20260821150000): оно же логин, оно же
  // адрес профиля.
  const names = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, username")
      .in("id", creatorIds);
    for (const p of profiles ?? []) names.set(p.id, p.username);
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
        fileUrl: row.file_path
          ? await signedDownloadUrl(
              row.file_path,
              downloadFileName(row.title, row.file_path)
            )
          : null,
        creator: row.creator_id
          ? { id: row.creator_id, username: names.get(row.creator_id) ?? "—" }
          : null,
        submissionKind: row.submission_kind ?? "first",
        suspensionReason: row.suspension_reason,
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
  /**
   * Где карта находится. Автору важна разница между «спрятал сам»
   * (hidden — вернёт одной кнопкой) и «сняла площадка» (suspended —
   * вернуть можно только правкой, она же отправляет на повторный разбор).
   */
  state: ProductState;
  /**
   * Активен ли автор как креатор. Если нет — его живые карты с витрины
   * ушли, но состояния не сменили: вернётся статус, вернутся и они.
   * Отсюда отдельный бейдж «Paused» вместо «Taken down» — дело в доступе,
   * а не в карте.
   */
  creatorActive: boolean;
  rejectionReason: string | null;
  rejectionFlags: string[];
  /** За что сняли или удалили. Автор обязан это видеть, а не догадываться. */
  suspensionReason: string | null;
  /** Кто удалил: площадка или сам автор. */
  deletedBy: "creator" | "moderator" | null;
  createdAt: string;
};

export async function getOwnProducts(
  supabase: SupabaseClient,
  userId: string
): Promise<OwnProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, title, image_url, price_label, state, creator_active, rejection_reason, rejection_flags, suspension_reason, deleted_by, created_at"
    )
    .eq("creator_id", userId)
    // Своё же удаление автор в списке не видит: он его и сделал, а
    // строка живёт дальше только ради каталога админки и возможного
    // возврата через поддержку (миграция 20260815150000). Показывать её
    // здесь значило бы отвечать на «удалить» словами «карта на месте».
    //
    // Удаление ПЛОЩАДКОЙ остаётся видимым, и это не непоследовательность:
    // там автор — сторона, которую поставили перед фактом, и ему нужно
    // видеть и сам факт, и причину.
    .or("deleted_by.is.null,deleted_by.eq.moderator")
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
    state: row.state as ProductState,
    creatorActive: row.creator_active !== false,
    rejectionReason: row.rejection_reason ?? null,
    rejectionFlags: row.rejection_flags ?? [],
    suspensionReason: row.suspension_reason ?? null,
    deletedBy: row.deleted_by ?? null,
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
  state: ProductState;
  rejectionReason: string | null;
  rejectionFlags: string[];
  filePath: string | null;
  /** Характеристики карты (20260821130000) — то, что правит автор. */
  specs: EditableSpecs;
  /** Выбранная реакция (20260821170000); null — карта без реакции. */
  reactionOptionId: string | null;
};

export async function getOwnProduct(
  supabase: SupabaseClient,
  userId: string,
  slug: string
): Promise<EditableProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, title, summary, description, image_url, price_cents, category, state, rejection_reason, rejection_flags, file_path, product_images(url, position), mc_versions, map_type, game_modes, themes, map_size, file_formats, reaction_option_id"
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
    state: ProductState;
    rejection_reason: string | null;
    rejection_flags: string[] | null;
    file_path: string | null;
    product_images: { url: string; position: number }[] | null;
    mc_versions: string[] | null;
    map_type: string | null;
    game_modes: string[] | null;
    themes: string[] | null;
    map_size: string | null;
    file_formats: string[] | null;
    reaction_option_id: string | null;
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
    state: row.state,
    rejectionReason: row.rejection_reason ?? null,
    rejectionFlags: row.rejection_flags ?? [],
    specs: {
      mcVersions: row.mc_versions ?? [],
      mapType: row.map_type ?? null,
      gameModes: row.game_modes ?? [],
      themes: row.themes ?? [],
      mapSize: row.map_size ?? null,
      fileFormats: row.file_formats ?? [],
    },
    reactionOptionId: row.reaction_option_id ?? null,
    filePath: row.file_path,
  };
}
