import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

// Слой заказов (Этап 4, подэтапы B/C). Всё здесь работает ТОЛЬКО на сервере:
// таблицы orders/order_items закрыты для анонима полностью (см. миграцию
// 20260723120000_orders.sql), читает и пишет их service_role.
//
// Главный принцип безопасности всего подэтапа: НИ ОДНО число здесь не
// приходит из браузера. Цена — из нашей БД (checkout) или из ответа
// Stripe (вебхук). Браузер сообщает только slug товара и session_id,
// оба — идентификаторы, а не данные.

export type OrderItemInput = {
  productId: string;
  /** Снимок на момент покупки — см. шапку миграции orders. */
  title: string;
  priceCents: number;
  quantity: number;
};

export type PaidOrderInput = {
  stripeSessionId: string;
  customerEmail: string;
  totalCents: number;
  currency: string;
  items: OrderItemInput[];
};

// Кусок Checkout Session, который нам нужен. Свой узкий тип, а не тип из
// SDK: функция ниже — чистая и тестируемая, тесту не нужен весь Stripe.
export type SessionLike = {
  id: string;
  payment_status: string;
  customer_details?: { email?: string | null } | null;
  amount_total?: number | null;
  currency?: string | null;
};

// Одна строка Checkout Session — товар + сколько штук. unitAmountCents,
// а не сумма по строке: order_items.price_cents хранит цену ЗА ШТУКУ
// (снимок на момент покупки), quantity — отдельно, как и в самой строке
// Stripe. Это единица работы этого модуля с корзиной из нескольких
// разных товаров (подэтап C) — раньше, с одним товаром за раз, сумма
// сессии совпадала с ценой позиции, теперь так только у корзины из 1 шт.
export type LineItemLike = {
  productId: string;
  title: string;
  unitAmountCents: number;
  quantity: number;
};

/**
 * Переводит оплаченную сессию + её позиции в заказ для записи в БД.
 * Возвращает null, если сессия не годится: не оплачена, сумма нулевая
 * или в ней нет ни одной нашей позиции (сессию создавал не наш
 * /api/checkout — метаданных product_id тогда бы не нашлось при сборке
 * lineItems, см. buildPaidOrderFromSession).
 *
 * Чистая функция — граница "мир Stripe -> наш домен", как rowToProduct
 * у товаров. Именно здесь решается, чему из ответа Stripe мы верим.
 * Сетевой поход за строками сессии (Stripe не присылает их в самом
 * событии вебхука) — отдельно, в buildPaidOrderFromSession ниже, чтобы
 * эта функция оставалась чистой и её можно было тестировать без Stripe.
 */
export function orderInputFromLineItems(
  session: SessionLike,
  lineItems: LineItemLike[]
): PaidOrderInput | null {
  // Событие checkout.session.completed приходит и для отложенных методов
  // оплаты, когда деньги ещё не списаны. Мы включаем только карты, но
  // проверка обязана быть здесь, а не в настройках: настройки меняются.
  if (session.payment_status !== "paid") return null;
  if (lineItems.length === 0) return null;

  const totalCents = session.amount_total;
  if (typeof totalCents !== "number" || totalCents <= 0) return null;

  return {
    stripeSessionId: session.id,
    // Email Stripe собирает сам на своей странице оплаты. Пустым он для
    // оплаченной сессии не бывает, но колонка not null — подстрахуемся.
    customerEmail: session.customer_details?.email ?? "unknown",
    totalCents,
    currency: (session.currency ?? "eur").toUpperCase(),
    items: lineItems.map((li) => ({
      productId: li.productId,
      title: li.title,
      priceCents: li.unitAmountCents,
      quantity: li.quantity,
    })),
  };
}

/**
 * Собирает заказ по id Checkout Session: спрашивает Stripe саму сессию
 * (payment_status, сумма, email) и её строки (line_items — вебхук не
 * присылает их в теле события, это отдельный запрос), затем сводит всё
 * через orderInputFromLineItems. Вызывают её и вебхук, и страница
 * успеха (см. её комментарий про гонку с вебхуком) — один код похода в
 * Stripe на оба случая.
 *
 * Каждую строку Stripe создаёт с ad-hoc товаром (price_data.product_data
 * в /api/checkout) — у такого товара, как и у обычного, есть metadata:
 * туда мы кладём наш product_id при создании сессии, а здесь читаем его
 * обратно через expand: "data.price.product".
 */
export async function buildPaidOrderFromSession(
  sessionId: string
): Promise<PaidOrderInput | null> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return null;

  const { data: rawLineItems } = await stripe.checkout.sessions.listLineItems(sessionId, {
    expand: ["data.price.product"],
    limit: 100,
  });

  const lineItems: LineItemLike[] = [];
  for (const li of rawLineItems) {
    const product = li.price?.product;
    // string — товар не расширен (не должно случиться при expand выше);
    // DeletedProduct — товар удалён из Stripe. Оба случая пропускаем:
    // это не наша позиция, доверять ей нельзя.
    if (!product || typeof product === "string" || "deleted" in product) continue;

    const productId = product.metadata?.product_id;
    const unitAmountCents = li.price?.unit_amount;
    if (!productId || typeof unitAmountCents !== "number" || unitAmountCents <= 0) continue;

    lineItems.push({
      productId,
      title: product.name,
      unitAmountCents,
      quantity: li.quantity ?? 1,
    });
  }

  return orderInputFromLineItems(session, lineItems);
}

/**
 * Записывает оплаченный заказ. Идемпотентна: повторный вызов с тем же
 * session_id ничего не создаст — Stripe ретраит недоставленные вебхуки,
 * плюс страница успеха может записать заказ раньше вебхука (или
 * наоборот). Кто пришёл вторым, тихо выходит.
 *
 * Сам заказ и его позиции пишет ОДНА функция в Postgres
 * (`record_paid_order`, см. миграцию `20260723130000_record_paid_order_fn.sql`)
 * внутри одной транзакции — не два отдельных запроса из кода. Раньше
 * здесь было именно два запроса подряд (insert в orders, затем insert в
 * order_items), и между ними было окно в несколько миллисекунд, где
 * читатель (getPaidOrder на странице успеха) видел уже созданный заказ
 * без единой позиции — "Thank you" с суммой, но без товаров для
 * скачивания. Атомарная запись эту гонку убирает: снаружи заказ либо не
 * существует ещё вовсе, либо существует сразу целиком, вместе со всеми
 * order_items.
 */
export async function recordPaidOrder(input: PaidOrderInput): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("record_paid_order", {
    p_stripe_session_id: input.stripeSessionId,
    p_customer_email: input.customerEmail,
    p_total_cents: input.totalCents,
    p_currency: input.currency,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      title: item.title,
      price_cents: item.priceCents,
      quantity: item.quantity,
    })),
  });

  if (error) throw new Error(`Не удалось записать заказ: ${error.message}`);
}

// Приватный бакет Supabase Storage с файлами карт. Приватный — значит
// прямой ссылки на файл не существует в принципе: скачать можно только
// по временной подписанной ссылке, которую выдаёт функция ниже.
export const PRODUCT_FILES_BUCKET = "product-files";

// Час. Ссылка живёт на странице успеха; обновил страницу — получил
// свежую (страница динамическая, подписывает заново на каждый рендер).
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

/**
 * Временная ссылка на файл из приватного бакета. null — файл не найден
 * (не загружен или путь в products.file_path указывает мимо).
 *
 * Вызывать ТОЛЬКО после проверки оплаты (getPaidOrder): сама функция
 * прав не проверяет, она просто подписывает путь служебным ключом.
 */
export async function signedDownloadUrl(filePath: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(PRODUCT_FILES_BUCKET)
    .createSignedUrl(filePath, DOWNLOAD_URL_TTL_SECONDS);

  if (error) {
    // Оплата уже прошла — ронять страницу успеха нельзя. Показываем
    // заказ без ссылки, а в лог пишем громко: файл покупателю всё равно
    // придётся отдать, просто руками.
    console.error("Не удалось подписать ссылку на файл:", filePath, error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

export type PaidOrderItem = {
  title: string;
  priceCents: number;
  quantity: number;
  /** Путь к файлу в приватном бакете; null, пока файл не загружен. */
  filePath: string | null;
};

export type PaidOrder = {
  customerEmail: string;
  totalCents: number;
  currency: string;
  items: PaidOrderItem[];
};

/**
 * Оплаченный заказ по id Checkout Session — для страницы успеха.
 *
 * session_id здесь работает как токен доступа: строка высокой энтропии,
 * которую Stripe отдаёт только тому, кто прошёл оплату (через redirect
 * на success_url). Подобрать чужой session_id перебором нереально,
 * поэтому отдельного секрета для просмотра заказа не нужно. Статус
 * проверяем всё равно: pending-заказ файлов не получает.
 */
export async function getPaidOrder(sessionId: string): Promise<PaidOrder | null> {
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("orders")
    .select(
      "customer_email, total_cents, currency, order_items(title, price_cents, quantity, products(file_path))"
    )
    .eq("stripe_session_id", sessionId)
    .eq("status", "paid")
    .maybeSingle();

  if (error) throw new Error(`Не удалось загрузить заказ: ${error.message}`);
  if (!data) return null;

  type ItemRow = {
    title: string;
    price_cents: number;
    quantity: number;
    // supabase-js типизирует вложенный select как массив, но по связи
    // "many-to-one" объект приходит один — нормализуем ниже.
    products: { file_path: string | null } | { file_path: string | null }[] | null;
  };

  return {
    customerEmail: data.customer_email,
    totalCents: Number(data.total_cents),
    currency: data.currency,
    items: ((data.order_items ?? []) as ItemRow[]).map((item) => {
      const product = Array.isArray(item.products)
        ? item.products[0]
        : item.products;
      return {
        title: item.title,
        priceCents: Number(item.price_cents),
        quantity: Number(item.quantity),
        filePath: product?.file_path ?? null,
      };
    }),
  };
}
