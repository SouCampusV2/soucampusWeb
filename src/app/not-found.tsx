import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ContactFooter } from "@/components/ContactFooter";
import { CartProvider } from "@/lib/cart-context";
import { NotFoundContent } from "@/components/NotFoundContent";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

// Адрес, не совпавший НИ С ОДНИМ маршрутом. Next рендерит такую страницу
// в корневом layout, минуя (site)/layout.tsx, — то есть навбара и футера
// здесь нет и взяться им неоткуда. Поэтому обвязка собирается вручную:
//
//   • CartProvider обязателен — Navbar читает счётчик корзины через
//     useCart(), и без провайдера страница падает на рендере. Ровно тот
//     случай, когда «404 сломана» выглядит страшнее самой 404.
//   • PricingSection сюда НЕ ставится: блок с тарифами — предложение
//     купить, а человек попал на битую ссылку и ищет дорогу, а не цену.
//   • PageTransition тоже нет: анимация перехода живёт в (site) и на
//     ошибочном адресе ей нечего проигрывать — ссылки внизу обычные.
export default function NotFound() {
  return (
    <CartProvider>
      <Navbar />
      <NotFoundContent />
      <ContactFooter />
    </CartProvider>
  );
}
