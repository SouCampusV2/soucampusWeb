"use client";

import { useRef } from "react";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ArrowCircle } from "@/components/ArrowCircle";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Горизонтальная витрина товаров: заголовок + «View all» справа, ряд
// карточек с прокруткой (свайп на мобильном, стрелки-кружки на десктопе).
// Переиспользуема под разные подборки — «Most popular», «Recently added»,
// «Free» и т.п. (см. docs/SHOP.md). Клиентский компонент: стрелкам нужен
// ref на контейнер и обработчик прокрутки.
export function ShopShowcaseRow({
  title,
  products,
  viewAllHref,
  viewAllLabel = "View all",
}: {
  title: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Прокручиваем почти на ширину видимой области — «страницу» карточек.
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  const arrowColor =
    "bg-orange-400 hover:bg-orange-500 text-white dark:bg-orange-400 dark:hover:bg-orange-500";

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <h2
          className={`${displayFont.className} text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl`}
        >
          {title}
        </h2>

        <div className="flex shrink-0 items-center gap-4">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-sm font-medium text-orange-600 underline decoration-2 underline-offset-4 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
            >
              {viewAllLabel}
            </Link>
          )}
          {/* Стрелки — только на десктопе: на мобильном ряд листается
              свайпом. Через ArrowCircle (DESIGN.md — не пересобирать SVG),
              оранжевый кружок, как у карусели отзывов. */}
          <div className="hidden items-center gap-2 sm:flex">
            <button type="button" aria-label="Scroll left" onClick={() => scrollByCards(-1)}>
              <ArrowCircle direction="left" className="h-10 w-10" colorClassName={arrowColor} />
            </button>
            <button type="button" aria-label="Scroll right" onClick={() => scrollByCards(1)}>
              <ArrowCircle direction="right" className="h-10 w-10" colorClassName={arrowColor} />
            </button>
          </div>
        </div>
      </div>

      {/* Полоса прокрутки скрыта: навигация — свайпом/стрелками. snap-start
          на карточках, чтобы прокрутка «щёлкала» по карточкам, а не замирала
          посередине. */}
      <div
        ref={scrollerRef}
        className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.slug}
            className="w-64 shrink-0 snap-start sm:w-72"
          >
            <ProductCard product={product} className="h-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
