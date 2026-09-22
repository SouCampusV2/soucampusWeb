"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Trash } from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { deleteComment, postComment } from "@/lib/social-client";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
// Из comment-shape.ts, а НЕ из lib/comments.ts: тот тянет служебный
// ключ (supabase-admin), и импорт значения оттуда утащил бы его в
// браузерный бандл. Тот же файл и та же причина, что у
// notification-shape.ts.
import { LocalTime } from "@/components/LocalTime";
import {
  COMMENT_COLUMNS,
  COMMENT_FEED,
  commentAuthors,
  rowToComment,
  type Comment,
  type CommentRow,
} from "@/lib/comment-shape";

// Комментарии под картой.
//
// КТО МОЖЕТ ПИСАТЬ — решает сервер: шлюз /api/comments проверяет покупку
// (has_purchased_for) до записи. Здесь поле лишь блокируется, если
// человек не купил: это удобство, а не защита. Разблокировать поле из
// инструментов разработчика — дело секунды; отказ придёт от шлюза, а не
// отсюда.
//
// ⚠️ Купившим считается и тот, кто скачал БЕСПЛАТНУЮ карту: заказ на
// нулевую сумму — тоже оплаченный заказ (миграция 20260812120000).
// Решение владельца 21.08, разбор — в миграции комментариев.
//
// ПОЧЕМУ ЛЕНТА ДОГРУЖАЕТСЯ, А НЕ ПРИХОДИТ ГОТОВОЙ. Первый экран как раз
// приходит с сервера (initial) — страница карты статическая, и он верен
// на момент сборки. Но «купил ли я» и свежие комментарии зависят от
// того, кто смотрит и когда, поэтому уточняются после загрузки. Тот же
// приём и та же причина, что у AddToCartButton и ReactionButton.

const MAX_LENGTH = 1000;

export function CommentSection({
  productId,
  initial,
  creatorId,
}: {
  productId: string;
  initial: Comment[];
  /** Автор карты — он вправе удалять комментарии под своей работой. */
  creatorId: string | null;
}) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const supabase = createSupabaseBrowser();
      // getSession, а не getUser: сессия читается из локального хранилища
      // мгновенно, без похода по сети. Права всё равно за базой.
      const { data: session } = await supabase.auth.getSession();
      const id = session.session?.user?.id ?? null;

      if (!id) {
        if (alive) setChecked(true);
        return;
      }

      // Ту же функцию зовёт политика вставки — так интерфейс и база
      // отвечают на один вопрос одним способом и не могут разойтись.
      const { data: bought } = await supabase.rpc("has_purchased", {
        p_product_id: productId,
      });

      if (!alive) return;
      setUserId(id);
      setCanWrite(Boolean(bought));
      setChecked(true);
    })();

    return () => {
      alive = false;
    };
  }, [productId]);

  // ⚠️ СПИСОК ПЕРЕЧИТЫВАЕТСЯ ПРИ КАЖДОМ ОТКРЫТИИ СТРАНИЦЫ, и это не
  // перестраховка. Симптом, который это лечит (нашёл владелец): написал
  // комментарий → ушёл со страницы → вернулся «назад» → комментария нет,
  // и обновление помогает не сразу.
  //
  // Причина не в комментариях, а в том, откуда берётся страница.
  // /marketplace/[slug] собран заранее и обновляется раз в минуту
  // (revalidate = 60), а `initial` приезжает вместе с этим HTML. Клиент
  // до сих пор перечитывал строки ТОЛЬКО после своей же отправки —
  // значит при возврате назад показывал снимок страницы, сделанный до
  // того, как комментарий появился. Он не терялся: в базе он был всё
  // время, его просто некому было спросить.
  //
  // Тот же приём, что у ленты уведомлений (NotificationsFeed): сервер
  // даёт первый экран, дальше список живёт своей жизнью. Мигания нет —
  // до ответа на экране стоит серверный список, а не пустота.
  useEffect(() => {
    void reload();
    // productId — единственное, от чего зависит запрос. reload намеренно
    // не в зависимостях: он пересоздаётся на каждый рендер, и добавить
    // его значило бы перечитывать список после каждой правки текста в
    // поле ввода.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function reload() {
    const supabase = createSupabaseBrowser();
    const { data } = await supabase
      .from(COMMENT_FEED)
      .select(COMMENT_COLUMNS)
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (!data) return;

    // Подписи — той же функцией, что на сервере: имя и цвет живут в
    // public_profiles, а не в строке комментария.
    const authors = await commentAuthors(
      supabase,
      [...new Set(data.map((r) => r.user_id as string))]
    );

    // Тот же разбор строки, что на сервере (comment-shape.ts). Своя
    // копия здесь была ровно до первой правки: два способа читать одну
    // таблицу расходятся всегда — так уже расходились семь копий
    // градиента и семь форматов даты.
    setComments(
      (data as unknown as CommentRow[]).map((row) =>
        rowToComment(row, authors.get(row.user_id))
      )
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;

    const text = body.trim();
    if (!text) return;

    busy.current = true;
    setPending(true);
    setError(null);

    // Через шлюз (/api/comments): он проверяет покупку, оба лимита
    // частоты и потолок длины. Отказ приезжает уже человеческим
    // текстом — «одно сообщение в 20 секунд», «try again in N min», —
    // и показывать его можно как есть.
    //
    // ⚠️ Раньше здесь разбирались метки, которые ставили триггеры
    // базы (comment_too_fast, comment_rate_limit). Разбора больше нет
    // не потому, что лимиты ушли, а потому, что они переехали в
    // обработчик вместе с записью: служебный ключ триггеры лимитов не
    // будит. Числа те же — см. rate-limit.ts.
    try {
      await postComment(productId, text);
      setBody("");
      await reload();
    } catch (err) {
      // Отказ без объяснения хуже отсутствия ограничения: человек
      // видит «не работает» и жмёт ещё, то есть давит ровно туда, куда
      // мы его не пускаем.
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't post your comment. Only buyers can comment."
      );
    }

    setPending(false);
    busy.current = false;
  }

  async function remove(id: string) {
    // Метку «кто удалил» по-прежнему ставит база, а не этот вызов:
    // передавать её отсюда значило бы позволить автору карты пометить
    // чужое удаление как «передумал сам». Изменилось только, кто зовёт
    // функцию — теперь шлюз, служебным ключом, с явным указанием, кто
    // удаляет (см. /api/comments).
    try {
      await deleteComment(id);
      await reload();
    } catch {
      // Молча, как и раньше: кнопка удаления есть только у того, кто
      // имеет право, и сказать тут нечего, кроме «попробуйте ещё».
    }
  }

  const liveCount = comments.filter((c) => !c.deletedBy).length;

  return (
    <section className="mt-12">
      {/* Счёт показан ВСЕГДА, включая ноль (решение владельца
          2026-09-06). Раньше при нуле он прятался, а ниже появлялась
          строка «No comments yet.» — то есть пустота объявлялась
          словами. «Comments (0)» говорит то же самое, но не выглядит
          сообщением о том, что что-то не так: под формой ввода это
          просто состояние, а не новость. */}
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Comments ({liveCount})
      </h2>

      {/* Форма показывается всегда — спрятать её от некупивших значило бы
          не объяснить, почему писать нельзя. Заблокированное поле с
          подписью говорит об этом прямо. */}
      <form onSubmit={submit} className="mt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={MAX_LENGTH}
          disabled={!canWrite}
          placeholder={
            !checked
              ? "…"
              : canWrite
                ? "What did you think of this map?"
                : "Only buyers can comment on this map"
          }
          className="w-full resize-y rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {body.length}/{MAX_LENGTH}
          </span>
          {/* tertiary, а не primary: отправка комментария — не главное
              действие на странице. Главное здесь одно — «Add to cart», и две
              залитые кнопки на одном экране спорят за внимание. */}
          <Button
            type="submit"
            variant="tertiary"
            size="sm"
            disabled={!canWrite || pending || !body.trim()}
          >
            {pending ? "Posting…" : "Post comment"}
          </Button>
        </div>
        {error && (
          <p className="mt-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        )}
      </form>

      {/* Пустого состояния словами больше нет — его говорит счёт в
          заголовке. */}
      {comments.length > 0 && (
        <ul className="mt-6 space-y-3">
          {comments.map((comment, index) => (
            <li
              key={comment.id}
              // Карточка вместо черты сверху (решение владельца
              // 2026-08-22). Разделители и фон делают одну работу —
              // отделяют одно высказывание от другого, — и делать её
              // дважды значит шуметь.
              //
              // Чередование по чётности, а НЕ по автору и не по смыслу:
              // цвет здесь ничего не сообщает, он только разводит соседние
              // карточки. Если когда-нибудь захочется красить по смыслу
              // («автор карты», «мой комментарий») — это другой признак, и
              // чередование придётся убрать: два разных смысла одним цветом
              // не различить.
              //
              // Тёмная тема — по общему правилу отражения 50↔950
              // (docs/DESIGN.md) с прозрачностью /40, как у плашек по всему
              // сайту: чистый 950 на тёмном фоне читается как грязное пятно.
              //
              // ⚠️ ВТОРОЙ ЦВЕТ — СИНИЙ, А НЕ ОРАНЖЕВЫЙ (решение владельца
              // 25.08). bg-orange-50 по всему сайту занят под ПРЕДУПРЕЖДЕНИЯ
              // — заметка на загрузке, демо-плашка Stripe, пауза смены
              // имени. Каждый второй комментарий в том же фоне читался как
              // предупреждение о самом себе, хотя цвет здесь не значит
              // ничего и лишь разводит соседние карточки. Занятый цвет
              // нельзя переиспользовать «просто как фон»: смысл прилипает
              // к оттенку раньше, чем человек прочтёт текст.
              className={`rounded-xl px-4 py-3.5 ${
                index % 2 === 0
                  ? "bg-lime-50 dark:bg-lime-950/40"
                  : "bg-blue-50 dark:bg-blue-950/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {/* Аватар и имя — ОДНА ссылка, а не две рядом.
                      Две ссылки на один адрес — две остановки при ходьбе
                      табом и два одинаковых пункта у экранного диктора.

                      Адрес профиля — /@<имя>. Когда имени нет (профиль
                      недоступен, rowToComment подставляет «—»), ссылки нет
                      вовсе: вести на /@— значило бы вести в 404. */}
                  {comment.username === "—" ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar avatarUrl={comment.avatarUrl} size={28} />
                      <span className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        {comment.username}
                      </span>
                    </span>
                  ) : (
                    <Link
                      href={`/@${comment.username}`}
                      className="flex min-w-0 items-center gap-2 transition hover:opacity-75"
                    >
                      <Avatar avatarUrl={comment.avatarUrl} size={28} />
                      <span
                        className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50"
                        // Цвет ника — привилегия купивших. style, а не
                        // класс: значение произвольное, в Tailwind не выразить.
                        style={
                          comment.nameColor
                            ? { color: comment.nameColor }
                            : undefined
                        }
                      >
                        {comment.username}
                      </span>
                    </Link>
                  )}
                  <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    <LocalTime value={comment.createdAt} shape="dayMonthYearTime" />
                    {comment.edited && " · edited"}
                  </span>
                </div>

                {/* Кнопка удаления — только у тех, кто вправе. Право
                    проверяет функция в базе; здесь мы лишь не показываем
                    заведомо бесполезную кнопку. */}
                {!comment.deletedBy &&
                  userId &&
                  (userId === comment.userId || userId === creatorId) && (
                    <button
                      type="button"
                      onClick={() => remove(comment.id)}
                      aria-label="Delete comment"
                      title="Delete comment"
                      className="shrink-0 text-zinc-400 transition hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash size={16} />
                    </button>
                  )}
              </div>

              {comment.deletedBy ? (
                // Строка остаётся на месте без текста. Иначе работал бы
                // приём: написал гадость, получил ответ, стёр своё — и
                // чужой ответ висит беспричинной агрессией.
                <p className="mt-1.5 pl-9 text-sm italic text-zinc-400 dark:text-zinc-500">
                  {comment.deletedBy === "author"
                    ? "Comment deleted by its author"
                    : "Comment removed"}
                </p>
              ) : (
                // Текст, а не HTML: комментарий пишется без разметки, и
                // React экранирует его сам. dangerouslySetInnerHTML здесь
                // не нужен и не появится — санитайзер существует для
                // описаний карт, где разметка нужна по делу.
                <p className="mt-1.5 pl-9 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {comment.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
