"use client";

import { createContext, useContext } from "react";
import { Unbounded } from "next/font/google";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/products";

// Рекомендации под пустой корзиной.
//
// ПОЧЕМУ ЧЕРЕЗ КОНТЕКСТ, А НЕ ЗАПРОСОМ ИЗ БРАУЗЕРА. Страница корзины
// клиентская целиком — иначе нельзя, корзина живёт в localStorage, — а
// значит, сама сходить в базу на сервере не может. Оставалось два пути:
// дёрнуть Supabase из браузера при монтировании (три запроса подряд,
// пустое место вместо карточек, пока они летят) или взять список на
// сервере в layout и передать вниз. Второе: layout — серверный
// компонент, он тот же список отдаёт уже в готовом HTML, и кэш группы
// (site) считает его раз в минуту на всех, а не на каждого посетителя.
//
// Пропом передать нельзя: layout отдаёт странице только children.
// Контекст здесь — не архитектура, а единственный способ протащить
// серверные данные в клиентскую страницу.

// Тот же шрифт и тот же рецепт заголовка, что у рядов витрины
// (MarketplaceShowcaseRow). До 2026-08-22 здесь стоял свой —
// text-lg font-semibold обычным шрифтом, — и ряд читался как чужой
// кусок, случайно попавший на страницу: одинаковые по смыслу блоки
// выглядели по-разному без всякой причины.
const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

const RecommendationsContext = createContext<Product[]>([]);

export function CartRecommendationsProvider({
  products,
  children,
}: {
  products: Product[];
  children: React.ReactNode;
}) {
  return (
    <RecommendationsContext.Provider value={products}>
      {children}
    </RecommendationsContext.Provider>
  );
}

export function CartRecommendations() {
  const products = useContext(RecommendationsContext);
  if (products.length === 0) return null;

  return (
    <section className="mt-14 text-left">
      <h2
        className={`${displayFont.className} text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl`}
      >
        Popular right now
      </h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        What other people are downloading
      </p>

      {/* ⚠️ ТРИ КОЛОНКИ, А НЕ ЧЕТЫРЕ, КАК В КАТАЛОГЕ — и это не
          недоделка. Одинаковая карточка получается из одинаковой ШИРИНЫ,
          а не из одинаковых классов: витрина живёт в контейнере до 120rem,
          корзина — в max-w-5xl (1024px). Считаем при экране 1440:

            витрина, 4 колонки  → 316px
            корзина, 3 колонки  → 315px
            корзина, 4 колонки  → 232px

          То есть скопировать сетку витрины дословно значило бы сделать
          карточки в полтора раза МЕЛЬЧЕ, а не такими же. Совпадает то,
          что видно, а не то, что написано в классах.

          gap-4 — от каталога: там он 4, здесь стоял 6, и ряд дышал шире
          без причины.

          h-full обязателен и был забыт. Без него карточка не тянется на
          высоту строки, и ряд получается ступенчатым: у карты с длинным
          названием подвал уезжает вниз, у соседней остаётся вверху. Обе
          точки на витрине его передают — эта отстала. */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} className="h-full" />
        ))}
      </div>
    </section>
  );
}
