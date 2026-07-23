"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-context";

// Ничего не рисует. Живёт на /shop/success рядом с подтверждённым
// заказом и один раз опустошает корзину — раньше её никто не очищал,
// и после успешной оплаты бейдж на иконке корзины продолжал показывать
// уже купленные товары. Отдельный клиентский компонент, а не вызов
// clear() прямо на странице: /shop/success — серверный компонент
// (читает БД), а localStorage доступен только в браузере.
export function ClearCartOnSuccess() {
  const { clear } = useCart();
  // useRef, не просто "вызвать один раз при монтировании": clear —
  // новая функция на каждый рендер (useCallback в CartProvider всё
  // равно зависит от возвращаемого объекта контекста), а effect ниже
  // должен сработать РОВНО один раз за жизнь страницы, а не при каждом
  // изменении ссылки на clear.
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    clear();
  }, [clear]);

  return null;
}
