import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Журнал скачиваний (2026-09-26, миграция 20260926120000_download_events).
//
// Зачем он и почему строка пишется на клик, а не на показ страницы, —
// в шапке миграции. Здесь три вещи: кто имеет право скачать (grant),
// запись факта и чтение журнала для админки.
//
// Только сервер: orders и download_events закрыты RLS, ходим служебным
// ключом.

// Формат id Checkout Session — тот же, что проверяет страница успеха.
export const SESSION_ID_PATTERN = /^cs_[a-zA-Z0-9_]{10,250}$/;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export type DownloadSource = "purchases" | "success";

/**
 * Адрес кнопки Download. Со страницы успеха — вместе с id сессии: там
 * покупатель может быть не вошедшим (гостевой заказ), и пропуском
 * служит сессия Stripe, как и для самой страницы.
 *
 * ⚠️ Ссылку рисовать ОБЫЧНЫМ <a> (Button с `native`), не next/link —
 * почему, в комментарии к пропу `native` в Button.tsx.
 */
export function downloadHref(productId: string, sessionId?: string): string {
  const params = new URLSearchParams({ product: productId });
  if (sessionId) params.set("session", sessionId);
  return `/api/download?${params.toString()}`;
}

/** Всё, что нужно, чтобы выдать файл и записать факт. */
export type DownloadGrant = {
  orderId: string;
  userId: string | null;
  customerEmail: string;
  title: string;
  filePath: string | null;
};

type OrderRow = {
  id: string;
  user_id: string | null;
  customer_email: string;
  order_items:
    | {
        product_id: string;
        title: string;
        products: { file_path: string | null } | { file_path: string | null }[] | null;
      }[]
    | null;
};

const GRANT_SELECT =
  "id, user_id, customer_email, created_at, order_items!inner(product_id, title, products(file_path))";

function grantFrom(row: OrderRow | null | undefined, productId: string): DownloadGrant | null {
  if (!row) return null;
  const item = (row.order_items ?? []).find((i) => i.product_id === productId);
  if (!item) return null;
  const product = Array.isArray(item.products) ? item.products[0] : item.products;
  return {
    orderId: row.id,
    userId: row.user_id,
    customerEmail: row.customer_email,
    title: item.title,
    filePath: product?.file_path ?? null,
  };
}

/**
 * Право скачать карту по сессии Stripe (страница успеха).
 *
 * Только оплаченный заказ: `refunded` доступ закрывает — так записано в
 * схеме заказов с первого дня, и журнал не должен открывать то, что
 * закрыл возврат.
 */
export async function grantBySession(
  sessionId: string,
  productId: string
): Promise<DownloadGrant | null> {
  if (!SESSION_ID_PATTERN.test(sessionId)) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select(GRANT_SELECT)
    .eq("stripe_session_id", sessionId)
    .eq("status", "paid")
    .eq("order_items.product_id", productId)
    .maybeSingle();

  if (error) throw new Error(`Не удалось проверить заказ: ${error.message}`);
  return grantFrom(data as OrderRow | null, productId);
}

/**
 * Право скачать карту вошедшему человеку (список покупок).
 *
 * Два пути, те же, что у getPurchasesForUser: заказ под аккаунтом и
 * гостевой заказ на ту же почту. ⚠️ Правило должно совпадать с тем
 * списком дословно: разойдутся — человек увидит кнопку Download и
 * получит 404.
 *
 * Из нескольких подходящих заказов берётся самый свежий.
 */
export async function grantForUser(
  userId: string,
  email: string | null,
  productId: string
): Promise<DownloadGrant | null> {
  const db = getSupabaseAdmin();
  const base = () =>
    db
      .from("orders")
      .select(GRANT_SELECT)
      .eq("status", "paid")
      .eq("order_items.product_id", productId)
      .order("created_at", { ascending: false })
      .limit(1);

  const [byUser, byEmail] = await Promise.all([
    base().eq("user_id", userId),
    // Без почты гостевой путь не ищем вовсе: eq("customer_email", "")
    // ничего бы не нашёл, но и спрашивать незачем.
    email ? base().is("user_id", null).eq("customer_email", email) : null,
  ]);

  if (byUser.error) throw new Error(`Не удалось проверить заказ: ${byUser.error.message}`);
  if (byEmail?.error) throw new Error(`Не удалось проверить заказ: ${byEmail.error.message}`);

  return (
    grantFrom((byUser.data as OrderRow[] | null)?.[0], productId) ??
    grantFrom((byEmail?.data as OrderRow[] | null)?.[0], productId)
  );
}

// Строка браузера нужна как «с какого устройства», и ей хватает начала.
// Потолок стоит, потому что заголовок присылает клиент, и длина у него
// любая.
const USER_AGENT_MAX = 300;

/**
 * Записать факт скачивания.
 *
 * ⚠️ НЕ БРОСАЕТ. Покупатель заплатил, и сбой журнала не имеет права
 * отнять у него файл. Ошибка уходит в лог сервера громко: молча
 * сломавшийся журнал выглядит ровно как пустой, а узнают о нём в день
 * спора — когда уже поздно.
 */
export async function recordDownload(event: {
  grant: DownloadGrant;
  productId: string;
  source: DownloadSource;
  ipHash: string;
  userAgent: string | null;
}): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("download_events")
    .insert({
      order_id: event.grant.orderId,
      product_id: event.productId,
      title: event.grant.title,
      user_id: event.grant.userId,
      customer_email: event.grant.customerEmail,
      source: event.source,
      ip_hash: event.ipHash,
      user_agent: event.userAgent?.slice(0, USER_AGENT_MAX) ?? null,
    });

  if (error) {
    console.error(
      "[download] журнал не записан:",
      event.grant.orderId,
      event.productId,
      error.message
    );
  }
}

export type DownloadEvent = {
  id: number;
  createdAt: string;
  orderId: string | null;
  productId: string | null;
  title: string;
  userId: string | null;
  /** Ник, если заказ под аккаунтом и профиль жив. */
  username: string | null;
  customerEmail: string;
  source: DownloadSource;
  ipHash: string;
  userAgent: string | null;
};

// Потолок списка в админке. Страница без разбивки, как комментарии:
// пока скачиваний десятки, лишний экран страниц никому не нужен, а
// бесконечным молча список не станет.
const ADMIN_LIST_LIMIT = 300;

/**
 * Журнал для /admin/downloads, новые сверху.
 *
 * query — поиск по почте или нику: в споре о списании ищут ровно так,
 * у банка на руках почта покупателя. Регистр не важен.
 */
export async function getDownloadEvents(query?: string): Promise<DownloadEvent[]> {
  const db = getSupabaseAdmin();
  const q = query?.trim().toLowerCase() ?? "";

  // Ник живёт в profiles, почта — в самом журнале. Поиск по нику
  // сначала превращает его в id: PostgREST не соединяет download_events
  // с profiles (обе ссылаются на auth.users, а не друг на друга).
  let userIds: string[] = [];
  if (q) {
    const { data, error } = await db
      .from("profiles")
      .select("id")
      .ilike("username", `%${escapeLike(q)}%`)
      .limit(50);
    if (error) throw new Error(`Не удалось найти профили: ${error.message}`);
    userIds = (data ?? []).map((p) => p.id as string);
  }

  let request = db
    .from("download_events")
    .select(
      "id, created_at, order_id, product_id, title, user_id, customer_email, source, ip_hash, user_agent"
    )
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIST_LIMIT);

  if (q) {
    const byEmail = `customer_email.ilike.%${escapeLike(q)}%`;
    request = userIds.length
      ? request.or(`${byEmail},user_id.in.(${userIds.join(",")})`)
      : request.or(byEmail);
  }

  const { data, error } = await request;
  if (error) throw new Error(`Не удалось загрузить журнал: ${error.message}`);

  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles, error: profilesError } = await db
      .from("profiles")
      .select("id, username")
      .in("id", ids);
    if (profilesError) {
      throw new Error(`Не удалось загрузить профили: ${profilesError.message}`);
    }
    for (const p of profiles ?? []) names.set(p.id as string, p.username as string);
  }

  return rows.map((r) => ({
    id: Number(r.id),
    createdAt: r.created_at,
    orderId: r.order_id,
    productId: r.product_id,
    title: r.title,
    userId: r.user_id,
    username: r.user_id ? (names.get(r.user_id) ?? null) : null,
    customerEmail: r.customer_email,
    source: r.source as DownloadSource,
    ipHash: r.ip_hash,
    userAgent: r.user_agent,
  }));
}

/**
 * Экранирование для фильтров PostgREST внутри or(...).
 *
 * `%` и `_` — подстановочные знаки LIKE; запятая, скобки и точка
 * разбирают сам фильтр `or(...)` на части. Искомую строку вводит админ,
 * но ломаться поиск на почте с точкой (а в почте она есть почти
 * всегда) не должен — поэтому такие символы заменяются на `_`, «любой
 * один символ». Поиск от этого становится чуть шире, но не врёт.
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/[,().:"]/g, "_");
}
