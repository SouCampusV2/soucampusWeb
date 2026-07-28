import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getAllProducts, getProduct, getProductStats } from "@/lib/products";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductGallery } from "@/components/ProductGallery";

// Страницы товаров собираются заранее, как и работы портфолио.
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
  const product = await getProduct(slug);
  if (!product) return { title: "Not found" };

  const description = `${product.summary} ${product.price} — instant download.`;

  // og:image — фото самого товара, как у страниц работ: ссылка в Discord
  // показывает реальный билд, а не брендовую заглушку.
  return {
    title: product.title,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      type: "article",
      title: product.title,
      description,
      url: `/shop/${product.slug}`,
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
  const product = await getProduct(slug);
  if (!product) notFound();

  // Агрегаты для этого товара (оценки/покупки). Устойчиво: если статистика
  // недоступна — нули, страница не падает.
  const stats = (await getProductStats()).get(product.id);
  const rating = stats?.rating ?? 0;
  const ratingCount = stats?.ratingCount ?? 0;
  const salesCount = stats?.salesCount ?? 0;
  const filledStars = Math.round(rating);

  return (
    <main className="w-full mx-auto max-w-[120rem] flex-1 px-6 py-16 sm:px-10 sm:py-28 lg:px-16 xl:px-24 2xl:px-[120px]">
      <Link href="/shop" className="text-sm font-medium text-orange-600">
        ← All products
      </Link>

      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
        {product.title}
      </h1>
      <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        by{" "}
        <Link
          href="/creator/soucampus"
          className="inline-flex items-center gap-1 text-orange-600 hover:underline dark:text-orange-400"
        >
          SouCampus
          <SealCheck size={13} weight="fill" aria-hidden />
        </Link>
      </p>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">{product.summary}</p>

      {/* Рейтинг + покупки — под заголовком, как на витрине. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star
                key={i}
                size={16}
                weight={i < filledStars ? "fill" : "regular"}
                aria-hidden
                className={
                  i < filledStars
                    ? "text-orange-400"
                    : "text-zinc-300 dark:text-zinc-600"
                }
              />
            ))}
          </div>
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
          <p className="mt-4 leading-7 text-zinc-700 dark:text-zinc-300">
            {product.description}
          </p>
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
                    className="font-medium text-orange-600 hover:underline dark:text-orange-400"
                  >
                    Support
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </main>
  );
}
