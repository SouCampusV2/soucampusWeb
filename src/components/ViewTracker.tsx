"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Невидимый компонент: сообщает серверу, что страницу открыли.
 *
 * Стоит один раз в layout группы (site) и покрывает весь сайт — адрес
 * берётся из usePathname(), а не передаётся пропсом. Раньше его надо
 * было вручную ставить на каждую страницу, и про новую легко забыть.
 *
 * Клиентский он вынужденно: страницы статические, серверный код на них
 * выполняется раз в минуту при пересборке, а не на каждого посетителя
 * (см. комментарий в app/api/view/route.ts).
 */
export function ViewTracker() {
  const pathname = usePathname();

  // Какой адрес уже отправлен. Строка, а не флаг: переходы внутри сайта
  // не перезагружают страницу, компонент живёт в layout и не
  // пересоздаётся — с простым флагом посчиталась бы только первая
  // открытая страница за визит. Плюс это гасит второй вызов эффекта,
  // который React намеренно делает в режиме разработки.
  const sentFor = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || sentFor.current === pathname) return;
    sentFor.current = pathname;

    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      // Cookie посетителя должна и приходить, и устанавливаться.
      credentials: "same-origin",
      // Запрос фоновый: страница уже показана, ждать его незачем.
      keepalive: true,
    }).catch(() => {
      // Счётчик не должен ронять страницу. Не смогли отправить —
      // просто не посчитали, посетитель об этом знать не должен.
    });
  }, [pathname]);

  return null;
}
