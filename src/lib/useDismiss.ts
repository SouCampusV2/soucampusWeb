"use client";

import { useEffect, useRef, type RefObject } from "react";

// Одно поведение на все выпадашки: закрыть по клику мимо и по Escape.
//
// ПОЧЕМУ ХУК, А НЕ КОМПОНЕНТ <Dropdown> (решение владельца 2026-08-26).
// «Выпадашки» у нас — разные вещи: меню профиля в навбаре живёт на CSS
// group-hover и состояния не имеет вовсе, гамбургер закрывается по смене
// адреса, попап фильтров — форма с кнопкой Apply. Общий компонент пришлось
// бы обвешивать флагами под каждый случай. Общим должно быть ПОВЕДЕНИЕ, а
// разметку каждый оставляет себе.
//
// ЧТО БЫЛО ДО. Пять копий этого эффекта в пяти файлах и ТРИ РАЗНЫХ
// события: mousedown в обычной фазе (NameColorPicker, MarketplaceFilters,
// SortSelect), pointerdown в фазе перехвата (ResourceActions), и
// BuildEstimator, где Escape просто забыли. Разницы никто не решал —
// файлы писались в разные дни.
//
// ⚠️ ПОЧЕМУ ИМЕННО pointerdown В ФАЗЕ ПЕРЕХВАТА. Это не «самый частый»
// вариант из пяти, а единственный обоснованный — довод целиком принесён
// из ResourceActions, где mousedown на window когда-то НЕ СРАБАТЫВАЛ:
//   • перехват — событие достаётся нам первыми, до всплытия, поэтому
//     любой stopPropagation по дороге (на странице живёт перехватчик
//     ссылок из PageTransition) больше не может нас отключить;
//   • pointer вместо mouse — одно событие и на мышь, и на тач: на
//     телефоне mousedown приходит с задержкой, а то и не приходит вовсе;
//   • на НАЖАТИИ, а не на click: меню закрывается раньше, чем click
//     доедет до того, во что целились, — иначе промах мимо меню
//     ощущается как «клик не сработал».
//
// ⚠️ REF — НА ОБЁРТКУ ЦЕЛИКОМ (кнопка + панель), а не на одну панель.
// Кнопка-триггер переключает состояние сама; если она окажется «снаружи»,
// клик по ней сначала закроет панель отсюда, а потом кнопка откроет её
// обратно — и выпадашка перестанет закрываться нажатием на свою же
// кнопку. В MarketplaceFilters это чинилось особой проверкой
// parentElement; с обёрткой она не нужна.
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  { enabled = true }: { enabled?: boolean } = {},
) {
  // Колбэк держим в ref, а не в зависимостях эффекта: на месте вызова его
  // почти всегда пишут стрелкой прямо в аргументе, то есть каждый рендер
  // даёт новую функцию. В зависимостях это переподписывало бы слушателей
  // на каждый рендер — тем же способом, каким канал Realtime однажды
  // ушёл в бесконечный цикл переподключений.
  //
  // ⚠️ Обновляется он в СВОЁМ эффекте, а не строкой в теле хука: запись в
  // ref во время рендера — правка стороннего состояния из чистой функции,
  // и React это запрещает (линтер поймал сразу). Эффект без зависимостей
  // выполняется после каждого рендера, то есть заведомо раньше, чем
  // человек успеет куда-то нажать.
  const latest = useRef(onDismiss);
  useEffect(() => {
    latest.current = onDismiss;
  });

  useEffect(() => {
    if (!enabled) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) latest.current();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") latest.current();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, ref]);
}
