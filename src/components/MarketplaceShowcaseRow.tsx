"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ArrowButton } from "@/components/ArrowButton";
import { TERTIARY_COLORS, TERTIARY_UNDERLINE } from "@/components/Button";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Горизонтальная витрина товаров: заголовок + «View all» справа, ряд
// карточек с прокруткой (свайп на мобильном, стрелки-кружки на десктопе).
// Переиспользуема под разные подборки — «Most popular», «Recently added»,
// «Free» и т.п. (см. docs/SHOP.md). Клиентский компонент: стрелкам нужен
// ref на контейнер и обработчик прокрутки.
export function MarketplaceShowcaseRow({
  title,
  products,
  viewAllHref,
  viewAllLabel = "View all",
  priorityFirst = false,
}: {
  title: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
  /**
   * Грузить обложку первой карточки сразу. Ставит только витрина и
   * только самому верхнему ряду — см. MarketplaceShowcase.
   */
  priorityFirst?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Куда ещё можно ехать. Тот же смысл, что index/maxIndex в карусели
  // отзывов (ClientReviews), только там позиция считается в карточках, а
  // здесь ряд листается нативной прокруткой — значит и границы надо брать
  // у неё же: слева упёрлись при scrollLeft = 0, справа — когда
  // scrollLeft + видимая ширина дошли до полной ширины содержимого.
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Допуск в 1px: дробные ширины после вычислений в calc() дают
    // scrollLeft вроде 431.6 при максимуме 432 — без допуска правая
    // стрелка так и осталась бы активной в самом конце.
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    // ResizeObserver, а не только window resize: ширина ряда меняется и
    // без изменения окна (например, когда подгрузились карточки).
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, products.length]);

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Прокручиваем почти на ширину видимой области — «страницу» карточек.
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  // Если ряд помещается целиком, листать нечего — стрелок нет вовсе, а не
  // две неактивные (они бы только предлагали действие, которого нет).
  const scrollable = canLeft || canRight;

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
              className={`text-sm font-medium ${TERTIARY_COLORS} ${TERTIARY_UNDERLINE}`}
            >
              {viewAllLabel}
            </Link>
          )}
          {/* Стрелки — только на десктопе: на мобильном ряд листается
              свайпом. Через ArrowButton — тот же компонент и то же
              поведение, что у карусели отзывов: на краю кнопка не просто
              «ничего не делает», а гаснет (disabled:opacity-30). */}
          {scrollable && (
            <div className="hidden items-center gap-2 sm:flex">
              <ArrowButton
                direction="left"
                onClick={() => scrollByCards(-1)}
                disabled={!canLeft}
              />
              <ArrowButton
                direction="right"
                onClick={() => scrollByCards(1)}
                disabled={!canRight}
              />
            </div>
          )}
        </div>
      </div>

      {/* Полоса прокрутки скрыта: навигация — свайпом/стрелками. snap-start
          на карточках, чтобы прокрутка «щёлкала» по карточкам, а не замирала
          посередине. */}
      <div
        ref={scrollerRef}
        onScroll={measure}
        className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product, i) => (
          // Ширина карточки повторяет колонку сетки «All maps» на каждой
          // контрольной точке (1/2/3/4 колонки, gap-4 = 1rem): вычитаем из
          // 100% суммарные промежутки и делим на число колонок. Раньше
          // здесь стояли фиксированные w-64/w-72, из-за чего одни и те же
          // карточки в витрине и в сетке были разного размера.
          <div
            key={product.slug}
            className="w-full shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-3rem)/4)]"
          >
            {/* priority только ПЕРВОЙ карточке и только в первом ряду
                (проп priorityFirst приходит сверху): на телефоне она и
                есть LCP-элемент витрины. Остальные остаются ленивыми —
                иначе восемь обложек начнут соревноваться за канал с той
                единственной, ради которой всё и делается. */}
            <ProductCard
              product={product}
              className="h-full"
              priority={priorityFirst && i === 0}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
