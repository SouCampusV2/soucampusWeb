"use client";

import { createContext, useContext, useMemo } from "react";

// Какие карты из корзины ещё можно купить (2026-11-04).
//
// ЗАЧЕМ. Корзина живёт в localStorage и хранит снимок карты на момент
// «Add to cart». Карту потом могут снять, отклонить, автор может лишиться
// статуса креатора — а в браузере она лежит как ни в чём не бывало. До
// этой правки /api/checkout такие позиции молча выбрасывал: человек
// видел в корзине три карты, платил за две и не понимал, куда делась
// третья.
//
// ОТКУДА ДАННЫЕ. Тот же приём, что у CartRecommendations: серверный
// cart/layout.tsx уже берёт весь живой каталог для рекомендаций (кэш
// группы (site), раз в минуту на всех) и отсюда же отдаёт список slug'ов.
// Отдельного запроса из браузера нет, а значит нет и мигания «сначала
// всё доступно, через полсекунды — серое».
//
// ⚠️ Это ПОДСКАЗКА для глаз, а не защита. Список может отставать на
// минуту кэша; решает по-прежнему сервер в /api/checkout, который
// заново спрашивает базу по каждому slug.

const AvailabilityContext = createContext<Set<string> | null>(null);

export function CartAvailabilityProvider({
  liveSlugs,
  children,
}: {
  // Массивом, а не Set: пропы из серверного компонента в клиентский
  // сериализуются, и простой массив строк — самый надёжный вид.
  liveSlugs: string[];
  children: React.ReactNode;
}) {
  const set = useMemo(() => new Set(liveSlugs), [liveSlugs]);
  return <AvailabilityContext.Provider value={set}>{children}</AvailabilityContext.Provider>;
}

/**
 * true — карту можно купить. Вне провайдера (корзина где-то ещё) считаем
 * всё доступным: лучше по-старому, чем выкрасить серым всю корзину.
 */
export function useIsAvailable() {
  const set = useContext(AvailabilityContext);
  return (slug: string) => (set ? set.has(slug) : true);
}
