import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllProducts, getProduct } from "@/lib/products";
import { AddToCartButton } from "@/components/AddToCartButton";

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

  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 py-16 sm:py-28">
      <Link href="/shop" className="text-sm font-medium text-orange-600">
        ← All products
      </Link>

      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
        {product.title}
      </h1>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">{product.summary}</p>

      {/* Двухколоночная разметка в духе торговых площадок (BuiltByBit и
          подобные): фото + описание — основной контент слева, цена и
          покупка — небольшая липкая карточка справа, всегда на виду,
          пока листаешь длинное описание. На мобильном — просто друг под
          другом (карточка покупки выше, description ниже), сайдбар не
          нужен на узком экране, где и так всё в одну колонку. */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative aspect-video overflow-hidden rounded-2xl">
            <Image
              src={product.image}
              alt={product.title}
              fill
              sizes="(min-width: 1024px) 640px, 100vw"
              className="object-cover"
              priority
            />
          </div>

          <h2 className="mt-10 text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
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
