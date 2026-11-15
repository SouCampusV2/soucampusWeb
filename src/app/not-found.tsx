import type { Metadata } from "next";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import { ChunkFlower } from "@/components/brand/ChunkFlower";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Page not found",
  // Битый адрес в выдаче не нужен. Статус 404 Next отдаёт и без этого,
  // но краулер, добравшийся сюда по старой ссылке, получает и прямой
  // запрет — дешевле, чем ждать, пока он поверит статусу.
  robots: { index: false, follow: true },
};

// ЕДИНСТВЕННАЯ 404 НА ВЕСЬ САЙТ (решение владельца 2026-09-06).
//
// ⚠️ Файл в группе (site) УДАЛЁН НАМЕРЕННО, и это не упрощение, а способ
// добиться заказанного. Пока он существовал, notFound() со страницы
// внутри группы рисовался ВНУТРИ (site)/layout.tsx, то есть с навбаром,
// тарифами и футером — от них там было не избавиться. Без него ближайшей
// границей становится этот файл, а он лежит выше группы и её оболочку не
// наследует. Отсюда правило: **не заводить (site)/not-found.tsx снова** —
// он вернёт навбар обоим случаям молча.
//
// Что здесь СОЗНАТЕЛЬНО отсутствует:
//   • навбар и футер — человек попал не туда, и предлагать ему меню
//     магазина значит отвечать не на тот вопрос;
//   • CartProvider — он был нужен только навбару, а навбара больше нет;
//   • PageTransition — анимация перехода живёт в (site), и проигрывать
//     ей здесь нечего.
//
// Цифры с цветком и есть кнопка на главную: делать под ней ещё и «вернуться на
// главную» значило бы предложить два способа сделать одно и то же.
//
// Строка про покупки (возвращена 2026-11-14, решение владельца). Сюда
// попадает и покупатель, который из /purchases кликнул по карте, снятой
// с витрины. Для него голая «404» читается как «покупка пропала», хотя
// скачивание остаётся (getPurchasesForUser на state не смотрит). Строка
// стоит ОТДЕЛЬНО от ссылки-цифры: ссылка внутри ссылки — невалидный HTML.
export default function NotFound() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <Link
        href="/"
        aria-label="Go to the homepage"
        className="group flex cursor-pointer flex-col items-center gap-4"
      >
        {/* «4 · цветок · 4» с 16.11 (лаборатория бренда, вариант 404-2):
            вместо нуля — цветок SouCampus, который «не догрузился», как
            чанк. Размер в vw, а не в rem: цифры занимают экран на любой
            ширине. Цветок — em от того же кегля, поэтому растёт вместе с
            цифрами; 0.72em — высота прописной цифры у Unbounded. */}
        <span
          className={`${displayFont.className} flex select-none items-center gap-[0.04em] text-[34vw] font-extrabold leading-none tracking-tighter text-zinc-950 transition-colors group-hover:text-orange-500 dark:text-zinc-50 dark:group-hover:text-orange-400 sm:text-[26vw]`}
        >
          4
          <ChunkFlower className="size-[0.72em]" />
          4
        </span>

        <span className="max-w-md text-sm text-zinc-500 dark:text-zinc-400 sm:text-base">
          This chunk hasn&apos;t loaded yet.
        </span>
      </Link>

      <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
        Bought a map that&apos;s no longer listed? Your download is still in{" "}
        <Link
          href="/purchases"
          className="font-medium text-zinc-950 underline underline-offset-4 hover:text-orange-500 dark:text-zinc-50 dark:hover:text-orange-400"
        >
          My purchases
        </Link>
        .
      </p>
    </main>
  );
}
