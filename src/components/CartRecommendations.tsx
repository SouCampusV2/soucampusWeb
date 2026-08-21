"use client";

import { createContext, useContext } from "react";
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
    <section className="mx-auto mt-14 max-w-5xl text-left">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Popular right now
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        What other people are downloading
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
