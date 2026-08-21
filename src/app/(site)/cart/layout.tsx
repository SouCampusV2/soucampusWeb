import type { Metadata } from "next";
import { getAllProductsWithStats } from "@/lib/products";
import { CartRecommendationsProvider } from "@/components/CartRecommendations";

// Персональная страница (у каждого свой набор товаров в localStorage) —
// поисковику здесь делать нечего, как на /marketplace/success и /terms.
export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false, follow: false },
};

// Список для рекомендаций берётся ЗДЕСЬ, а не на самой странице: она
// клиентская целиком (корзина живёт в localStorage) и в базу на сервере
// сходить не может. Разбор — в CartRecommendations.tsx.
//
// Считается всегда, даже когда корзина не пуста и рекомендации не
// покажутся. Это осознанный размен: layout один на все состояния
// корзины, а запрос кэшируется группой (site) на минуту и делится
// со всеми посетителями — цена одного лишнего вызова в минуту против
// ветвления, которого в layout всё равно не выразить (что лежит в
// корзине, знает только браузер).
const RECOMMENDED_COUNT = 3;

export default async function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const all = await getAllProductsWithStats();

  // «Популярное» — по числу покупок (решение владельца 2026-08-21).
  // Продаж пока ноль у всех, и сортировка вырождается в «первые три из
  // каталога». Это не враньё: площадка ещё не открыта, и «популярное»
  // станет собой само, как только появятся покупки, — без правки кода.
  const popular = [...all]
    .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
    .slice(0, RECOMMENDED_COUNT);

  return (
    <CartRecommendationsProvider products={popular}>
      {children}
    </CartRecommendationsProvider>
  );
}
