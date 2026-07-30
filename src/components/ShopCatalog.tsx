"use client";

import { useSearchParams } from "next/navigation";
import { Unbounded } from "next/font/google";
import {
  filterByCategory,
  filterBySearch,
  SHOP_CATEGORIES,
  type Product,
  type ProductCategory,
} from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ShopShowcaseRow } from "@/components/ShopShowcaseRow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Клиентская витрина каталога. Читает активную вкладку (?category) и
// поиск (?q) из адреса — их проставляют ссылки категорий и строка поиска
// в навбаре. Фильтрация на клиенте: каталог маленький, всё уже приехало
// с сервера в products, лишний запрос на каждый фильтр не нужен, а
// страница /shop остаётся статической (компонент под <Suspense>).
//
// Без фильтра — витрина «Most popular» + сетка «All maps». С фильтром —
// заголовок (категория или «Results for …») + отфильтрованная сетка.
export function ShopCatalog({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const rawCategory = params.get("category");
  const category = SHOP_CATEGORIES.some((c) => c.slug === rawCategory)
    ? (rawCategory as ProductCategory)
    : null;
  const query = (params.get("q") ?? "").trim();

  const isFiltering = category !== null || query.length > 0;

  if (!isFiltering) {
    // Подборки главной витрины. Все считаются из одного уже загруженного
    // массива — ни одного лишнего запроса. Каждая ряд-подборка сама
    // исчезает, если в ней нечего показать (ShopShowcaseRow возвращает
    // null на пустом списке), поэтому «Free» не висит пустым заголовком,
    // пока бесплатных карт нет.
    const take = 8;

    // «Most popular» — по числу покупок (salesCount), при равенстве держим
    // исходный порядок (sort_order из БД). Пока продаж нет — это просто
    // первые по sort_order.
    const popular = [...products]
      .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
      .slice(0, take);

    // «Recently added» — по дате добавления в БД, новые сверху.
    const recent = [...products]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, take);

    // «Top rated» — только у кого оценки реально есть: карта без единой
    // оценки не может стоять в «лучших по рейтингу».
    const topRated = products
      .filter((p) => (p.ratingCount ?? 0) > 0)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, take);

    // Рядов по конкретным категориям на витрине сознательно НЕТ: с
    // 2026-07-30 категории выбираются фильтром прямо над каталогом
    // (CategoryFilter), и дублировать их ещё и рядами — лишний шум. Ряды
    // остаются только под подборки, которые категорией не выразить:
    // популярное, новое, лучшее по оценкам, бесплатное.
    const free = filterByCategory(products, "free").slice(0, take);

    return (
      <>
        <ShopShowcaseRow
          title="Most popular"
          products={popular}
          viewAllHref="#all-maps"
          viewAllLabel="View all"
        />
        <ShopShowcaseRow title="Recently added" products={recent} />
        <ShopShowcaseRow title="Top rated" products={topRated} />
        <ShopShowcaseRow
          title="Free to download"
          products={free}
          viewAllHref="/shop?category=free"
        />
        <section id="all-maps" className="mt-16 scroll-mt-28">
          <h2
            className={`${displayFont.className} text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl`}
          >
            All maps
          </h2>
          <ProductGrid products={products} />
        </section>
      </>
    );
  }

  // Фильтрация: сперва по категории (если выбрана), затем по тексту
  // поиска — он смотрит название, оба описания и имя автора
  // (см. filterBySearch).
  let result = category ? filterByCategory(products, category) : products;
  result = filterBySearch(result, query);

  const heading = query
    ? `Results for “${query}”`
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
          Nothing here yet. Try another category or clear the search.
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
