"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// «Уйти без сохранения?» (24.11, просьба владельца: правишь профиль, жмёшь
// «назад» или ссылку — правки пропадали молча).
//
// Три пути ухода, и у каждого свой перехват:
//   1. ссылка внутри сайта — клик ловится на window в фазе захвата,
//      РАНЬШЕ, чем next/link начнёт переход; показываем своё окно;
//   2. «назад» в браузере — пока правки есть, в истории лежит лишняя
//      запись-заглушка: «назад» снимает её, мы возвращаем её на место и
//      показываем окно; «Leave» уходит на две записи назад (заглушка и сама
//      страница);
//   3. перезагрузка и закрытие вкладки — beforeunload. Здесь браузер
//      показывает ТОЛЬКО своё стандартное окно, своё нарисовать нельзя.
//
// Сохранение (dirty стал false) снимает все три перехвата.

type Pending = { kind: "link"; href: string } | { kind: "back" };

/**
 * dirty — есть несохранённые правки. paused — идёт сохранение: перехваты
 * молчат, но историю не трогаем (форма карты сразу уходит на другую
 * страницу, и шаг «назад» для снятия заглушки вернул бы человека в форму).
 */
export function useUnsavedGuard(dirty: boolean, paused = false) {
  const active = dirty && !paused;
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const dirtyRef = useRef(dirty);
  const sentinel = useRef(false);
  const leaving = useRef(false);

  useEffect(() => {
    dirtyRef.current = active;
  }, [active]);

  // 3. Перезагрузка и закрытие вкладки.
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);

  // 1. Ссылки внутри сайта.
  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      if (leaving.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // новая вкладка — правки целы
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // чужой сайт откроет beforeunload
      if (url.pathname === window.location.pathname && url.hash) return; // якорь на той же странице
      e.preventDefault();
      e.stopPropagation();
      setPending({ kind: "link", href: url.pathname + url.search + url.hash });
    };
    // На window, а не на document: волна перехода (PageTransition) тоже
    // ловит клики на document в фазе захвата и стоит раньше — она забирала
    // клик по логотипу, и окно не появлялось (владелец 24.11). Захват на
    // window срабатывает ДО document, а stopPropagation дальше не пускает.
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [active]);

  // 2. «Назад» в браузере: заглушка в истории, пока правки есть.
  useEffect(() => {
    if (paused) return;
    if (!dirty) {
      // Правки сохранены: снять заглушку, чтобы «назад» не жать дважды.
      // Адрес у неё тот же, так что шаг назад страницу не меняет.
      if (sentinel.current && !leaving.current) {
        sentinel.current = false;
        window.history.back();
      }
      return;
    }
    if (!sentinel.current) {
      window.history.pushState({ unsavedGuard: true }, "", window.location.href);
      sentinel.current = true;
    }
    const onPop = () => {
      if (leaving.current || !dirtyRef.current) return;
      window.history.pushState({ unsavedGuard: true }, "", window.location.href);
      setPending({ kind: "back" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dirty, paused]);

  const stay = useCallback(() => setPending(null), []);

  const leave = useCallback(() => {
    const target = pending;
    setPending(null);
    leaving.current = true;
    if (target?.kind === "back") {
      window.history.go(-2);
    } else if (target?.kind === "link") {
      router.push(target.href);
    }
  }, [pending, router]);

  return { open: pending !== null, stay, leave };
}
