"use client";

import { useSearchParams } from "next/navigation";
import { Unbounded } from "next/font/google";
import {
  filterByCategory,
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
    return (
      <>
        <ShopShowcaseRow
          title="Most popular"
          products={products.slice(0, 8)}
          viewAllHref="#all-maps"
          viewAllLabel="View all"
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

  // Фильтрация: сперва по категории (если выбрана), затем по тексту поиска
  // (по названию и краткому описанию, регистронезависимо).
  let result = category ? filterByCategory(products, category) : products;
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q),
    );
  }

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
