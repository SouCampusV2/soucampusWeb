import Link from "next/link";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/Avatar";
import { creatorHref, creatorRole, type Creator } from "@/lib/creators";

// Кто сделал карту — карточкой в правой колонке страницы товара.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ БЛОК, ЕСЛИ ИМЯ БЫЛО ПОД ЗАГОЛОВКОМ. Строчка «by
// SouCampus» отвечала на вопрос «чьё это» мельком, между названием и
// описанием, и терялась ровно там, где на неё смотрят меньше всего.
// Автор — это довод в пользу покупки, а доводы живут в колонке, где
// цена и кнопка. Поэтому строчка убрана (решение владельца 2026-08-22),
// а имя переехало сюда — крупнее, с лицом и с ролью.
//
// ⚠️ РОЛЬ БЕРЁТСЯ ИЗ ОБЩЕЙ creatorRole, а не считается здесь. Та же
// функция рисует пилюлю в шапке профиля, и разойтись они не должны:
// «Creator» на профиле и «Member» под картой у одного человека — это не
// две ошибки, а одна, просто увиденная дважды.
//
// Пилюли здесь нет намеренно: в узкой колонке она спорила бы с ценой и
// кнопкой за внимание. Роль — подпись под именем, как в справочнике, а
// не значок.

export function CreatorCard({ creator }: { creator: Creator }) {
  const role = creatorRole(creator);

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Creator
      </h2>

      {/* Вся строка — ОДНА ссылка: лицо, имя и роль ведут в одно место, и
          разбивать их на несколько ссылок значило бы дать три остановки
          при ходьбе табом вместо одной. Тот же довод, что у подписи под
          комментарием (CommentSection). */}
      <Link
        href={creatorHref(creator.handle)}
        className="mt-4 flex items-center gap-3 transition hover:opacity-75"
      >
        <Avatar avatarUrl={creator.avatarUrl} size={44} />
        <span className="min-w-0">
          <span
            className="flex items-center gap-1 truncate font-semibold text-zinc-950 dark:text-zinc-50"
            // Цвет ника — привилегия купивших. style, а не класс:
            // значение произвольное, в Tailwind его не выразить.
            style={creator.nameColor ? { color: creator.nameColor } : undefined}
          >
            {creator.username}
            {creator.isVerified && (
              <SealCheck
                size={14}
                weight="fill"
                className="shrink-0 text-orange-500 dark:text-orange-400"
                aria-label="Verified"
              />
            )}
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
            {role.label}
          </span>
        </span>
      </Link>
    </div>
  );
}
