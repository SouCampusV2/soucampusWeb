"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  SealCheck,
  XCircle,
  Prohibit,
  ShoppingBag,
  CurrencyEur,
  Megaphone,
  UserPlus,
} from "@phosphor-icons/react";
import type { Notification, NotificationKind } from "@/lib/notifications";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Список уведомлений.
//
// Данные приходят с сервера пропсом, клиентским здесь остаётся ровно одно:
// отметка «прочитано». Она ставится САМА при открытии страницы — человек
// уведомления уже увидел, и требовать за это отдельный клик значит просто
// оставить счётчик врать. Непрочитанные при этом успевают подсветиться:
// первый кадр рисуется по серверным данным, до запроса.
//
// Пишет браузер напрямую: политика "mark own notifications read" пускает
// только к своим строкам, а триггер в базе замораживает всё, кроме
// read_at (см. миграцию 20260810120000). Route handler ради одной колонки
// был бы лишним звеном.
export function NotificationList({ items }: { items: Notification[] }) {
  const [read, setRead] = useState(false);

  useEffect(() => {
    if (items.every((item) => item.readAt)) return;
    let active = true;
    (async () => {
      const supabase = createSupabaseBrowser();
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      // Подсветку снимаем только после успешной записи — иначе она
      // пропала бы и в случае, когда отметка не сохранилась.
      if (active) setRead(true);
    })();
    return () => {
      active = false;
    };
  }, [items]);

  return (
    <ul className="mt-8 space-y-3">
      {items.map((item) => (
        <Row key={item.id} item={item} dimmed={read} />
      ))}
    </ul>
  );
}

function Row({ item, dimmed }: { item: Notification; dimmed: boolean }) {
  const unread = !item.readAt && !dimmed;

  const body = (
    <div
      className={`flex gap-4 rounded-2xl border p-4 transition-colors ${
        unread
          ? "border-orange-500/40 bg-orange-50/60 dark:bg-orange-950/20"
          : "border-zinc-200 bg-[#fbfbff] dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
      <Icon kind={item.kind} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-zinc-950 dark:text-zinc-50">
          {item.title}
        </p>
        {item.body && (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {item.body}
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {new Date(item.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );

  // Ссылку рисуем только когда ей есть куда вести: «карту купили» ведёт в
  // ресурсы, а «правила изменились» может не вести никуда.
  return (
    <li>
      {item.href ? (
        <Link href={item.href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

// Иконка по виду события: список пробегают глазами, и форма читается
// быстрее заголовка.
function Icon({ kind }: { kind: NotificationKind }) {
  const [Glyph, color] = ICONS[kind] ?? [Bell, "text-zinc-400"];
  return (
    <Glyph size={22} weight="fill" className={`mt-0.5 shrink-0 ${color}`} aria-hidden />
  );
}

const ICONS: Record<
  NotificationKind,
  [typeof Bell, string]
> = {
  creator_application_submitted: [UserPlus, "text-zinc-500"],
  creator_approved: [SealCheck, "text-lime-600 dark:text-lime-400"],
  creator_rejected: [XCircle, "text-red-600 dark:text-red-400"],
  creator_revoked: [Prohibit, "text-red-600 dark:text-red-400"],
  map_approved: [SealCheck, "text-lime-600 dark:text-lime-400"],
  map_rejected: [XCircle, "text-red-600 dark:text-red-400"],
  map_suspended: [Prohibit, "text-red-600 dark:text-red-400"],
  map_sold: [CurrencyEur, "text-lime-600 dark:text-lime-400"],
  purchase: [ShoppingBag, "text-orange-500"],
  announcement: [Megaphone, "text-orange-500"],
};
