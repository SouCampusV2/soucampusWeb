"use client";

import { useCallback, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import {
  NOTIFICATION_COLUMNS,
  NOTIFICATIONS_LIMIT,
  toNotification,
  type Notification,
  type NotificationRow,
} from "@/lib/notification-shape";
import { useNotificationEvents } from "@/lib/useNotificationEvents";
import { NotificationList, EmptyState } from "@/components/NotificationList";
import { RefreshButton } from "@/components/RefreshButton";

// Владелец списка уведомлений на странице.
//
// Почему список читает браузер, а не сервер. Сначала было иначе: страница
// рендерилась на сервере, а по событию из базы вызывался router.refresh().
// Не заработало ни так, ни через startTransition — строка появлялась
// только по нажатию кнопки. Дальше выяснять, почему серверный перерендер
// не доезжает из колбэка WebSocket, значило бы чинить механизм ради
// механизма: рядом, в том же навбаре, бейдж колокола обновляется мгновенно
// и ни разу не подвёл, а делает он ровно одно — читает Supabase из
// браузера напрямую. Здесь теперь то же самое.
//
// Что при этом НЕ поменялось и меняться не должно:
//
//   * первый экран по-прежнему рисует сервер и передаёт сюда готовые
//     строки (initial). Клиент не ходит в базу ради того, что уже
//     приехало вместе со страницей, и пустоты в первом кадре нет;
//   * рисует список всё тот же NotificationList — единственный
//     отрисовщик уведомления на сайте. Здесь только откуда берутся
//     строки, и ни слова о том, как они выглядят.
//
// Права проверять отдельно не нужно: политика "read own notifications"
// отдаёт браузеру ровно свои строки — те же, что видел сервер.
export function NotificationsFeed({
  userId,
  initial,
  headingClassName,
}: {
  userId: string;
  initial: Notification[];
  /** Классы заголовка — шрифт подключён на серверной странице. */
  headingClassName: string;
}) {
  // Начальное значение — и всё: дальше список живёт здесь. Синхронизации
  // с пропом намеренно нет. Это та самая ловушка, на которой уже
  // обожглись (см. NotificationList): состояние, которое каждый рендер
  // затирается пропом, ведёт себя непредсказуемо, а «свежий проп» сюда
  // приходит только при перерисовке страницы, от которой мы как раз и
  // ушли. Обновляет список одно место — reload ниже, и зовут его кнопка
  // и подписка.
  const [items, setItems] = useState(initial);

  const reload = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    const { data, error } = await supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATIONS_LIMIT);

    // Молча оставляем прежний список: не показать новое хуже, чем
    // показать, но заметно лучше, чем стереть уже показанное.
    if (error) {
      console.warn(`Уведомления не перечитались: ${error.message}`);
      return;
    }
    setItems((data ?? []).map((row) => toNotification(row as NotificationRow)));
  }, [userId]);

  // Пришло новое — дочитываем список. На UPDATE тоже: «прочитано» могли
  // поставить в другой вкладке, и подсветка здесь обязана погаснуть.
  useNotificationEvents(userId, reload, reload);

  return (
    <>
      {/* Заголовок с кнопкой живёт здесь, а не на серверной странице:
          кнопке нужно звать reload, а функцию из серверного компонента в
          клиентский не передать. */}
      <div className="flex items-center justify-between gap-4">
        <h1 className={headingClassName}>Notifications</h1>
        <RefreshButton
          label="Check for new notifications"
          onRefresh={reload}
        />
      </div>

      {items.length === 0 ? <EmptyState /> : <NotificationList items={items} />}
    </>
  );
}
