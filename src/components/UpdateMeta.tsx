import { formatDayMonthYear } from "@/lib/dates";
import { UPDATE_AREAS, type UpdatePost } from "@/lib/updates";

// Строка над заголовком поста: «Marketplace · 26 Aug 2026». Одна на ленту
// и на страницу поста — две копии строки из двух частей разъехались бы
// на первом же изменении формата.
//
// Дата — день-ключ, поэтому formatDayMonthYear (UTC), а не <LocalTime>:
// у «2026-08-26» нет часа, и перевод в пояс читателя сдвинул бы подпись
// на сутки западнее Гринвича (шапка src/lib/dates.ts).
export function UpdateMeta({ post }: { post: UpdatePost }) {
  return (
    <p className="text-sm font-semibold">
      <span className="text-orange-500">{UPDATE_AREAS[post.area]}</span>
      <span className="text-zinc-400 dark:text-zinc-500"> · </span>
      <time
        dateTime={post.date}
        className="text-zinc-500 dark:text-zinc-400"
      >
        {formatDayMonthYear(post.date)}
      </time>
    </p>
  );
}
