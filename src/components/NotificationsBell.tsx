"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useNotificationEvents } from "@/lib/useNotificationEvents";

// Колокол уведомлений в навбаре: ссылка на /notifications + число
// непрочитанных.
//
// Считается на клиенте, а не на сервере, по той же причине, что и всё
// остальное в навбаре: страницы магазина статические (ISR), один HTML на
// всех, и сервер при сборке не знает, кто его откроет.
//
// Считаем количество, не вытаскивая строки (head: true) — колоколу нужно
// только число, а сам список подождёт до перехода на страницу.
//
// Колокол стоит ВСЕГДА, в том числе у гостя и при нуле уведомлений
// (просьба владельца): раздел с историей должен быть на своём месте
// постоянно, а не появляться и исчезать вместе с содержимым. Пустой ящик
// объясняет себя сам на самой странице. Гостя клик уводит на вход и
// возвращает обратно.
export function NotificationsBell({
  userId,
  size = 22,
}: {
  /** null — гость или сессия ещё не прочитана: тогда просто без бейджа. */
  userId: string | null;
  size?: number;
}) {
  const [counted, setCounted] = useState(0);
  const pathname = usePathname();

  // У гостя бейджа нет по определению. Выводим это из userId, а не
  // сбрасываем состояние в эффекте: после выхода из аккаунта число иначе
  // осталось бы висеть до следующего запроса.
  const unread = userId ? counted : 0;

  // Запрос вынесен отдельно от setState намеренно: он нужен и при
  // открытии страницы, и по событию из базы, а держать состояние в нём
  // самом нельзя — вызов из тела эффекта тогда читается линтером (и
  // React'ом) как каскадный setState. Поэтому здесь чистое «сколько
  // непрочитанных», а кто и куда кладёт ответ — решают места вызова.
  //
  // Именно ПЕРЕСЧЁТ, а не «прибавить единицу к прошлому числу»: то же
  // уведомление могли прочитать в другой вкладке, и арифметика на клиенте
  // разошлась бы с базой без единого способа это заметить. Запрос
  // дешёвый — считает по частичному индексу notifications_unread_idx и не
  // тащит ни одной строки (head: true).
  const fetchUnread = useCallback(async () => {
    if (!userId) return 0;
    const supabase = createSupabaseBrowser();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    return count ?? 0;
  }, [userId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const next = await fetchUnread();
      if (active) setCounted(next);
    })();
    return () => {
      active = false;
    };
    // pathname в зависимостях — чтобы число обновилось после того, как
    // человек сходил на /notifications и всё прочитал.
  }, [fetchUnread, pathname]);

  // А это — то, чего не хватало: уведомление, пришедшее в открытую
  // вкладку, зажигает бейдж само, без единого действия человека.
  const recount = useCallback(async () => {
    setCounted(await fetchUnread());
  }, [fetchUnread]);
  useNotificationEvents(userId, recount, recount);

  return (
    <Link
      href={userId ? "/notifications" : "/login?next=/notifications"}
      aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
      title="Notifications"
      className="relative flex items-center justify-center rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
    >
      <Bell size={size} />
      {unread > 0 && (
        // Тот же приём, что у бейджа корзины: кружок поверх иконки, а не
        // рядом — иначе появление числа сдвигало бы соседние иконки.
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
