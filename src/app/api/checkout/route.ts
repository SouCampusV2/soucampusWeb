import { NextResponse } from "next/server";
import { getProduct } from "@/lib/products";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";

// Создание Stripe Checkout Session. Выполняется на каждый запрос —
// сессия персональная, кэшировать нечего.
export const dynamic = "force-dynamic";

// Главное правило маршрута: из браузера принимаются ТОЛЬКО slug + quantity.
// Цена, название, валюта — всегда из нашей БД. Принимать цену из тела
// запроса значило бы дать любому посетителю открыть DevTools и купить
// карту за €0.01 — самая известная дыра самодельных чекаутов.
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

// Независимый от клиентского MAX_QUANTITY_PER_ITEM (cart-context.tsx)
// потолок: сервер не доверяет тому, что прислал браузер, даже если это
// число, а не цена — проверяет свой предел заново.
const MAX_QUANTITY_PER_ITEM = 5;
// Разных позиций в одном заказе. Не про размер корзины пользователя
// (это его дело), а про то, что line_items у Stripe не резиновый —
// разумный потолок, чтобы один запрос не собирал сессию из тысячи строк.
const MAX_DISTINCT_ITEMS = 20;

type CartItemRequest = { slug: string; quantity: number };

function parseItems(body: unknown): CartItemRequest[] | null {
  if (!body || typeof body !== "object" || !("items" in body)) return null;
  const { items } = body as { items: unknown };
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_DISTINCT_ITEMS) {
    return null;
  }

  const parsed: CartItemRequest[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") return null;
    const { slug, quantity } = raw as { slug?: unknown; quantity?: unknown };
    if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) return null;
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_ITEM
    ) {
      return null;
    }
    parsed.push({ slug, quantity });
  }

  // На случай дублей slug'а в присланном массиве (не должно случаться при
  // нормальной работе корзины, но сервер не полагается на аккуратность
  // клиента) — схлопываем в одну позицию, сложив количество.
  const bySlug = new Map<string, number>();
  for (const item of parsed) {
    bySlug.set(item.slug, Math.min((bySlug.get(item.slug) ?? 0) + item.quantity, MAX_QUANTITY_PER_ITEM));
  }
  return Array.from(bySlug, ([slug, quantity]) => ({ slug, quantity }));
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const requested = parseItems(body);
  if (!requested) {
    return NextResponse.json({ error: "bad items" }, { status: 400 });
  }

  // getProduct ходит под anon-ключом, то есть через RLS: неопубликованный
  // товар отсюда не виден и купить его нельзя, даже зная slug. Продукты,
  // которых нет (удалённый slug, опечатка), просто выпадают — покупатель
  // не должен потерять всю корзину из-за одной неверной позиции.
  const products = await Promise.all(requested.map((r) => getProduct(r.slug)));

  const lineItems = requested
    .map((r, i) => ({ request: r, product: products[i] }))
    .filter((x): x is { request: CartItemRequest; product: NonNullable<(typeof products)[number]> } =>
      x.product !== null
    )
    .map(({ request: r, product }) => ({
      quantity: r.quantity,
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
