import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import { notify } from "@/lib/notifications";

// Слой заказов (Этап 4, подэтапы B/C). Всё здесь работает ТОЛЬКО на сервере:
// таблицы orders/order_items закрыты для анонима полностью (см. миграцию
// 20260723120000_orders.sql), читает и пишет их service_role.
//
// Главный принцип безопасности всего подэтапа: НИ ОДНО число здесь не
// приходит из браузера. Цена — из нашей БД (checkout) или из ответа
// Stripe (вебхук). Браузер сообщает только slug товара и session_id,
// оба — идентификаторы, а не данные.

// supabase-js типизирует ЛЮБОЙ вложенный select как массив, хотя по связи
// "many-to-one" (order_items → products) объект приходит ровно один. Эта
// нормализация нужна в каждом таком месте — держим её одним хелпером, чтобы
// не разъезжалась по копиям.
function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

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
  /** id аккаунта покупателя (Stripe client_reference_id). null у старых
   *  гостевых заказов до Auth. */
  userId: string | null;
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
  // id аккаунта покупателя — его кладёт /api/checkout при создании
  // сессии (гейт покупки, подэтап D). У сессий, созданных до этого,
  // поля нет — тогда заказ остаётся привязан только к email.
  client_reference_id?: string | null;
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

  // Сумма ноль — законный заказ, а не порченая сессия: корзина может
  // состоять из одних бесплатных карт. Отсекаем только отсутствующее и
  // отрицательное (см. ту же правку у позиций в
  // buildPaidOrderFromSession — там нулевая цена стоила покупателю
  // пропавшей карты).
  const totalCents = session.amount_total;
  if (typeof totalCents !== "number" || totalCents < 0) return null;

  return {
    stripeSessionId: session.id,
    // Email Stripe собирает сам на своей странице оплаты. Пустым он для
    // оплаченной сессии не бывает, но колонка not null — подстрахуемся.
    customerEmail: session.customer_details?.email ?? "unknown",
    userId: session.client_reference_id ?? null,
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
    // Цена НОЛЬ — это бесплатная карта, полноценная позиция заказа.
    // Здесь стояло `<= 0`, и оно молча выбрасывало её из заказа: купив
    // разом платную и бесплатную, покупатель получал уведомление об
    // одной и видел в My purchases одну. Условие писалось, когда все
    // карты стоили денег, и «нет цены» с «цена ноль» тогда совпадали.
    // Отсутствие цены ловит проверка типа, отрицательную — знак.
    if (!productId || typeof unitAmountCents !== "number" || unitAmountCents < 0) continue;

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
  const { data, error } = await getSupabaseAdmin().rpc("record_paid_order", {
    p_stripe_session_id: input.stripeSessionId,
    p_customer_email: input.customerEmail,
    p_user_id: input.userId,
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

  // Уведомления — ровно один раз на заказ. Функция возвращает id только
  // ТОМУ, кто действительно создал строку; пришедший вторым (вебхук
  // против страницы успеха) получает null. Без этой проверки покупатель
  // получал бы «спасибо за покупку» дважды за один платёж.
  if (data) await notifyAboutPurchase(input);
}

/**
 * Кому что сказать о состоявшейся покупке: покупателю — что заказ
 * оплачен и файлы уже в его кабинете, каждому автору — что его карту
 * купили.
 *
 * Отдельной функцией и без throw: деньги уже списаны, заказ записан, и
 * ни одна ошибка почтового ящика не должна превращаться в ошибку
 * вебхука — Stripe воспримет её как «не доставлено» и начнёт ретраить
 * то, что уже сделано.
 */
async function notifyAboutPurchase(input: PaidOrderInput): Promise<void> {
  try {
    const titles = input.items.map((item) => item.title);

    // Гостевой заказ (userId null) уведомлять некому — у покупателя нет
    // аккаунта. Он получает письмо от Stripe и ссылку на странице успеха.
    if (input.userId) {
      await notify(input.userId, {
        kind: "purchase",
        title:
          titles.length === 1
            ? `You bought “${titles[0]}”`
            : `You bought ${titles.length} maps`,
        body: `${titles.join(", ")} — the files are in your purchases.`,
        href: "/purchases",
      });
    }

    // Авторов берём из products, а не из позиций заказа: в order_items
    // лежит снимок названия и цены, но не автор.
    const { data: products, error } = await getSupabaseAdmin()
      .from("products")
      .select("id, title, creator_id")
      .in(
        "id",
        input.items.map((item) => item.productId)
      );

    if (error) {
      console.error("Уведомление автору: чтение карт не удалось:", error.message);
      return;
    }

    for (const product of products ?? []) {
      const creatorId = product.creator_id as string | null;
      if (!creatorId) continue;
      // Себе о своей же покупке не пишем: купить свою карту нельзя, но
      // случай дешевле исключить, чем потом объяснять.
      if (creatorId === input.userId) continue;

      await notify(creatorId, {
        kind: "map_sold",
        title: `“${product.title}” just sold`,
        body: null,
        href: "/resources",
      });
    }
  } catch (err) {
    console.error(
      "Уведомления о покупке не отправлены:",
      err instanceof Error ? err.message : err
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
 * Имя, под которым файл карты ложится на диск: название карты + то
 * расширение, с которым его загрузил креатор.
 *
 * Расширение берём из пути в Storage, а не из названия: `.zip`,
 * `.schem` и `.schematic` — разные вещи, и подменять их нельзя.
 * Название чистим до безопасного набора символов — в имя файла едет
 * произвольный пользовательский текст, а в нём бывают и слэши, и
 * кавычки, и всё то, что ломает Content-Disposition.
 */
export function downloadFileName(title: string, filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  const extension = dot > -1 ? filePath.slice(dot).toLowerCase() : "";
  const safeTitle =
    title
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "map";
  return `${safeTitle}${extension}`;
}

/**
 * Временная ссылка на файл из приватного бакета. null — файл не найден
 * (не загружен или путь в products.file_path указывает мимо).
 *
 * Вызывать ТОЛЬКО после проверки оплаты (getPaidOrder): сама функция
 * прав не проверяет, она просто подписывает путь служебным ключом.
 *
 * downloadAs — имя, под которым файл ляжет на диск. В Storage объекты
 * зовутся по сгенерированному пути (uuid и время загрузки), и без этого
 * человек получает papka с именем вида `a3f9…-1753.zip` и не понимает,
 * какая из десяти скачанных карт какая. Supabase кладёт имя в
 * Content-Disposition подписанной ссылки.
 */
export async function signedDownloadUrl(
  filePath: string,
  downloadAs?: string
): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(PRODUCT_FILES_BUCKET)
    .createSignedUrl(filePath, DOWNLOAD_URL_TTL_SECONDS, {
      download: downloadAs ?? true,
    });

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
    products: { file_path: string | null } | { file_path: string | null }[] | null;
  };

  return {
    customerEmail: data.customer_email,
    totalCents: Number(data.total_cents),
    currency: data.currency,
    items: ((data.order_items ?? []) as ItemRow[]).map((item) => {
      const product = unwrapOne(item.products);
      return {
        title: item.title,
        priceCents: Number(item.price_cents),
        quantity: Number(item.quantity),
        filePath: product?.file_path ?? null,
      };
    }),
  };
}

// Одна купленная карта в списке "My purchases": название — снимок на
// момент покупки (order_items.title), slug — ссылка на страницу товара,
// filePath — путь к файлу для подписанной ссылки на скачивание.
export type PurchasedItem = {
  productId: string;
  title: string;
  slug: string | null;
  filePath: string | null;
};

/**
 * Все купленные пользователем карты — для страницы профиля. Берём
 * заказы двумя способами и объединяем:
 *   1) по user_id — заказы, сделанные уже под аккаунтом;
 *   2) по email среди ГОСТЕВЫХ заказов (user_id null) — покупки до
 *      регистрации на ту же почту «подтягиваются» в профиль (решение
 *      2026-07-24: связывать гостевые заказы по email).
 * Дубли по товару схлопываем: карта покупается один раз, в списке она
 * одна, даже если попала в несколько заказов.
 *
 * Только сервер: orders/order_items закрыты RLS, читает service_role.
 */
export async function getPurchasesForUser(
  userId: string,
  email: string
): Promise<PurchasedItem[]> {
  const db = getSupabaseAdmin();
  const select = "order_items(product_id, title, products(slug, file_path))";

  const [byUser, byEmail] = await Promise.all([
    db.from("orders").select(select).eq("status", "paid").eq("user_id", userId),
    db
      .from("orders")
      .select(select)
      .eq("status", "paid")
      .is("user_id", null)
      .eq("customer_email", email),
  ]);

  if (byUser.error) throw new Error(`Не удалось загрузить покупки: ${byUser.error.message}`);
  if (byEmail.error) throw new Error(`Не удалось загрузить покупки: ${byEmail.error.message}`);

  type OrderRow = {
    order_items:
      | {
          product_id: string;
          title: string;
          products:
            | { slug: string | null; file_path: string | null }
            | { slug: string | null; file_path: string | null }[]
            | null;
        }[]
      | null;
  };

  const byProduct = new Map<string, PurchasedItem>();
  for (const order of [...(byUser.data ?? []), ...(byEmail.data ?? [])] as OrderRow[]) {
    for (const item of order.order_items ?? []) {
      if (byProduct.has(item.product_id)) continue;
      const product = unwrapOne(item.products);
      byProduct.set(item.product_id, {
        productId: item.product_id,
        title: item.title,
        slug: product?.slug ?? null,
        filePath: product?.file_path ?? null,
      });
    }
  }

  return Array.from(byProduct.values());
}
