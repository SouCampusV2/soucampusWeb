import type { Metadata } from "next";

// Персональная страница (у каждого свой набор товаров в localStorage) —
// поисковику здесь делать нечего, как на /shop/success и /terms.
export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
