import {
  filterByCategory,
  sortByCollection,
  type Product,
} from "@/lib/products";
import { MarketplaceShowcaseRow } from "@/components/MarketplaceShowcaseRow";

// Главный экран витрины: ряды-подборки и всё.
//
// ⚠️ ФАЙЛ БЕЗ "use client" НАМЕРЕННО. Он вынесен из MarketplaceCatalog
// именно затем, чтобы его мог нарисовать СЕРВЕР — как `fallback` у
// `<Suspense>` на статической `/marketplace`. Раньше эти ряды жили внутри
// клиентского компонента, читающего адрес, и в серверном HTML их не было
// вовсе: витрина приезжала пустой, каталог дорисовывал браузер, а баннер
// заказа уезжал вниз на пол-экрана (CLS 0.452, замерено на живом сайте).
//
// ⚠️ ОДИН ОТРИСОВЩИК, ДВА ВЫЗЫВАЮЩИХ — и копию заводить нельзя. Его зовут
// `MarketplaceCatalog` (когда в адресе пусто) и `fallback` на самой
// странице. Совпадать они обязаны ДОСЛОВНО: разойдись разметка хоть на
// пиксель, вернётся ровно тот сдвиг, ради которого всё и делалось.
// Именно поэтому подборки и их порядок описаны здесь, а не в двух местах.
//
// Рядов по конкретным КАТЕГОРИЯМ здесь нет: категории выбираются
// пилюлями над рядами, и дублировать их ещё и рядами — лишний шум. Ряды
// остаются под подборки, которые категорией не выразить: популярное,
// новое, лучшее по оценкам, бесплатное.
//
// Порядок внутри подборки считает `sortByCollection` из products.ts, а не
// этот файл: ровно тот же порядок нужен подстранице, куда ведёт «View
// all». Пока сортировка жила в компоненте, ряд и его же страница могли
// начинаться с разных карт.

/** Сколько карт показывать в одном ряду. */
const TAKE = 8;

export function MarketplaceShowcase({ products }: { products: Product[] }) {
  return (
    <>
      {/* Каждый ряд сам исчезает, если показывать нечего
          (MarketplaceShowcaseRow возвращает null на пустом списке),
          поэтому «Free» не висит пустым заголовком, пока бесплатных карт
          нет. ⚠️ Для серверного fallback это значит, что его высота
          совпадает с клиентской: пустые ряды не рисует ни тот, ни другой. */}
      <MarketplaceShowcaseRow
        title="Most popular"
        products={sortByCollection(products, "popular").slice(0, TAKE)}
        viewAllHref="/marketplace?collection=popular"
        // Единственный ряд с priority, и только на первой карточке: с
        // 07.09 каталог приходит в серверном HTML, и эта обложка стала
        // LCP-элементом витрины. Ниже — всё ленивое, как и было.
        priorityFirst
      />
      <MarketplaceShowcaseRow
        title="Recently added"
        products={sortByCollection(products, "recent").slice(0, TAKE)}
        viewAllHref="/marketplace?collection=recent"
      />
      <MarketplaceShowcaseRow
        title="Top rated"
        products={sortByCollection(products, "top-rated").slice(0, TAKE)}
        viewAllHref="/marketplace?collection=top-rated"
      />
      <MarketplaceShowcaseRow
        title="Free to download"
        products={filterByCategory(products, "free").slice(0, TAKE)}
        viewAllHref="/marketplace?category=free"
      />
    </>
  );
}
