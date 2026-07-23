import { NextResponse } from "next/server";
import { getProduct } from "@/lib/products";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";

// Создание Stripe Checkout Session. Выполняется на каждый запрос —
// сессия персональная, кэшировать нечего.
export const dynamic = "force-dynamic";

// Главное правило маршрута: из браузера принимается ТОЛЬКО slug.
// Цена, название, валюта — из нашей БД. Если принимать цену из тела
// запроса, любой посетитель открыл бы DevTools и купил карту за €0.01 —
// это самая известная дыра самодельных чекаутов.
//
// Тот же шаблон slug'а, что в isTrackablePath: строчные латинские буквы,
// цифры, дефис. Всё остальное — мусор, до БД не доходит.
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

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
  let slug: unknown;
  try {
    ({ slug } = await request.json());
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: "bad slug" }, { status: 400 });
  }

  // getProduct ходит под anon-ключом, то есть через RLS: неопубликованный
  // товар отсюда не виден и купить его нельзя, даже зная slug.
  const product = await getProduct(slug);
  if (!product) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  const base = returnBase(request);

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    // Товар описываем по данным из БД прямо в сессии (price_data), а не
    // заводим каталог в Stripe: источник правды о ценах один — наша
    // таблица products, синхронизировать два каталога не нужно.
    line_items: [
      {
        price_data: {
          currency: product.currency.toLowerCase(),
          unit_amount: product.priceCents,
          product_data: {
            name: product.title,
            images: [`${SITE_URL}${product.image}`],
          },
        },
        quantity: 1,
      },
    ],
    // По metadata вебхук и страница успеха узнают, ЧТО куплено. Кладём
    // и id, и title: id — внешний ключ для order_items, title — снимок
    // названия на момент покупки.
    metadata: {
      product_id: product.id,
      product_slug: product.slug,
      product_title: product.title,
    },
    // {CHECKOUT_SESSION_ID} подставляет сам Stripe при редиректе — так
    // страница успеха получает ключ к заказу, не полагаясь на cookie.
    success_url: `${base}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/shop/${product.slug}`,
  });

  // session.url — адрес страницы оплаты на домене Stripe. Данные карты
  // вводятся там, наш сервер их не видит и не хранит — это и есть
  // главная причина выбрать Checkout, а не собственную форму оплаты.
  return NextResponse.json({ url: session.url });
}
