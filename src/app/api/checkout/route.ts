import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getProduct } from "@/lib/products";
import { checkoutEnv, freeOrderKey, recordPaidOrder } from "@/lib/orders";
import { hasPurchased } from "@/lib/purchases";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";
import { WAIVER_STRIPE_NOTE, WAIVER_VERSION } from "@/lib/legal";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
//
// ⚠️ Список ТОЧНЫЙ (аудит 2026-11, S-10). Раньше здесь стояли
// startsWith("http://localhost") и endsWith(".vercel.app") — первое
// пропускало и http://localhost.evil.com, второе — любой чужой проект
// на Vercel. Сегодня подставить такой origin нечем (Vercel направляет к
// нам только наши домены), но проверка не должна держаться на чужой
// маршрутизации.
const LOCAL_ORIGINS = ["http://localhost:3000", "http://localhost:3001"];

// Адреса этого деплоя и его ветки — их называет сам Vercel (системные
// переменные, без протокола). Шаблон ниже — запасной путь на случай,
// когда переменные выключены в настройках проекта: только НАШИ превью.
const OWN_PREVIEW = /^https:\/\/soucampus-builds-[a-z0-9-]+-sou-campus\.vercel\.app$/;

function returnBase(request: Request): string {
  const origin = new URL(request.url).origin;
  const vercel = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`);
  const allowed =
    origin === SITE_URL ||
    LOCAL_ORIGINS.includes(origin) ||
    vercel.includes(origin) ||
    OWN_PREVIEW.test(origin);
  return allowed ? origin : SITE_URL;
}

// Адрес обложки для страницы оплаты Stripe. У засеянных карт путь
// относительный («/portfolio/x.png») — к нему нужен домен. У карты
// креатора это уже полный адрес Storage, и приклеивать к нему домен
// значит получить «https://soucampus.onlinehttps://…» (аудит 2026-11,
// S-09): Stripe такой адрес не примет, и карта не купится.
function absoluteImage(image: string): string {
  return image.startsWith("/") ? `${SITE_URL}${image}` : image;
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
  // не должен потерять всю корзину из-за одной неверной позиции. С 04.11
  // корзина сама красит такие позиции серым и не присылает их сюда (см.
  // CartAvailability.tsx), но этот фильтр остаётся: список в корзине
  // может отставать на минуту кэша, и решает всё равно сервер.
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
          images: [absoluteImage(product.image)],
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

  // ── Своё и уже купленное не продаём (аудит 2026-11, S-05) ────────────
  //
  // Обе проверки раньше жили только в браузере («You already own this
  // map» на кнопке страницы карты), а корзина и сервер о них не знали.
  // Итог — два разных вреда:
  //   - покупатель платил за одну карту дважды (лежала в корзине, купил
  //     кнопкой Buy now, потом оплатил корзину), и возврат с невозвратной
  //     комиссией Stripe доставался владельцу;
  //   - автор «брал» собственную карту и становился её покупателем: +1 к
  //     продажам и право писать под ней от лица купившего.
  //
  // Отказ, а не молчаливое выбрасывание позиции: человек должен увидеть,
  // ПОЧЕМУ заказ не тот, что в корзине (тот же довод, что у серых
  // позиций в CartAvailability).
  const wanted = products.filter(
    (product): product is NonNullable<(typeof products)[number]> => product !== null
  );

  // ── Карта, которая продаётся на BuiltByBit, у нас не покупается (24.11).
  // Кнопки «Add to cart» у неё нет, но в корзине она могла остаться с тех
  // пор, как ссылки ещё не было.
  const external = wanted.find((product) => product.buyUrl);
  if (external) {
    return NextResponse.json(
      {
        error: "sold elsewhere",
        message: `“${external.title}” is sold on BuiltByBit. Remove it from the order and buy it there.`,
      },
      { status: 409 }
    );
  }

  // ── Заблокированный файл не продаём (24.11) ──────────────────────────
  //
  // Block file в админке отнимал скачивание у купивших, но карта
  // оставалась на витрине и оплата проходила: с живыми платежами это
  // деньги за файл, который никто не получит. Флаг читаем служебным
  // ключом: он про отдачу файла, а не про витрину, и в Product его нет.
  const { data: blockedRows } = await getSupabaseAdmin()
    .from("products")
    .select("title")
    .in(
      "id",
      wanted.map((product) => product.id)
    )
    .eq("file_blocked", true);
  if (blockedRows && blockedRows.length > 0) {
    return NextResponse.json(
      {
        error: "file blocked",
        message: `“${blockedRows[0].title}” can't be bought right now. Remove it from the order.`,
      },
      { status: 409 }
    );
  }

  const own = wanted.find((product) => product.creatorId === user.id);
  if (own) {
    return NextResponse.json(
      {
        error: "own map",
        message: `“${own.title}” is your own map. Remove it from the order.`,
      },
      { status: 409 }
    );
  }

  // Только платные: повторное получение бесплатной и так ничего не
  // создаёт (уникальный ключ free:<карта>:<человек>), отказывать не в чем.
  for (const product of wanted) {
    if (product.priceCents === 0) continue;
    if (await hasPurchased(product.id, user.id, user.email)) {
      return NextResponse.json(
        {
          error: "already owned",
          message: `You already own “${product.title}”. It's in My purchases. Remove it from the order.`,
        },
        { status: 409 }
      );
    }
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
    // В какой среде создана оплата — чтобы вебхук другой среды того же
    // аккаунта Stripe не пытался записать её к себе (orders.ts, S-11).
    env: checkoutEnv(),
  };

  const base = returnBase(request);

  // Отказ Stripe — не авария сервера (аудит 2026-11, S-09). Без этого
  // try любая его ошибка (сумма ниже минимума, недоступность) уходила
  // наружу голым 500. Текст ошибки — только в лог: в нём бывают
  // подробности нашего аккаунта.
  let session;
  try {
    session = await getStripe().checkout.sessions.create({
    mode: "payment",
    // Страница оплаты живёт 30 минут, а не сутки по умолчанию (аудит
    // 2026-11, S-06). Цена и доступность проверены СЕЙЧАС; за сутки карту
    // могли снять или подорожать, а оплатить её по открытой странице
    // всё ещё было можно. Полчаса — минимум, который разрешает Stripe;
    // минута сверху — запас на расхождение часов.
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    // ТОЛЬКО мгновенные способы оплаты (2026-09-26). Заказ пишется, когда
    // сессия уже paid (вебхук checkout.session.completed и страница
    // успеха), а событие async_payment_succeeded мы не слушаем. Способ с
    // отложенным подтверждением (SEPA Direct Debit и подобные) дал бы
    // «деньги придут через три дня, а заказ не запишется никогда».
    //
    // Задано ЗДЕСЬ, а не галочками в Stripe Dashboard: без этой строки
    // Checkout берёт способы из настроек аккаунта, и одна включённая там
    // галочка молча открывала бы дыру. Apple Pay и Google Pay — это
    // "card", они работают. Захочется iDEAL, Bancontact и подобных —
    // сначала научить вебхук async_payment_succeeded, потом расширять.
    payment_method_types: ["card"],
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
  } catch (err) {
    console.error("Stripe не создал сессию оплаты:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        error: "payment unavailable",
        message: "We couldn't start the payment. Try again in a minute.",
      },
      { status: 502 }
    );
  }

  // session.url — адрес страницы оплаты на домене Stripe. Данные карты
  // вводятся там, наш сервер их не видит и не хранит — это и есть
  // главная причина выбрать Checkout, а не собственную форму оплаты.
  return NextResponse.json({ url: session.url });
}
