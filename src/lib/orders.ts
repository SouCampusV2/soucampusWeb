import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Слой заказов (Этап 4, подэтап B). Всё здесь работает ТОЛЬКО на сервере:
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
  metadata?: Record<string, string> | null;
};

/**
 * Переводит оплаченную Checkout Session в заказ для записи в БД.
 * Возвращает null, если сессия не годится: не оплачена или в metadata
 * нет нашего товара (сессию создавал не наш /api/checkout).
 *
 * Чистая функция — граница "мир Stripe -> наш домен", как rowToProduct
 * у товаров. Именно здесь решается, чему из ответа Stripe мы верим.
 */
export function orderInputFromSession(session: SessionLike): PaidOrderInput | null {
  // Событие checkout.session.completed приходит и для отложенных методов
  // оплаты, когда деньги ещё не списаны. Мы включаем только карты, но
  // проверка обязана быть здесь, а не в настройках: настройки меняются.
  if (session.payment_status !== "paid") return null;

  const productId = session.metadata?.product_id;
  const title = session.metadata?.product_title;
  if (!productId || !title) return null;

  const totalCents = session.amount_total;
  if (typeof totalCents !== "number" || totalCents <= 0) return null;

  return {
    stripeSessionId: session.id,
    // Email Stripe собирает сам на своей странице оплаты. Пустым он для
    // оплаченной сессии не бывает, но колонка not null — подстрахуемся.
    customerEmail: session.customer_details?.email ?? "unknown",
    totalCents,
    currency: (session.currency ?? "eur").toUpperCase(),
    // Подэтап B — один товар за раз (корзина — подэтап C), поэтому
    // сумма сессии и есть цена позиции.
    items: [{ productId, title, priceCents: totalCents, quantity: 1 }],
  };
}

/**
 * Записывает оплаченный заказ. Идемпотентна: повторный вызов с тем же
 * session_id ничего не создаст — Stripe ретраит недоставленные вебхуки,
 * плюс страница успеха может записать заказ раньше вебхука (или
 * наоборот). Кто пришёл вторым, тихо выходит.
 *
 * Защиту от дубля держит unique-индекс на stripe_session_id, а не
 * проверка "а есть ли уже такой заказ": вебхук и страница успеха могут
 * прийти одновременно, проверку двумя запросами они бы обошли — ровно
 * та же гонка, что у двух вкладок в счётчике просмотров.
 */
export async function recordPaidOrder(input: PaidOrderInput): Promise<void> {
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("orders")
    .upsert(
      {
        stripe_session_id: input.stripeSessionId,
        customer_email: input.customerEmail,
        status: "paid",
        total_cents: input.totalCents,
        currency: input.currency,
      },
      { onConflict: "stripe_session_id", ignoreDuplicates: true }
    )
    .select("id");

  if (error) throw new Error(`Не удалось записать заказ: ${error.message}`);

  // Пустой ответ = конфликт, заказ уже записан (вместе с позициями,
  // потому что записывает их тот же вызов, который создал заказ).
  const orderId = data?.[0]?.id;
  if (!orderId) return;

  const { error: itemsError } = await db.from("order_items").insert(
    input.items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      title: item.title,
      price_cents: item.priceCents,
      quantity: item.quantity,
    }))
  );

  if (itemsError) {
    // Заказ есть, позиций нет — это надо чинить руками, поэтому громко.
    throw new Error(
      `Заказ ${orderId} записан, но позиции — нет: ${itemsError.message}`
    );
  }
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
