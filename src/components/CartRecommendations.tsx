"use client";

import { createContext, useContext } from "react";
import { Unbounded } from "next/font/google";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/products";

// Рекомендации под корзиной — и пустой, и полной.
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

export function CartRecommendations({
  /**
   * Slug'и, которые уже лежат в корзине. Предлагать человеку то, что он
   * только что положил, — не рекомендация, а сбой: он видит одну и ту же
   * карту дважды на одном экране и не понимает, добавилась ли она.
   *
   * Приходит списком снаружи, а не читается через useCart здесь:
   * корзина — состояние страницы, и два места, спрашивающих её
   * независимо, рано или поздно ответят по-разному.
   */
  exclude = [],
}: { exclude?: string[] } = {}) {
  const all = useContext(RecommendationsContext);
  const products = exclude.length
    ? all.filter((p) => !exclude.includes(p.slug))
    : all;
  // Пусто — это ответ, а не сбой: то же правило, что у «Похожих».
  // Отфильтровать могло и всё сразу, если в корзине лежит вся подборка.
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

      {/* СЕТКА КАТАЛОГА ДОСЛОВНО, включая xl:grid-cols-4.

          ⚠️ ЗДЕСЬ СТОЯЛ ПОДРОБНЫЙ РАСЧЁТ, ДОКАЗЫВАВШИЙ ОБРАТНОЕ — три
          колонки, потому что корзина живёт в max-w-5xl (1024px) и четыре
          дали бы 232px вместо 316px. Расчёт был верен ДЛЯ ТОЙ ширины.
          Но блок в тот же день вынесли из max-w-5xl в контейнер витрины
          (max-w-[120rem] с теми же паддингами) — и довод стал ложным,
          а число осталось. Получилось ровно то, чего расчёт пытался
          избежать, только в другую сторону: карточки КРУПНЕЕ соседних.

          Урок не про сетку: правку сделали, а комментарий, объяснявший
          снятое ограничение, оставили — и он полдня доказывал неправду
          убедительными числами.

          h-full обязателен: без него карточка не тянется на высоту
          строки, и подвалы в ряду встают ступенькой. */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} className="h-full" />
        ))}
      </div>
    </section>
  );
}
