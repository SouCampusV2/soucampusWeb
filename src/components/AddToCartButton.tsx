"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useHydrated } from "@/lib/useHydrated";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Кнопка на странице товара (подэтап C). Оформление заказа — только через
// /cart, даже для одной покупки: один путь чекаута проще двух.
//
// Плюс запрет повторной покупки: цифровую карту покупают один раз. Если
// залогиненный пользователь ей уже владеет (has_purchased — та же
// security-definer проверка, что у оценок), вместо «Add to cart»
// показываем ссылку в профиль на скачивание.
export function AddToCartButton({
  product,
  productId,
}: {
  product: CartItem;
  productId: string;
}) {
  const { items, addItem } = useCart();
  const hydrated = useHydrated();
  const [owned, setOwned] = useState(false);

  // Проверка владения — на клиенте: страница статическая, «куплено ли»
  // зависит от того, кто смотрит. Аноним ничего не купил — не спрашиваем.
  // Пока не знаем (аноним/ответ не пришёл) — показываем обычную кнопку, не
  // мигаем «owned». Ошибка RPC (напр. миграции ещё нет) — тоже обычная
  // кнопка.
  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createSupabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data, error } = await supabase.rpc("has_purchased", {
        p_product_id: productId,
      });
      if (active && !error) setOwned(data === true);
    })();
    return () => {
      active = false;
    };
  }, [productId]);

  const inCart = hydrated && items.some((i) => i.slug === product.slug);

  // min-h резервирует строку (ссылка «View cart» / статус владения), чтобы
  // её появление не сдвигало вёрстку.
  if (owned) {
    return (
      <div className="flex min-h-[3.5rem] flex-wrap items-center gap-4">
        <Button size="lg" href="/profile" pageTransition>
          You own this — download
        </Button>
      </div>
    );
  }

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
