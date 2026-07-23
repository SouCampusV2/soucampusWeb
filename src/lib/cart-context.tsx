"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

// Корзина (Этап 4, подэтап C). Живёт в localStorage браузера, не в БД —
// гостю не нужен аккаунт, чтобы что-то положить в корзину. Сервер узнаёт
// о содержимом только в момент оформления заказа (см. /api/checkout),
// а до этого момента ничего не отправляется в сеть.
//
// Цена/название здесь — КОСМЕТИКА для отображения, а не источник истины:
// при чекауте сервер заново берёт цену из БД по slug (см. products.ts),
// так что подделать сумму через localStorage не получится.
//
// Без количества: это не расходники, а карты — их покупаешь один раз,
// у Stripe-сессии всегда quantity 1 на позицию (см. /api/checkout).
// Повторное "Add to cart" уже лежащего товара просто ничего не делает.

export type CartItem = {
  slug: string;
  title: string;
  /** Готовая строка для показа: "€15". */
  price: string;
  priceCents: number;
  image: string;
};

const STORAGE_KEY = "scv_cart";

// Тот же приём, что в ThemeProvider.tsx (см. его комментарий и
// CHANGELOG, 2026-07-17): читать localStorage внутри useEffect и класть
// результат через setState — отдельная ошибка линта (setState-в-эффекте
// вызывает лишний каскадный рендер). useSyncExternalStore устроен ровно
// под это: на сервере localStorage нет — getServerSnapshot() отдаёт
// пустую корзину и гидратация не расходится с сервером, а сразу следом
// React сам подставляет настоящий getSnapshot().
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// useSyncExternalStore требует, чтобы getSnapshot() возвращал ссылочно
// стабильное значение, пока ничего не менялось — иначе React решает, что
// каждый рендер приносит новые данные, и зацикливается. Кэшируем
// последний разобранный массив и пересобираем его из строки, только
// когда сама строка в localStorage реально изменилась (см. writeCart).
// Пустой массив-константа: и для "корзины ещё нет" в getSnapshot, и для
// getServerSnapshot. Второе — не просто аккуратность: на сервере
// localStorage нет вовсе, и НОВЫЙ литерал [] при каждом вызове нарушает
// то самое правило ссылочной стабильности из комментария выше — React
// значения "не равны" и перерендеривает снова, и снова, до бесконечности
// (ровно та ошибка, которую эта функция и была призвана предотвратить).
const EMPTY_ITEMS: CartItem[] = [];

let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY_ITEMS;

function getSnapshot(): CartItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedItems;

  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : EMPTY_ITEMS;
    cachedItems = Array.isArray(parsed) ? parsed : EMPTY_ITEMS;
  } catch {
    // Испорченный JSON (ручная правка, старый формат) — не повод ронять
    // сайт, просто считаем корзину пустой.
    cachedItems = EMPTY_ITEMS;
  }
  return cachedItems;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_ITEMS;
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((notify) => notify());
}

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (slug: string) => void;
  clear: () => void;
  count: number;
  totalCents: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback((item: CartItem) => {
    const current = getSnapshot();
    // Уже лежит — ничего не делаем (не количество, а факт "в корзине").
    if (current.some((i) => i.slug === item.slug)) return;
    writeCart([...current, item]);
  }, []);

  const removeItem = useCallback((slug: string) => {
    writeCart(getSnapshot().filter((i) => i.slug !== slug));
  }, []);

  const clear = useCallback(() => writeCart([]), []);

  const count = items.length;
  const totalCents = items.reduce((sum, i) => sum + i.priceCents, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, count, totalCents }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart() вызван вне <CartProvider>");
  return ctx;
}
