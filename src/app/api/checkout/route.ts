import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getProduct } from "@/lib/products";
import { freeOrderKey, recordPaidOrder } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";
import { WAIVER_STRIPE_NOTE, WAIVER_VERSION } from "@/lib/legal";
import { createSupabaseServer } from "@/lib/supabase-server";

// Создание Stripe Checkout Session. Выполняется на каждый запрос —
// сессия персональная, кэшировать нечего.
export const dynamic = "force-dynamic";

// Главное правило маршрута: из браузера принимается ТОЛЬКО slug.
// Цена, название, валюта — всегда из нашей БД. Принимать цену из тела
// запроса значило бы дать любому посетителю открыть DevTools и купить
// карту за €0.01 — самая известная дыра самодельных чекаутов.
//
// Количества нет вовсе: карту покупаешь один раз (не расходник), каждая
// позиция в Stripe-сессии всегда quantity: 1 — см. lineItems ниже.
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

// Разных позиций в одном заказе. Не про размер корзины пользователя
// (это его дело), а про то, что line_items у Stripe не резиновый —
// разумный потолок, чтобы один запрос не собирал сессию из тысячи строк.
const MAX_DISTINCT_ITEMS = 20;

function parseSlugs(body: unknown): string[] | null {
  if (!body || typeof body !== "object" || !("items" in body)) return null;
  const { items } = body as { items: unknown };
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_DISTINCT_ITEMS) {
    return null;
  }

  const slugs: string[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") return null;
    const { slug } = raw as { slug?: unknown };
    if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) return null;
    slugs.push(slug);
  }

  // Дубли slug'а в присланном массиве (не должно случаться при обычной
  // работе корзины, но сервер не полагается на аккуратность клиента) —
  // одна и та же карта не может быть двумя позициями заказа.
  return Array.from(new Set(slugs));
}

// Куда Stripe вернёт покупателя. На проде — SITE_URL, на localhost и
// Vercel Preview — origin запроса, иначе после тестовой оплаты человек
// улетал бы с превью на прод. Белый список, а не слепое доверие
// заголовку: origin приходит от клиента, и подставной origin означал бы
// редирект покупателя после оплаты на чужой сайт.
function returnBase(request: Request): string {
  const origin = new URL(request.url).origin;
  const allowed =
    origin === SITE_URL ||
    origin.startsWith("http://localhost") ||
    origin.endsWith(".vercel.app");
  return allowed ? origin : SITE_URL;
}

export async function POST(request: Request) {
  // Гейт: покупка только с аккаунтом (решено 2026-07-24). Серверная
  // проверка — настоящая защита; клиент лишь заранее уводит на /login
  // для удобства, но обойти этот 401 из браузера нельзя.
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  // Лимит — после проверки входа и до самой работы: расходовать
  // счёт должен тот, кого мы уже опознали, а работа не должна
  // начинаться, если слота нет.
  const limited = await enforceRateLimit("checkout", user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const slugs = parseSlugs(body);
  if (!slugs) {
    return NextResponse.json({ error: "bad items" }, { status: 400 });
  }

  // getProduct ходит под anon-ключом, то есть через RLS: неопубликованный
  // товар отсюда не виден и купить его нельзя, даже зная slug. Продукты,
  // которых нет (удалённый slug, опечатка), просто выпадают — покупатель
  // не должен потерять всю корзину из-за одной неверной позиции.
  const products = await Promise.all(slugs.map((slug) => getProduct(slug)));

  const lineItems = products
    .filter((product): product is NonNullable<(typeof products)[number]> => product !== null)
    .map((product) => ({
      quantity: 1,
      price_data: {
        currency: product.currency.toLowerCase(),
        unit_amount: product.priceCents,
        product_data: {
          name: product.title,
          images: [`${SITE_URL}${product.image}`],
          // Metadata на КАЖДОЙ строке, не на сессии целиком: у корзины
          // может быть несколько товаров, а session-level metadata на всех
          // сразу не разложить (и она не привязана к конкретной строке).
          // Вебхук потом читает этот id из price.product при разборе
          // line_items (см. orders.ts).
          metadata: { product_id: product.id },
        },
      },
    }));

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "no valid products" }, { status: 404 });
  }

  // ── Бесплатные карты идут МИМО Stripe ────────────────────────────────
  //
  // Почему это вообще нужно: платёжный режим Stripe требует суммы не ниже
  // минимальной, и сессия на 0 не создаётся. До 2026-08-26 бесплатная
  // карта покупалась только «прицепом» к платной — в одиночку она
  // упиралась в отказ Stripe, то есть скачать её было нельзя вовсе.
  //
  // ⚠️ Ветку выбирает СЕРВЕР по цене из НАШЕЙ базы, а не клиент. Это не
  // придирка: отдельный роут «дай бесплатно» означал бы вторую дверь,
  // которую пришлось бы запирать своим замком, и однажды один из двух
  // замков отстал бы. Здесь же «бесплатно» физически не может относиться
  // к платной карте — сумма считается из тех же priceCents, что ушли бы
  // в Stripe.
  //
  // Цены отрицательными не бывают (check price_cents >= 0 в схеме),
  // поэтому нулевая сумма и значит «все позиции бесплатны».
  const totalCents = lineItems.reduce(
    (sum, item) => sum + item.price_data.unit_amount,
    0
  );

  if (totalCents === 0) {
    const freeProducts = products.filter(
      (product): product is NonNullable<(typeof products)[number]> => product !== null
    );

    // Заказ на КАЖДУЮ карту отдельно, а не один общий. Так ключ
    // (freeOrderKey) описывает ровно «этот человек, эта карта», и
    // уникальный индекс на stripe_session_id сам не даёт получить одну
    // карту дважды. Общий заказ на набор такого ключа не имеет: сегодня
    // взяли {A}, завтра {A, B} — и A уехала бы в /purchases второй раз.
    //
    // Последовательно, а не Promise.all: записей единицы, а параллельные
    // вставки в одну таблицу ради экономии миллисекунд — не та цена,
    // которую стоит платить за менее предсказуемый порядок в логах.
    for (const product of freeProducts) {
      await recordPaidOrder({
        stripeSessionId: freeOrderKey(product.id, user.id),
        // Колонка not null. Аккаунт без почты у нас невозможен, но
        // подстраховка стоит дешевле упавшей записи.
        customerEmail: user.email ?? "unknown",
        userId: user.id,
        totalCents: 0,
        currency: product.currency.toUpperCase(),
        items: [
          {
            productId: product.id,
            // Снимок названия на момент получения — как у платного
            // заказа: карту могут переименовать, а в списке покупок
            // должно остаться то, что человек взял.
            title: product.title,
            priceCents: 0,
            quantity: 1,
          },
        ],
      });
    }

    // Адреса наружу не отдаём вовсе — клиент сам уходит на /purchases.
    // Возвращать сюда ссылку значило бы отдать браузеру строку, которую
    // он подставит в window.location: у платного пути её приходится
    // проверять на https, а здесь проверять просто нечего.
    return NextResponse.json({ claimed: true });
  }

  // Отказ от права на отзыв (2026-09-26, lib/legal.ts). Галочку в
  // корзине и у «Buy now» можно обойти запросом из консоли — поэтому
  // решает сервер: платного заказа без согласия нет. Бесплатным картам
  // оно не нужно (возвращать нечего), поэтому проверка стоит ПОСЛЕ
  // бесплатной ветки.
  //
  // ⚠️ Не через consent_collection Stripe, хотя аудит 25.09 предлагал
  // его: тот требует адрес Terms в настройках Dashboard и без него
  // отказывает в создании Checkout ЦЕЛИКОМ. Одна незаполненная
  // настройка в любом из двух аккаунтов (test / live) — и покупки
  // ломаются. Своя галочка от чужих настроек не зависит.
  const waiver =
    typeof body === "object" && body !== null && (body as { waiver?: unknown }).waiver === true;
  if (!waiver) {
    return NextResponse.json(
      {
        error: "waiver required",
        message: "Please tick the box about immediate delivery to continue.",
      },
      { status: 400 }
    );
  }

  // Доказательство согласия — В МЕТАДАННЫХ ПЛАТЕЖА, а не только сессии:
  // спор о списании в Stripe открывается на платёж, и метаданные сессии
  // туда сами не переезжают. Версия — чтобы через год было видно, НА
  // КАКОЙ текст поставлена галочка.
  const consent = {
    user_id: user.id,
    withdrawal_waiver: "accepted",
    withdrawal_waiver_version: WAIVER_VERSION,
    withdrawal_waiver_at: new Date().toISOString(),
  };

  const base = returnBase(request);

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    // Личность покупателя. Заказ пока пишется в orders как раньше (по
    // email), но эти поля кладём уже сейчас, чтобы связать заказ с
    // аккаунтом, когда будем делать "My purchases": customer_email
    // предзаполняет форму Stripe и направляет чек; client_reference_id и
    // metadata.user_id несут id аккаунта в вебхук.
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: consent,
    payment_intent_data: { metadata: consent },
    // Напоминание под кнопкой оплаты на стороне Stripe — тот же смысл,
    // что у галочки. Не зависит от настроек Dashboard.
    custom_text: { submit: { message: WAIVER_STRIPE_NOTE } },
    // {CHECKOUT_SESSION_ID} подставляет сам Stripe при редиректе — так
    // страница успеха получает ключ к заказу, не полагаясь на cookie.
    success_url: `${base}/marketplace/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/cart`,
  });

  // session.url — адрес страницы оплаты на домене Stripe. Данные карты
  // вводятся там, наш сервер их не видит и не хранит — это и есть
  // главная причина выбрать Checkout, а не собственную форму оплаты.
  return NextResponse.json({ url: session.url });
}
