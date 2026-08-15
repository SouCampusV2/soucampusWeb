"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise } from "@phosphor-icons/react";

// «Обновить» на странице, которая живёт серверными данными.
//
// Зачем: уведомления, очередь модерации, каталог и список своих карт
// меняются не от действий того, кто на них смотрит, — карту одобрили,
// пришло сообщение, кто-то купил. Узнать об этом можно было только
// перезагрузив страницу через браузер, то есть заново скачав её целиком
// и потеряв позицию прокрутки.
//
// router.refresh() перезапрашивает СЕРВЕРНЫЕ компоненты и подменяет
// разметку на месте: состояние клиентских компонентов, прокрутка и фокус
// остаются, полной перезагрузки не происходит.
//
// useTransition, а не свой флаг загрузки: refresh асинхронен, но ничего
// не возвращает — узнать, что он закончил, можно только так. Пока идёт,
// иконка крутится, и по ней видно, что нажатие сработало; без этого
// человек жмёт второй и третий раз.
export function RefreshButton({
  label = "Refresh",
  className = "",
  onRefresh,
}: {
  /** Подпись для скринридера; на экране только иконка. */
  label?: string;
  className?: string;
  /**
   * Своё обновление вместо серверного перерендера.
   *
   * Нужно там, где страница уже держит данные на клиенте и умеет
   * перечитать их сама (уведомления). Звать router.refresh() в таком
   * месте бессмысленно: он привезёт новые пропсы, а состояние
   * компонента их не заметит — ровно эта пара и выглядела как
   * «кнопка не работает».
   */
  onRefresh?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Отдельная задержка поверх transition: на быстрой сети refresh
  // укладывается в пару кадров, анимация мигает и читается как сбой, а
  // не как ответ. Полкруга — минимум, который глаз успевает заметить.
  const [spinning, setSpinning] = useState(false);

  function refresh() {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 500);
    if (onRefresh) {
      void onRefresh();
      return;
    }
    startTransition(() => router.refresh());
  }

  const busy = pending || spinning;

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={busy}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-950/[0.05] disabled:cursor-wait dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06] ${className}`}
    >
      <ArrowsClockwise
        size={18}
        weight="bold"
        className={busy ? "animate-spin" : undefined}
      />
    </button>
  );
}
