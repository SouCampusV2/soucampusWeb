import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import { getAllProducts, getAllProductsWithStats } from "@/lib/products";
import { ShopCatalog } from "@/components/ShopCatalog";
import { CategoryFilter } from "@/components/CategoryFilter";
import { PageGlow } from "@/components/PageGlow";
import { INLINE_LINK } from "@/components/Button";

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
  // Со статистикой: карточки показывают оценки/покупки, «Most popular»
  // сортируется по продажам (см. ShopCatalog).
  const products = await getAllProductsWithStats();

  // Магазин шире портфолио (тест, по просьбе владельца): контейнер растёт
  // до 1920px, по бокам паддинг доходит до 120px на широких экранах; дальше
  // 1920px не расширяется. Портфолио остаётся max-w-6xl.
  return (
    // Клип живёт на полноширинном <main>, а ограничение ширины — на
    // обёртке контента внутри: на одном элементе они конфликтуют, и
    // max-w отрезал бы свечение по бокам (разбор — в PageGlow).
    <main className="relative w-full flex-1 overflow-x-clip">
      {/* Подсветка акцентом страницы (orange — это витрина, то есть CTA). */}
      <PageGlow color="rgba(251,146,60,0.35)" />

      <div className="mx-auto max-w-[120rem] px-6 pb-16 sm:px-10 sm:pb-28 lg:px-16 xl:px-24 2xl:px-[120px]">
      {/* Hero по общему паттерну: pt-20 от навбара, Unbounded. */}
      <section className="relative pt-20">
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
          <Link href="/portfolio" className={`font-medium ${INLINE_LINK}`}>
            portfolio
          </Link>{" "}
          or order a custom build.
        </p>
      ) : (
        // Оба компонента клиентские и оба читают адрес: CategoryFilter
        // ставит ?category, ShopCatalog по нему (и по ?q) отбирает. Общее
        // состояние — сам адрес, а не проп между ними. Suspense обязателен
        // вокруг useSearchParams, иначе статическая /shop свалилась бы
        // целиком в client-render.
        <Suspense>
          <CategoryFilter />
          <ShopCatalog products={products} />
        </Suspense>
      )}
      </div>
    </main>
  );
}
