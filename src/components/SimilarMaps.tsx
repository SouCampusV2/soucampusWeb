import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/products";

// «Похожие» под страницей карты.
//
// Компонент только рисует — подбор делает lib/similar.ts, и он закрыт
// тестами. Разделение не ради чистоты: формулу схожести глазами не
// проверить (четыре карточки выглядят убедительно и когда подборка
// осмысленная, и когда сломана), а функцию — можно.
//
// ⚠️ ПУСТО — ЭТО ОТВЕТ, А НЕ СБОЙ. Когда похожих нет, блока нет вовсе.
// Требование владельца дословно: «чтобы реально были схожие варианты, а
// не просто рандом». Добить подборку случайными картами до красивых
// четырёх было бы ровно тем, чего просили не делать: посетитель не
// отличит «мы подобрали» от «мы насыпали», а поверит один раз.

export function SimilarMaps({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-zinc-950/[0.06] pt-10 dark:border-white/10">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Similar maps
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Picked by category, type and theme — not at random
      </p>

      {/* Та же сетка, что у рекомендаций корзины: до трёх в ряд. Четвёртая
          карточка (когда подбор нашёл четыре) переносится на вторую
          строку — это осознанно: ряд из четырёх на десктопе делает
          карточки уже, чем везде на сайте, и «похожие» начинают выглядеть
          мельче настоящего товара. */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} className="h-full" />
        ))}
      </div>
    </section>
  );
}
