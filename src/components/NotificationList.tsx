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
  X,
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
  const [busy, setBusy] = useState(false);

  // Что человек убрал руками — множество id, а НЕ копия списка.
  //
  // Раньше здесь лежал сам список: useState(items). Это тихая ловушка,
  // из-за которой страница уведомлений и выглядела сломанной. useState
  // берёт аргумент только ПРИ ПЕРВОМ рендере — дальше он не значит
  // ничего. Приходит новое уведомление, сервер честно отдаёт список из
  // трёх строк вместо двух, проп items обновляется — а состояние так и
  // держит те две, с которыми компонент когда-то смонтировали. Список
  // мог обновиться только вместе со всем компонентом, то есть по F5.
  //
  // Признак был прямо на виду и объяснял всё разом: новое уведомление в
  // списке не появлялось, но при этом ОТМЕЧАЛОСЬ ПРОЧИТАННЫМ и бейдж
  // гас. Отметку ставит эффект ниже с зависимостью [items] — значит
  // новые данные до компонента доходили, их просто некому было
  // показать. Ни кэш, ни router.refresh(), ни realtime тут ни при чём:
  // они все работали.
  //
  // Теперь список не дублируется в состоянии вовсе: он всегда приходит
  // сверху, а состояние помнит только вычеркнутое. Новые строки
  // появляются сами собой, удалённые не возвращаются, и рассинхронизации
  // между «что показано» и «что пришло» больше не существует как
  // возможности.
  const [removed, setRemoved] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );
  const visible = items.filter((item) => !removed.has(item.id));

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

  // Удаление — тоже напрямую из браузера, политикой "delete own
  // notifications". Строку убираем из списка сразу и НЕ возвращаем при
  // ошибке: это почтовый ящик, а не документ, и «не удалилось» человек
  // увидит сам при следующем открытии страницы.
  async function remove(id: string) {
    setRemoved((current) => new Set(current).add(id));
    const supabase = createSupabaseBrowser();
    await supabase.from("notifications").delete().eq("id", id);
  }

  async function clearAll() {
    setBusy(true);
    const ids = visible.map((item) => item.id);
    setRemoved((current) => {
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return next;
    });
    const supabase = createSupabaseBrowser();
    await supabase.from("notifications").delete().in("id", ids);
    setBusy(false);
  }

  if (visible.length === 0) {
    // Всё вычистили прямо сейчас — страница не перезагружалась, поэтому
    // пустое состояние рисуем здесь же, а не серверным.
    return <EmptyState />;
  }

  return (
    <>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={clearAll}
          className="cursor-pointer text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Clear all
        </button>
      </div>

      <ul className="mt-2 space-y-3">
        {visible.map((item) => (
          <Row
            key={item.id}
            item={item}
            dimmed={read}
            onRemove={() => remove(item.id)}
          />
        ))}
      </ul>
    </>
  );
}

/** Пустой ящик. Тот же вид, что у серверной страницы, — один компонент
 *  на оба случая, чтобы «пусто с самого начала» и «стало пусто сейчас»
 *  не разъехались по виду. */
export function EmptyState() {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
      <Bell
        size={40}
        weight="thin"
        className="mx-auto text-zinc-300 dark:text-zinc-700"
        aria-hidden
      />
      <p className="mt-4 font-medium text-zinc-950 dark:text-zinc-50">
        You have no notifications
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Decisions on your maps, your purchases and anything new around the
        marketplace land here.
      </p>
    </div>
  );
}

function Row({
  item,
  dimmed,
  onRemove,
}: {
  item: Notification;
  dimmed: boolean;
  onRemove: () => void;
}) {
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
        {/* Место под крестик держим паддингом справа, а не отдельной
            колонкой: кнопка лежит поверх карточки (см. ниже), и без
            запаса длинный заголовок уезжал бы прямо под неё. */}
        <p className="pr-8 font-semibold text-zinc-950 dark:text-zinc-50">
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
  //
  // Крестик — СОСЕДОМ ссылки, поверх карточки, а не внутри неё: кнопка
  // внутри <a> — невалидная разметка, и клик по ней всё равно уводил бы
  // по ссылке вместо удаления.
  return (
    <li className="relative">
      {item.href ? (
        <Link href={item.href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Delete notification"
        title="Delete"
        className="absolute right-3 top-3 cursor-pointer rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
      >
        <X size={16} weight="bold" />
      </button>
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
