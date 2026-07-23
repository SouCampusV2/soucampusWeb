"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useCart, type CartItem } from "@/lib/cart-context";

// Кнопка на странице товара (подэтап C). Раньше (подэтап B) она сразу
// уводила на Stripe для этого одного товара — теперь есть корзина, и
// оформление заказа идёт ТОЛЬКО через /cart, даже для одной покупки:
// один путь чекаута проще поддерживать, чем два (прямой + через корзину).
export function AddToCartButton({ product }: { product: Omit<CartItem, "quantity"> }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick() {
    addItem(product);
    setAdded(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="lg" onClick={handleClick}>
        {added ? "Added ✓" : `Add to cart — ${product.price}`}
      </Button>
      {added && (
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
