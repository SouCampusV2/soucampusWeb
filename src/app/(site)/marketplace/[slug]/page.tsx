import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sanitizeDescription } from "@/lib/sanitize";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getAllProducts, getProduct, getProductStats } from "@/lib/products";
import { creatorHref, getCreatorsById } from "@/lib/creators";
import { getViewCount, VIEW_PATHS } from "@/lib/views";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductGallery } from "@/components/ProductGallery";
import { RICH_TEXT_CLASS } from "@/lib/rich-text";
import { BackLink } from "@/components/BackLink";
import { INLINE_LINK } from "@/components/Button";
import { StarRating } from "@/components/StarRating";
import { ProductSpecs } from "@/components/ProductSpecs";

// Одна карта — один поход в базу за рендер.
//
// Next вызывает generateMetadata и сам компонент страницы отдельно, и оба
// просят одну и ту же карту по одному и тому же slug. Без обёртки это два
// последовательных запроса к Supabase ради одинакового ответа: на сборке
// они умножаются на число карт в каталоге, а при рендере по требованию
// человек ждёт оба.
//
// cache() дедуплицирует в пределах ОДНОГО рендера: второй вызов с тем же
// аргументом получает результат первого, между разными запросами ничего
// не хранится. Ровно тот же приём и по той же причине уже применён к
// getUser() в lib/current-user.ts.
//
// Обёртка стоит здесь, а не на самом getProduct в lib/products.ts,
// намеренно: тот модуль импортируют семь клиентских компонентов (им нужны
// типы и категории), а cache() — серверный API React, и тащить его в
// клиентский бандл незачем.
//
// Разбор и что делать с каталогом дальше — docs/ARCHITECTURE.md § 7.1.
const getProductOnce = cache(getProduct);

// Страницы товаров собираются заранее, как и работы портфолио.
//
// ⚠️ Отдаём ВЕСЬ каталог: на десяти картах это незаметно, на тысяче станет
// заметно, на десяти тысячах — дорого. Варианты (отдавать только ходовые,
// перевести на revalidatePath) с замерами — docs/ARCHITECTURE.md § 7.1.
// Сознательно не трогаем, пока карт десяток.
export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductOnce(slug);
  if (!product) return { title: "Not found" };

  const description = `${product.summary} ${product.price} — instant download.`;

  // og:image — фото самого товара, как у страниц работ: ссылка в Discord
  // показывает реальный билд, а не брендовую заглушку.
  return {
    title: product.title,
    description,
    alternates: { canonical: `/marketplace/${product.slug}` },
    openGraph: {
      type: "article",
      title: product.title,
      description,
      url: `/marketplace/${product.slug}`,
      images: [{ url: product.image, alt: product.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductOnce(slug);
  if (!product) notFound();

  // Агрегаты для этого товара (оценки/покупки). Устойчиво: если статистика
  // недоступна — нули, страница не падает.
  const stats = (await getProductStats()).get(product.id);

  // Автор. getProduct отдаёт только creatorId — связать products с
  // profiles вложенной выборкой PostgREST нельзя (внешний ключ ведёт на
  // закрытую RLS таблицу, см. lib/creators.ts), поэтому профиль
  // приезжает отдельным запросом. На витрине это же делает
  // getAllProductsWithStats; здесь карта одна, и тянуть ради неё
  // весь каталог незачем.
  const creator = product.creatorId
    ? (await getCreatorsById()).get(product.creatorId)
    : undefined;

  // Просмотры. Считаются с самого появления витрины — трекер в layout
  // группы (site) шлёт сюда сигнал, а /marketplace/<slug> и так стоит в
  // белом списке (view-paths.ts). Не хватало только показа, поэтому
  // число сразу непустое, а не начинается с нуля.
  //
  // Один посетитель — единица, сколько бы раз ни открыл: строка в
  // page_views уникальна по тройке (страница, посетитель, день).
  const views = await getViewCount(VIEW_PATHS.product(slug));
  const rating = stats?.rating ?? 0;
  const ratingCount = stats?.ratingCount ?? 0;
  const salesCount = stats?.salesCount ?? 0;

  return (
    <main className="w-full mx-auto max-w-[120rem] flex-1 px-6 py-16 sm:px-10 sm:py-28 lg:px-16 xl:px-24 2xl:px-[120px]">
      <BackLink href="/marketplace">All products</BackLink>

      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
        {product.title}
      </h1>
      {/* Автор берётся из самой карты, а не пишется здесь руками.
          До 2026-08-21 тут стояло захардкоженное «SouCampus» со ссылкой
          на его профиль: пока автор один, это работало и выглядело
          правдой. С первым чужим автором стало бы прямым враньём —
          чужая карта под нашим именем. */}
      {creator && (
        <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          by{" "}
          <Link
            href={creatorHref(creator.handle)}
            className={`inline-flex items-center gap-1 ${INLINE_LINK}`}
          >
            {creator.username}
            {creator.isVerified && <SealCheck size={13} weight="fill" aria-hidden />}
          </Link>
        </p>
      )}
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">{product.summary}</p>

      {/* Рейтинг + покупки — под заголовком, как на витрине. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5">
          <StarRating rating={rating} size={16} />
          <span className="text-zinc-500 dark:text-zinc-400">
            {ratingCount
              ? `${rating.toFixed(1)} (${ratingCount} rating${ratingCount === 1 ? "" : "s"})`
              : "Not yet rated"}
          </span>
        </div>
        <span className="text-zinc-400 dark:text-zinc-600" aria-hidden>
          ·
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {salesCount} {salesCount === 1 ? "purchase" : "purchases"}
        </span>
      </div>

      {/* Двухколоночная разметка в духе торговых площадок (BuiltByBit и
          подобные): фото + описание — основной контент слева, цена и
          покупка — небольшая липкая карточка справа, всегда на виду,
          пока листаешь длинное описание. На мобильном — просто друг под
          другом (карточка покупки выше, description ниже), сайдбар не
          нужен на узком экране, где и так всё в одну колонку. */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Обложка + скриншоты работы одной галереей: большой кадр и
              лента миниатюр под ним (см. ProductGallery). */}
          <ProductGallery
            images={product.images?.length ? product.images : [product.image]}
            title={product.title}
          />

          {/* Подзаголовок секции, а не заголовок страницы — стандартный H3
              из DESIGN.md (был придуманный на глаз text-xl). */}
          <h2 className="mt-10 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Description
          </h2>
          {/* Описание — HTML из редактора креатора (Tiptap, см.
              UploadMapForm): заголовки, списки, картинки между блоками,
              таблицы версий. Санитизация обязательна и без исключений —
              это контент постороннего пользователя, который увидит
              каждый посетитель. Белый список тегов и разбор правил — в
              sanitize.ts, общий с админкой модерации: модератор обязан
              видеть ровно то, что получит покупатель.
              Стили — общая константа с редактором, чтобы креатор вёрстку
              видел так же, как покупатель. */}
          <div
            className={`mt-4 leading-7 text-zinc-700 dark:text-zinc-300 ${RICH_TEXT_CLASS}`}
            dangerouslySetInnerHTML={{ __html: sanitizeDescription(product.description) }}
          />
        </div>

        {/* top-24: чуть ниже навбара (sticky top-4 + его высота), не
            вплотную к нему при скролле. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <p className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
              {product.price}
            </p>

            <div className="mt-6">
              <AddToCartButton
                productId={product.id}
                product={{
                  slug: product.slug,
                  title: product.title,
                  price: product.price,
                  priceCents: product.priceCents,
                  image: product.image,
                }}
              />
            </div>

            <dl className="mt-6 space-y-3 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Delivery</dt>
                <dd className="font-medium text-zinc-950 dark:text-zinc-50">
                  Instant download
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Format</dt>
                <dd className="font-medium text-zinc-950 dark:text-zinc-50">World file</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Need help?</dt>
                <dd>
                  <Link
                    href="/support"
                    className={`font-medium ${INLINE_LINK}`}
                  >
                    Support
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          {/* Характеристики — ПОД карточкой покупки, а не над ней.
              Порядок отвечает на вопросы в том порядке, в каком их
              задают: сначала «сколько и как купить», потом «а подойдёт
              ли мне». Блок сам решает, что показывать: пустые поля не
              рисуются вовсе (см. ProductSpecs). */}
          <ProductSpecs
            specs={product.specs}
            updatedAt={product.updatedAt}
            salesCount={salesCount}
            views={views}
          />
        </aside>
      </div>
    </main>
  );
}
