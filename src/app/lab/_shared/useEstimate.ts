"use client";

import { useState } from "react";
import { estimate, formatEuro } from "./pages";

// Состояние калькулятора «размер → цена и срок» для вариантов лаборатории.
// Вёрстку каждый вариант рисует сам, а числа считает только эта функция —
// через ту же формулу src/lib/pricing.ts, что у живого /contact.
//
// Размеры хранятся строкой: поле ввода, которое человек очистил, должно
// оставаться пустым, а не прыгать обратно на 1.
export const SIZE_MIN = 25;
export const SIZE_MAX = 1000;

export function useEstimate(initial = 150) {
  const [width, setWidth] = useState(String(initial));
  const [height, setHeight] = useState(String(initial));
  const w = clamp(Number(width));
  const h = clamp(Number(height));
  const { price, deadline } = estimate(w, h);

  return {
    width,
    height,
    setWidth,
    setHeight,
    /** Числа, уже приведённые к допустимому диапазону. */
    w,
    h,
    price,
    priceLabel: formatEuro(price),
    deadline,
  };
}

function clamp(value: number) {
  if (!Number.isFinite(value) || value <= 0) return SIZE_MIN;
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(value)));
}
