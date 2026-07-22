import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Unbounded } from "next/font/google";
import { getAllProducts } from "@/lib/products";

// Тот же дисплейный шрифт, что у hero-заголовков остальных страниц
// (см. DESIGN.md, "Hero-секции страниц").
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

// robots зависит от содержимого: пока опубликованных товаров нет,
// страница остаётся noindex (пустой каталог в выдаче не нужен), а с
// первым товаром сама открывается поисковику — без правки кода.
// Поэтому generateMetadata, а не статический export const metadata.
export async function generateMetadata(): Promise<Metadata> {
  const products = await getAllProducts();
  return {
    title: "Shop",
    description:
      "Ready-made Minecraft maps and builds by SouCampus — download instantly after purchase.",
    alternates: { canonical: "/shop" },
    robots: products.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage() {
  const products = await getAllProducts();

  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 pb-16 sm:pb-28">
      {/* Hero по общему паттерну: pt-20 от навбара, Unbounded, радиальная
          подсветка акцентом страницы (orange — это витрина, то есть CTA). */}
      <section className="relative pt-20">
        <div
          aria-hidden
          className="absolute left-1/2 -top-32 -z-10 h-[36rem] w-full max-w-[90rem] -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.35),transparent_70%)]"
        />
        <h1
          className={`${displayFont.className} text-4xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Shop
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Ready-made maps and builds. Pick one, and it&apos;s yours to download
          — no waiting for a custom order.
        </p>
      </section>

      {products.length === 0 ? (
        // Пустое состояние: таблица есть, товаров ещё нет. Страница при
        // этом остаётся noindex (см. generateMetadata) — как раньше.
        <p className="mt-16 max-w-2xl text-zinc-600 dark:text-zinc-400">
          First products are on the way. Meanwhile, check the{" "}
          <Link href="/portfolio" className="font-medium text-orange-600 underline decoration-2 underline-offset-4">
            portfolio
          </Link>{" "}
          or order a custom build.
        </p>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.slug}
              href={`/shop/${product.slug}`}
              className="group relative block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="relative aspect-video w-full">
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/10 to-transparent" />

                {/* Цена — чип поверх фото, как теги в портфолио: без
                    dark:-вариантов, по DESIGN.md чипы на фото читаются
                    одинаково в обеих темах. */}
                <span className="absolute right-4 top-4 rounded-full bg-[#fbfbff]/90 px-3 py-1 text-xs font-semibold text-zinc-950 backdrop-blur-sm">
                  {product.price}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-5 transition-transform duration-300 group-hover:-translate-y-1">
                  <h3
                    className={`${displayFont.className} text-lg leading-tight text-orange-400`}
                  >
                    {product.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
