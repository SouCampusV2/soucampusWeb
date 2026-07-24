import { NextResponse } from "next/server";
import { getProduct } from "@/lib/products";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";
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
    metadata: { user_id: user.id },
    // {CHECKOUT_SESSION_ID} подставляет сам Stripe при редиректе — так
    // страница успеха получает ключ к заказу, не полагаясь на cookie.
    success_url: `${base}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/cart`,
  });

  // session.url — адрес страницы оплаты на домене Stripe. Данные карты
  // вводятся там, наш сервер их не видит и не хранит — это и есть
  // главная причина выбрать Checkout, а не собственную форму оплаты.
  return NextResponse.json({ url: session.url });
}
