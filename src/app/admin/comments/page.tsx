import Link from "next/link";
import { ChatCircle } from "@phosphor-icons/react/dist/ssr";
import { getAllComments } from "@/lib/comments";
import { AdminCommentActions } from "@/components/AdminCommentActions";
import { INLINE_LINK, NEW_TAB } from "@/components/Button";
import { RefreshButton } from "@/components/RefreshButton";
import { LocalTime } from "@/components/LocalTime";

// Комментарии всего сайта — одним списком.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ РАЗДЕЛ. Комментарий виден под своей картой, но искать
// нарушения, обходя карты по одной, невозможно. Здесь всё в одном месте
// и в порядке от новых к старым — то есть ровно так, как их читают,
// когда проверяют.
//
// Показываем СПЛОШНЫМ списком, без фильтров и без разбивки на страницы:
// пока комментариев десятки, любой фильтр — это лишний экран, который
// надо освоить. Появятся сотни — вернуться и добавить (потолок в
// getAllComments уже стоит, список не станет бесконечным молча).
//
// Права проверяет layout админки; у /api/admin/comments своя проверка.
export const dynamic = "force-dynamic";

export default async function AdminCommentsPage() {
  const comments = await getAllComments();
  const live = comments.filter((c) => !c.deletedBy);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Comments
        </h1>
        <RefreshButton label="Check for new comments" />
      </div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {comments.length === 0
          ? "Nothing written yet."
          : `${live.length} live, ${comments.length - live.length} removed.`}
      </p>

      {comments.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 p-12 text-center dark:border-zinc-800">
          <ChatCircle
            size={40}
            weight="duotone"
            className="mx-auto text-orange-500 dark:text-orange-400"
          />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Comments people leave under maps will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {comments.map((comment) => (
            // Снятый площадкой подсвечен красным (просьба владельца).
            // Не «удалённый вообще»: своё удаление автора и удаление
            // автором карты — обычные события, а `site` означает, что
            // вмешалась площадка, и в списке из полусотни строк такие
            // нужно находить глазами, не читая подписи.
            //
            // Фон, а не рамка: рамка есть у всех, и красная читалась бы
            // как выделение, а не как состояние.
            <li
              key={comment.id}
              className={`rounded-2xl border p-4 sm:p-5 ${
                // "moderator" — это и есть «сняла площадка»: так метку
                // ставит soft_delete_comment по роли удалившего. Ниже,
                // в подписи, тот же случай называется «Removed by the
                // site» — одно состояние, два слова для него, и путать
                // их нельзя.
                comment.deletedBy === "moderator"
                  ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {/* На телефоне действие уезжает под шапку: имя, дата и
                  название карты вместе занимают всю ширину, и кнопка
                  справа от них сжимала ссылку до двух букв. */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span
                    className="font-semibold text-zinc-950 dark:text-zinc-50"
                    // Цвет ника — как он виден покупателю под картой.
                    // Владелец должен видеть комментарий так же, как все.
                    style={
                      comment.nameColor ? { color: comment.nameColor } : undefined
                    }
                  >
                    {comment.username}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    <LocalTime value={comment.createdAt} shape="date" />
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-600" aria-hidden>
                    ·
                  </span>
                  {/* Ссылка на саму карту — в новой вкладке: проверяющий
                      не должен терять список, открыв одну карту. */}
                  <Link
                    href={`/marketplace/${comment.productSlug}`}
                    {...NEW_TAB}
                    className={`min-w-0 truncate ${INLINE_LINK}`}
                  >
                    {comment.productTitle}
                  </Link>
                </div>

                {!comment.deletedBy && <AdminCommentActions commentId={comment.id} />}
              </div>

              {/* Текст удалённого показан НАМЕРЕННО — только здесь.
                  Мягкое удаление затем и существует, чтобы владелец мог
                  посмотреть, за что сняли, и решить, что делать с
                  написавшим. Под картой этот текст не отдаётся вовсе. */}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {comment.body}
              </p>

              {comment.deletedBy && (
                <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {comment.deletedBy === "author"
                    ? "Deleted by its author"
                    : comment.deletedBy === "creator"
                      ? "Deleted by the map's author"
                      : "Removed by the site"}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
