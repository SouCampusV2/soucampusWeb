"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import { useCart, type CartItem } from "@/lib/cart-context";

// Кнопка на странице товара (подэтап C). Раньше (подэтап B) она сразу
// уводила на Stripe для этого одного товара — теперь есть корзина, и
// оформление заказа идёт ТОЛЬКО через /cart, даже для одной покупки:
// один путь чекаута проще поддерживать, чем два (прямой + через корзину).
export function AddToCartButton({ product }: { product: CartItem }) {
  const { items, addItem } = useCart();
  // Смотрим в саму корзину, а не в локальный state: карту покупаешь один
  // раз, повторный визит на страницу товара, который уже лежит в
  // корзине, должен сразу показывать "In cart", а не снова "Add to cart".
  const inCart = items.some((i) => i.slug === product.slug);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="lg" onClick={() => addItem(product)}>
        {inCart ? "In cart ✓" : `Add to cart — ${product.price}`}
      </Button>
      {inCart && (
        <Link
          href="/cart"
          data-page-transition="true"
          className="text-sm font-medium text-orange-600 underline decoration-2 underline-offset-4 dark:text-orange-400"
        >
          View cart →
        </Link>
      )}
    </div>
  );
}
