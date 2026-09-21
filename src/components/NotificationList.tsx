"use client";

import Link from "next/link";
import { useState } from "react";
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
  Check,
  Trash,
} from "@phosphor-icons/react";
import type { Notification, NotificationKind } from "@/lib/notifications";
import {
  deleteNotifications,
  markNotificationsRead,
} from "@/lib/social-client";
import { useHydrated } from "@/lib/useHydrated";

// Время уведомления.
//
// Отдельный компонент из-за расхождения гидратации, которое стоило нам
// нескольких раундов поисков. Раньше здесь стояло просто
// `new Date(item.createdAt).toLocaleString()`. toLocaleString берёт
// локаль и часовой пояс у того, кто его выполняет: на сервере (Vercel,
// UTC, en-US) выходит один текст, у человека в браузере — другой. React
// сверяет первый клиентский рендер с серверным HTML посимвольно, видит
// разный текст и роняет ошибку гидратации (#418 в консоли), после чего
// перерисовывает поддерево заново, сбрасывая состояние компонентов.
//
// То есть безобидная строчка с датой ломала страницу целиком, а
// выглядело это как «уведомления не работают».
//
// Лечение: до гидратации показываем ЗАВЕДОМО одинаковый текст — дату в
// UTC, которую сервер и браузер посчитают побуквенно одинаково, — и
// только после неё переключаемся на местное время. useHydrated для того
// и заведён (см. его шапку). Подмена происходит в том же кадре, что и
// остальная гидратация, глазом не ловится.
function SentAt({ iso }: { iso: string }) {
  const hydrated = useHydrated();
  const date = new Date(iso);
  return (
    <>
      {hydrated
        ? date.toLocaleString()
        : date.toLocaleString("en-GB", { timeZone: "UTC" })}
    </>
  );
}

// Приглушённые действия над списком («Mark all as read», «Clear all»).
// Не Button и не INLINE_LINK: это служебные операции над содержимым
// страницы, они не должны спорить за внимание с самими уведомлениями.
const ACTION_LINK =
  "cursor-pointer text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:text-zinc-50";

// Список уведомлений.
//
// Строки приходят пропсом сверху (их владелец — NotificationsFeed), а
// здесь живёт только то, что человек делает с ними на экране: отмечает
// прочитанным и убирает. И то и другое пишется в базу прямо из браузера
// — политики "mark own notifications read" и "delete own notifications"
// пускают к своим строкам, а триггер замораживает всё, кроме read_at
// (миграция 20260810120000). Route handler ради одной колонки был бы
// лишним звеном.
export function NotificationList({ items }: { items: Notification[] }) {
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

  // Прочитанное в этой сессии — поверх того, что уже отмечено в базе.
  // Держим отдельно, чтобы подсветка снималась сразу по клику, не
  // дожидаясь, пока строка вернётся с сервера.
  const [markedRead, setMarkedRead] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );

  /**
   * Отметка «прочитано» — ТОЛЬКО по действию человека (решение владельца
   * 2026-08-15).
   *
   * Раньше список отмечал всё сам: сперва сразу при открытии, потом
   * через семь секунд. Оба варианта врали. «Прочитано» — это утверждение
   * о человеке, а не о странице: открытая вкладка не значит, что в неё
   * смотрели, и уж тем более не значит, что прочли все двадцать строк.
   * Отсюда и знакомое раздражение: зашёл посмотреть, что за оранжевый
   * кружок, отвлёкся — и отметка уже стоит, а что именно пришло, ты так
   * и не увидел.
   *
   * Теперь отметку ставит клик: по самой карточке, по кнопке на ней или
   * по «Mark all as read». Непрочитанное остаётся непрочитанным ровно
   * до тех пор, пока его не тронули, и это единственное поведение, за
   * которое можно ручаться.
   *
   * Пишет браузер напрямую: политика "mark own notifications read"
   * пускает только к своим строкам, а триггер в базе замораживает всё,
   * кроме read_at (миграция 20260810120000). Route handler ради одной
   * колонки был бы лишним звеном.
   */
  async function markRead(ids: string[]) {
    const fresh = ids.filter((id) => {
      const item = items.find((candidate) => candidate.id === id);
      return item && !item.readAt && !markedRead.has(id);
    });
    if (fresh.length === 0) return;

    setMarkedRead((current) => {
      const next = new Set(current);
      for (const id of fresh) next.add(id);
      return next;
    });

    // Через шлюз (/api/notifications). Чужие id он не тронет: запрос
    // фильтруется по человеку из сессии — раньше это делала за нас RLS.
    await markNotificationsRead(fresh).catch(() => {});
  }

  const unreadIds = visible
    .filter((item) => !item.readAt && !markedRead.has(item.id))
    .map((item) => item.id);

  // Удаление — тоже через шлюз. Строку убираем из списка сразу и НЕ
  // возвращаем при ошибке: это почтовый ящик, а не документ, и «не
  // удалилось» человек увидит сам при следующем открытии страницы.
  async function remove(id: string) {
    setRemoved((current) => new Set(current).add(id));
    await deleteNotifications([id]).catch(() => {});
  }

  async function clearAll() {
    setBusy(true);
    const ids = visible.map((item) => item.id);
    setRemoved((current) => {
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return next;
    });
    await deleteNotifications(ids).catch(() => {});
    setBusy(false);
  }

  if (visible.length === 0) {
    // Всё вычистили прямо сейчас — страница не перезагружалась, поэтому
    // пустое состояние рисуем здесь же, а не серверным.
    return <EmptyState />;
  }

  return (
    <>
      <div className="mt-6 flex justify-end gap-4">
        {/* Появляется только когда есть что отмечать: кнопка, которая
            ничего не делает, читается как сломанная. */}
        {unreadIds.length > 0 && (
          <button
            type="button"
            onClick={() => void markRead(unreadIds)}
            className={ACTION_LINK}
          >
            Mark all as read
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={clearAll}
          className={ACTION_LINK}
        >
          Clear all
        </button>
      </div>

      <ul className="mt-2 space-y-3">
        {visible.map((item) => (
          <Row
            key={item.id}
            item={item}
            unread={!item.readAt && !markedRead.has(item.id)}
            onRead={() => void markRead([item.id])}
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
  unread,
  onRead,
  onRemove,
}: {
  item: Notification;
  unread: boolean;
  onRead: () => void;
  onRemove: () => void;
}) {
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
        {/* Место под кнопки держим паддингом справа, а не отдельной
            колонкой: они лежат поверх карточки (см. ниже), и без запаса
            длинный заголовок уезжал бы прямо под них. Запас на две —
            крестик есть всегда, галочка появляется у непрочитанного, и
            прыгать при её появлении заголовок не должен. */}
        <p className="pr-16 font-semibold text-zinc-950 dark:text-zinc-50">
          {item.title}
        </p>
        {item.body && (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {item.body}
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          <SentAt iso={item.createdAt} />
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
  // Клик по карточке — это и есть «прочитал»: человек её открыл или хотя
  // бы ткнул. У карточки со ссылкой отметка уходит по дороге, попутно с
  // переходом; у карточки без ссылки клик не делает больше ничего, но
  // отметку ставит — иначе непонятно, почему по одной кликнуть можно, а
  // по другой нет.
  //
  // На карточке без ссылки onClick висит на <div>, и это сознательно: с
  // клавиатуры и скринридером то же самое делает кнопка-галочка справа,
  // у которой есть и роль, и подпись. Вешать сюда role="button" значило
  // бы объявить кнопкой область с ссылками и текстом внутри.
  return (
    <li className="relative">
      {item.href ? (
        <Link href={item.href} className="block" onClick={onRead}>
          {body}
        </Link>
      ) : (
        <div onClick={unread ? onRead : undefined}>{body}</div>
      )}

      {/* Отметить, не открывая: уведомление бывает и без ссылки, и с
          ссылкой, по которой сейчас незачем идти. Стоит рядом с
          крестиком — оба действия над карточкой в одном месте. */}
      {unread && (
        <button
          type="button"
          onClick={onRead}
          aria-label="Mark as read"
          title="Mark as read"
          className="absolute right-10 top-3 cursor-pointer rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
        >
          <Check size={16} weight="bold" />
        </button>
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
  map_deleted: [Trash, "text-zinc-400"],
  map_suspended: [Prohibit, "text-red-600 dark:text-red-400"],
  map_sold: [CurrencyEur, "text-lime-600 dark:text-lime-400"],
  purchase: [ShoppingBag, "text-orange-500"],
  announcement: [Megaphone, "text-orange-500"],
};
