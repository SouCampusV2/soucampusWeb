import Link from "next/link";
import { ArrowCircle } from "@/components/ArrowCircle";

// «Назад» кружком — слева от заголовка деталь-страницы, а не отдельной
// строкой над ним. Строка «← All work» съедала ~50px между навбаром и
// названием; кружок стоит в одном ряду с заголовком и места не берёт.
//
// Появился на странице карты 27.09, на странице работы — 04.10. Вынесен
// в компонент на втором месте, а не скопирован: самодельный кружок рядом
// с настоящим уже однажды разъехался (DESIGN.md → «Стрелка-кружок»).
//
// Подписи словами нет, поэтому aria-label обязателен — иначе экранный
// диктор скажет просто «ссылка». title — та же подпись для мыши.

/** Место под кружок: соседний текст выравнивается по нему. */
export const BACK_ARROW_SIZE = "h-11 w-11";

export function BackArrow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="shrink-0 transition-transform active:scale-90"
    >
      <ArrowCircle
        direction="left"
        className={BACK_ARROW_SIZE}
        colorClassName="bg-orange-500 hover:bg-orange-600 dark:bg-orange-400 dark:hover:bg-orange-500 text-white"
      />
    </Link>
  );
}
