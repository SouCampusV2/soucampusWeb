"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Ничего не рисует. Живёт на /marketplace/success, пока заказ ещё не
// найден, и через `intervalMs` просит сервер отрисовать страницу заново
// (router.replace с новым ?attempt — свежий серверный рендер без
// перезагрузки вкладки; новый адрес заодно обходит кэш маршрута).
//
// Зачем: покупатель возвращается со Stripe одновременно с вебхуком, и
// первый рендер может не застать заказ. Раньше в этот момент он видел
// «Order not found», хотя деньги списаны, а заказ появлялся через
// секунду — обновил вручную, и всё на месте (24.11, preview). Теперь
// страница обновляется сама; как только заказ найден, сервер отдаёт
// «Thank you», и этот компонент со страницы исчезает вместе с таймером.
//
// Сколько ждать, решает сервер: он перестаёт рисовать компонент после
// `attempt` >= лимита (номер попытки едет в адресе, ?attempt=N), и
// страница показывает честное «не нашли — напишите нам».
export function RefreshWhilePending({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      const attempt = Number(url.searchParams.get("attempt") ?? "0") + 1;
      url.searchParams.set("attempt", String(attempt));
      // replace, а не push: «назад» не должен листать попытки.
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [router, intervalMs]);

  return null;
}
