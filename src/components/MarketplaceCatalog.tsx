"use client";

import { useSearchParams } from "next/navigation";
import { Unbounded } from "next/font/google";
import {
  filterByCategory,
  filterByPriceRange,
  filterBySearch,
  filterBySpecs,
  SHOP_CATEGORIES,
  SHOP_COLLECTIONS,
  sortByCollection,
  sortProducts,
  type Product,
  type ProductCategory,
  type ProductCollection,
} from "@/lib/products";
import { readCatalogQuery } from "@/lib/catalog-params";
import { ProductCard } from "@/components/ProductCard";
import { MarketplaceShowcaseRow } from "@/components/MarketplaceShowcaseRow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Клиентская витрина каталога. Читает из адреса, ЧТО именно показывать:
// подборку (?collection), категорию (?category), поиск (?q) и диапазон
// цены (?price). Их проставляют пилюли и строка поиска в CategoryFilter.
// Фильтрация на клиенте: каталог маленький, всё уже приехало с сервера в
// products, лишний запрос на каждый фильтр не нужен, а страница
// /marketplace остаётся статической (компонент под <Suspense>).
//
// ДВА ЭКРАНА, и это главное, что нужно понимать при правках (решение
// владельца 2026-08-26):
//
//   1. Пустой адрес — ГЛАВНАЯ ВИТРИНА: несколько рядов-подборок и всё.
//      Сетки «All maps» здесь больше НЕТ: пока она стояла внизу, ряды
//      были её оглавлением, и «View all» вёл к якорю на той же странице.
//      Теперь каждый ряд — вход на свою подстраницу.
//   2. Любой параметр — ПОДСТРАНИЦА: один список, заголовок и фильтр цены.
//      Фильтр живёт только здесь, потому что фильтровать можно ОДИН
//      список; на витрине их несколько, и непонятно, к какому он относится.
export function MarketplaceCatalog({ products }: { products: Product[] }) {
  const params = useSearchParams();

  // Каждое значение из адреса проверяется по своему списку допустимых, и
  // непрошедшее становится null — то есть «?category=чепуха» показывает
  // витрину, а не пустой экран. Адрес правит кто угодно, а пустота
  // читается как поломка каталога.
  const rawCategory = params.get("category");
  const category = SHOP_CATEGORIES.some((c) => c.slug === rawCategory)
    ? (rawCategory as ProductCategory)
    : null;

  const rawCollection = params.get("collection");
  const collection = SHOP_COLLECTIONS.some((c) => c.slug === rawCollection)
    ? (rawCollection as ProductCollection)
    : null;

  // Цена, характеристики и сортировка — одним разбором, общим с попапом
  // фильтров (см. lib/catalog-params.ts). Пока каждый читал адрес сам,
  // расхождение было вопросом времени.
  const filters = readCatalogQuery(params);

  const query = (params.get("q") ?? "").trim();

  // Фильтры в этот список НЕ входят намеренно: сами по себе они экрана не
  // выбирают. «?min=5» без подборки — это по-прежнему главная витрина, а
  // не список. Попап это знает и, применяя фильтр с витрины, сам
  // добавляет collection=all — то есть выбор экрана остаётся ОДНИМ
  // решением, принятым в одном месте.
  const isFiltering =
    category !== null || collection !== null || query.length > 0;

  if (!isFiltering) {
    // Подборки главной витрины. Все считаются из одного уже загруженного
    // массива — ни одного лишнего запроса. Каждый ряд сам исчезает, если
    // в нём нечего показать (MarketplaceShowcaseRow возвращает null на
    // пустом списке), поэтому «Free» не висит пустым заголовком, пока
    // бесплатных карт нет.
    //
    // Порядок внутри подборки считает sortByCollection из products.ts, а
    // не этот файл: ровно тот же порядок нужен подстранице, куда ведёт
    // «View all». Пока сортировка жила здесь, ряд и его же страница
    // могли начинаться с разных карт.
    const take = 8;

    // Рядов по конкретным категориям на витрине по-прежнему НЕТ: категории
    // выбираются пилюлями прямо над рядами (CategoryFilter), и дублировать
    // их ещё и рядами — лишний шум. Ряды остаются под подборки, которые
    // категорией не выразить: популярное, новое, лучшее по оценкам,
    // бесплатное.
    return (
      <>
        <MarketplaceShowcaseRow
          title="Most popular"
          products={sortByCollection(products, "popular").slice(0, take)}
          viewAllHref="/marketplace?collection=popular"
        />
        <MarketplaceShowcaseRow
          title="Recently added"
          products={sortByCollection(products, "recent").slice(0, take)}
          viewAllHref="/marketplace?collection=recent"
        />
        <MarketplaceShowcaseRow
          title="Top rated"
          products={sortByCollection(products, "top-rated").slice(0, take)}
          viewAllHref="/marketplace?collection=top-rated"
        />
        <MarketplaceShowcaseRow
          title="Free to download"
          products={filterByCategory(products, "free").slice(0, take)}
          viewAllHref="/marketplace?category=free"
        />
      </>
    );
  }

  // Подстраница. Порядок шагов важен: сперва ЧТО за список (подборка или
  // категория), потом сужения внутри него (поиск, цена). Наоборот —
  // значило бы искать по каталогу и лишь потом вспоминать, в какой мы
  // категории.
  let result = collection
    ? sortByCollection(products, collection)
    : category
      ? filterByCategory(products, category)
      : products;
  result = filterBySearch(result, query);
  result = filterByPriceRange(result, filters.minCents, filters.maxCents);
  result = filterBySpecs(result, filters.specs);
  // Сортировка ПОСЛЕДНЕЙ и поверх порядка подборки: человек попросил
  // явно, и оставить «свой» порядок значило бы проигнорировать просьбу.
  // Без выбора (sort === null) функция возвращает список как есть.
  result = sortProducts(result, filters.sort);

  // Заголовок отвечает на «где я». Поиск главнее списка: набранное слово —
  // самое свежее действие человека, и назвать экран категорией, когда он
  // только что искал, значило бы сказать не то, что он сделал.
  const heading = query
    ? `Results for “${query}”`
    : collection
      ? (SHOP_COLLECTIONS.find((c) => c.slug === collection)?.label ?? "Maps")
      : (SHOP_CATEGORIES.find((c) => c.slug === category)?.label ?? "Maps");

  return (
    <section className="mt-12">
      <h2
        className={`${displayFont.className} text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl`}
      >
        {heading}
      </h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {result.length} {result.length === 1 ? "map" : "maps"}
      </p>

      {result.length === 0 ? (
        <p className="mt-10 text-zinc-600 dark:text-zinc-400">
          Nothing matches. Try widening the filters, picking another category,
          or clearing the search.
        </p>
      ) : (
        <ProductGrid products={result} />
      )}
    </section>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} className="h-full" />
      ))}
    </div>
  );
}
