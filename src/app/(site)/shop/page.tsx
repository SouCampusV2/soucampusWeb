import type { Metadata } from "next";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import { getAllProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ShopShowcaseRow } from "@/components/ShopShowcaseRow";

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

  // Магазин шире портфолио (тест, по просьбе владельца): контейнер растёт
  // до 1920px, по бокам паддинг доходит до 120px на широких экранах; дальше
  // 1920px не расширяется. Портфолио остаётся max-w-6xl.
  return (
    <main className="w-full mx-auto max-w-[120rem] flex-1 overflow-x-clip px-6 pb-16 sm:px-10 sm:pb-28 lg:px-16 xl:px-24 2xl:px-[120px]">
      {/* Hero по общему паттерну: pt-20 от навбара, Unbounded, радиальная
          подсветка акцентом страницы (orange — это витрина, то есть CTA). */}
      <section className="relative pt-20">
        {/* Центрируем через inset-x-0 + mx-auto, а НЕ left-1/2 + -translate-x-1/2:
            связка translate+w-full на мобиле давала субпиксельное переполнение
            по горизонтали (горизонтальный скролл). max-w-full — чтобы декор
            никогда не был шире контейнера. */}
        <div
          aria-hidden
          className="absolute inset-x-0 -top-32 -z-10 mx-auto h-[36rem] w-full max-w-[90rem] bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.35),transparent_70%)]"
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
        <>
          {/* Витрина-подборка. Пока сортировки по популярности нет —
              показываем первые товары по sort_order; когда появятся
              покупки/оценки (подэтапы маркетплейса, docs/SHOP.md), сюда
              ляжет реальный «топ». «View all» ведёт к полной сетке ниже. */}
          <ShopShowcaseRow
            title="Most popular"
            products={products.slice(0, 8)}
            viewAllHref="#all-maps"
            viewAllLabel="View all"
          />

          {/* Полный каталог — те же карточки, сеткой. */}
          <section id="all-maps" className="mt-16 scroll-mt-28">
            <h2
              className={`${displayFont.className} text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl`}
            >
              All maps
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.slug} product={product} className="h-full" />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
