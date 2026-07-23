import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllProducts, getProduct } from "@/lib/products";
import { BuyButton } from "@/components/BuyButton";

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
      <div className="mx-auto max-w-3xl">
        <Link href="/shop" className="text-sm font-medium text-orange-600">
          ← All products
        </Link>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          {product.title}
        </h1>

        <dl className="mt-6 flex flex-wrap gap-8 border-y border-zinc-200 py-4 text-sm dark:border-zinc-800">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Price</dt>
            <dd className="font-semibold text-zinc-950 dark:text-zinc-50">{product.price}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Delivery</dt>
            <dd className="font-semibold text-zinc-950 dark:text-zinc-50">Instant download</dd>
          </div>
        </dl>

        <p className="mt-8 leading-7 text-zinc-700 dark:text-zinc-300">{product.description}</p>

        <div className="relative mt-10 aspect-video overflow-hidden rounded-2xl">
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 768px, 100vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Stripe Checkout (подэтап B): клиентский островок — только
            кнопка, страница остаётся серверной. Цена в label — косметика,
            сумму платежа сервер берёт из БД (см. /api/checkout). */}
        <div className="mt-10">
          <BuyButton slug={product.slug} label={`Buy now — ${product.price}`} />
        </div>
      </div>
    </main>
  );
}
