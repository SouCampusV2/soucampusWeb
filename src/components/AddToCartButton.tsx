"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useHydrated } from "@/lib/useHydrated";

// Кнопка на странице товара (подэтап C). Раньше (подэтап B) она сразу
// уводила на Stripe для этого одного товара — теперь есть корзина, и
// оформление заказа идёт ТОЛЬКО через /cart, даже для одной покупки:
// один путь чекаута проще поддерживать, чем два (прямой + через корзину).
export function AddToCartButton({ product }: { product: CartItem }) {
  const { items, addItem } = useCart();
  const hydrated = useHydrated();

  // Корзина живёт в localStorage — статический HTML страницы её не знает,
  // поэтому до гидратации считаем "товара в корзине нет" (это и корректный
  // первый кадр для абсолютного большинства визитёров). inCart вычисляем
  // только после гидратации: иначе на сервере и в браузере получилось бы
  // разное значение и React ругнулся бы на рассинхрон гидратации.
  const inCart = hydrated && items.some((i) => i.slug === product.slug);

  // min-h резервирует строку под ссылку "View cart", чтобы её появление у
  // тех, у кого товар уже в корзине, не сдвигало вёрстку вниз.
  return (
    <div className="flex min-h-[3.5rem] flex-wrap items-center gap-4">
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
